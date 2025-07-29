import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimingControls } from '../timing-controls'

const mockProps = {
  frequency: 'daily' as const,
  preferredTime: '09:00',
  timezone: 'America/New_York',
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '07:00',
  onFrequencyChange: jest.fn(),
  onTimeChange: jest.fn(),
  onTimezoneChange: jest.fn(),
  onDNDStartChange: jest.fn(),
  onDNDEndChange: jest.fn(),
}

// Mock Intl API for timezone detection
Object.defineProperty(global, 'Intl', {
  value: {
    DateTimeFormat: jest.fn(() => ({
      resolvedOptions: jest.fn(() => ({
        timeZone: 'America/Los_Angeles',
      })),
      formatToParts: jest.fn(() => [{ type: 'timeZoneName', value: 'PST' }]),
    })),
  },
  writable: true,
})

describe('TimingControls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all timing control sections', () => {
    render(<TimingControls {...mockProps} />)

    expect(screen.getByText('Reminder Frequency')).toBeInTheDocument()
    expect(screen.getByText('Preferred Time')).toBeInTheDocument()
    expect(screen.getByText('Do Not Disturb')).toBeInTheDocument()
  })

  it('displays current frequency selection correctly', () => {
    render(<TimingControls {...mockProps} />)

    const dailyOption = screen.getByLabelText(/daily/i)
    expect(dailyOption).toBeChecked()

    expect(screen.getByLabelText(/every 2 days/i)).not.toBeChecked()
    expect(screen.getByLabelText(/weekly/i)).not.toBeChecked()
  })

  it('calls onFrequencyChange when frequency is changed', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const weeklyOption = screen.getByLabelText(/weekly/i)
    await user.click(weeklyOption)

    expect(mockProps.onFrequencyChange).toHaveBeenCalledWith('weekly')
  })

  it('displays current preferred time', () => {
    render(<TimingControls {...mockProps} />)

    const timeInput = screen.getByDisplayValue('09:00')
    expect(timeInput).toBeInTheDocument()
  })

  it('calls onTimeChange when preferred time is changed', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const timeInput = screen.getByDisplayValue('09:00')
    await user.clear(timeInput)
    await user.type(timeInput, '1430')

    // Should be called with the last change event
    expect(mockProps.onTimeChange).toHaveBeenLastCalledWith('14:30')
  })

  it('displays current timezone selection', () => {
    render(<TimingControls {...mockProps} />)

    const timezoneSelect = screen.getByRole('combobox')
    expect(timezoneSelect).toHaveValue('America/New_York')
  })

  it('calls onTimezoneChange when timezone is changed', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const timezoneSelect = screen.getByRole('combobox', { name: /timezone/i })
    await user.selectOptions(timezoneSelect, 'Europe/London')

    expect(mockProps.onTimezoneChange).toHaveBeenCalledWith('Europe/London')
  })

  it('shows detected timezone option when different from current', () => {
    render(<TimingControls {...mockProps} />)

    // Should show detected timezone (America/Los_Angeles) since it's different from current (America/New_York)
    // Look for the detected timezone button or text
    expect(
      screen.getByText(/Los_Angeles/i) || screen.getByText(/detected/i)
    ).toBeTruthy()
  })

  it('allows quick selection of detected timezone', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const useDetectedButton = screen.getByText(/use detected timezone/i)
    await user.click(useDetectedButton)

    expect(mockProps.onTimezoneChange).toHaveBeenCalledWith(
      'America/Los_Angeles'
    )
  })

  it('displays do not disturb times correctly', () => {
    render(<TimingControls {...mockProps} />)

    expect(screen.getByDisplayValue('22:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('07:00')).toBeInTheDocument()
  })

  it('calls DND change handlers when times are modified', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const startTimeInput = screen.getByDisplayValue('22:00')
    const endTimeInput = screen.getByDisplayValue('07:00')

    await user.clear(startTimeInput)
    await user.type(startTimeInput, '2300')

    await user.clear(endTimeInput)
    await user.type(endTimeInput, '0600')

    expect(mockProps.onDNDStartChange).toHaveBeenLastCalledWith('23:00')
    expect(mockProps.onDNDEndChange).toHaveBeenLastCalledWith('06:00')
  })

  it('shows overnight DND schedule indicator', () => {
    // DND from 22:00 to 07:00 spans overnight
    render(<TimingControls {...mockProps} />)

    expect(screen.getByText(/overnight schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/spans across midnight/i)).toBeInTheDocument()
  })

  it('handles same-day DND schedule correctly', () => {
    const sameDayProps = {
      ...mockProps,
      doNotDisturbStart: '12:00',
      doNotDisturbEnd: '14:00',
    }

    render(<TimingControls {...sameDayProps} />)

    expect(screen.queryByText(/overnight schedule/i)).not.toBeInTheDocument()
    expect(screen.getByText(/From 12:00 to 14:00$/)).toBeInTheDocument()
  })

  it('displays frequency descriptions correctly', () => {
    render(<TimingControls {...mockProps} />)

    expect(
      screen.getByText(/perfect for building consistent habits/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/balanced approach with breathing room/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/regular check-ins without pressure/i)
    ).toBeInTheDocument()
  })

  it('shows current setting summary', () => {
    render(<TimingControls {...mockProps} />)

    expect(
      screen.getByText(/every day at your preferred time/i)
    ).toBeInTheDocument()
  })

  it('provides helpful tips and information', () => {
    render(<TimingControls {...mockProps} />)

    expect(
      screen.getByText(/ai will optimize around this time/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/ai learns your most responsive times/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/all times are handled in your specified timezone/i)
    ).toBeInTheDocument()
  })

  it('handles accessibility correctly', () => {
    render(<TimingControls {...mockProps} />)

    // Check for proper labels
    expect(screen.getByText('Time of Day')).toBeInTheDocument()
    expect(screen.getByText('Timezone')).toBeInTheDocument()
    expect(screen.getByText('Start Time')).toBeInTheDocument()
    expect(screen.getByText('End Time')).toBeInTheDocument()

    // Check for proper radio group structure
    const frequencyRadios = screen.getAllByRole('radio')
    expect(frequencyRadios).toHaveLength(3)

    frequencyRadios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'frequency')
    })
  })

  it('handles edge case timezones correctly', () => {
    // Mock a timezone that might not format nicely
    const originalIntl = global.Intl
    global.Intl = ({
      ...originalIntl,
      DateTimeFormat: jest.fn(() => ({
        resolvedOptions: jest.fn(() => ({
          timeZone: 'Pacific/Honolulu',
        })),
        formatToParts: jest.fn(() => {
          throw new Error('Formatting error')
        }),
      })),
    }) as unknown as typeof global.Intl

    render(<TimingControls {...mockProps} />)

    // Should still render without crashing
    expect(screen.getByText('Reminder Frequency')).toBeInTheDocument()

    // Restore original Intl
    global.Intl = originalIntl
  })
})
