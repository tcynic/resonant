import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    render(<TimingControls {...mockProps} />)

    const timeInput = screen.getByDisplayValue('09:00')

    // Use fireEvent to directly change the value instead of simulating typing
    fireEvent.change(timeInput, { target: { value: '14:30' } })

    // Should be called with the expected value
    expect(mockProps.onTimeChange).toHaveBeenCalledWith('14:30')
  })

  it('displays current timezone selection', () => {
    render(<TimingControls {...mockProps} />)

    const timezoneSelect = screen.getByRole('combobox')
    expect(timezoneSelect).toHaveValue('America/New_York')
  })

  it('calls onTimezoneChange when timezone is changed', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    const timezoneSelect = screen.getByRole('combobox')
    await user.selectOptions(timezoneSelect, 'Europe/London')

    expect(mockProps.onTimezoneChange).toHaveBeenCalledWith('Europe/London')
  })

  it('shows detected timezone option when different from current', async () => {
    render(<TimingControls {...mockProps} />)

    // Wait for the useEffect to set the detected timezone - look for the detected label
    await waitFor(() => {
      expect(screen.getByText(/detected/i)).toBeInTheDocument()
    })
  })

  it('allows quick selection of detected timezone', async () => {
    const user = userEvent.setup()
    render(<TimingControls {...mockProps} />)

    // Wait for the useEffect to set the detected timezone and show the button
    const useDetectedButton = await screen.findByText(/use detected timezone/i)
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
    render(<TimingControls {...mockProps} />)

    const startTimeInput = screen.getByDisplayValue('22:00')
    const endTimeInput = screen.getByDisplayValue('07:00')

    // Use fireEvent to directly change the values
    fireEvent.change(startTimeInput, { target: { value: '23:00' } })
    fireEvent.change(endTimeInput, { target: { value: '06:00' } })

    expect(mockProps.onDNDStartChange).toHaveBeenCalledWith('23:00')
    expect(mockProps.onDNDEndChange).toHaveBeenCalledWith('06:00')
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
    global.Intl = {
      ...originalIntl,
      DateTimeFormat: jest.fn(() => ({
        resolvedOptions: jest.fn(() => ({
          timeZone: 'Pacific/Honolulu',
        })),
        formatToParts: jest.fn(() => {
          throw new Error('Formatting error')
        }),
      })),
    } as unknown as typeof global.Intl

    render(<TimingControls {...mockProps} />)

    // Should still render without crashing
    expect(screen.getByText('Reminder Frequency')).toBeInTheDocument()

    // Restore original Intl
    global.Intl = originalIntl
  })
})
