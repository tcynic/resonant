import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { PrivacySettings } from '../privacy-settings'

// Mock dependencies
jest.mock('@clerk/nextjs')
// Convex is mocked globally in jest.setup.js

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

describe('PrivacySettings', () => {
  const mockUpdatePrivacySettings = jest.fn()

  const mockUser = {
    id: 'user_123',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    externalId: null,
    primaryEmailAddressId: 'email_123',
    primaryPhoneNumberId: null,
    primaryPhoneNumber: null,
    primaryWeb3WalletId: null,
    primaryWeb3Wallet: null,
    username: null,
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    imageUrl: '',
    hasImage: false,
    profileImageUrl: '',
    publicMetadata: {},
    privateMetadata: {},
    unsafeMetadata: {},
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    phoneNumbers: [],
    web3Wallets: [],
    externalAccounts: [],
    samlAccounts: [],
    enterpriseAccounts: [],
    passkeys: [],
    organizationMemberships: [],
    passwordEnabled: true,
    twoFactorEnabled: false,
    totpEnabled: false,
    backupCodeEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
    lastActiveAt: new Date(),
    banned: false,
    locked: false,
    deleteSelfEnabled: true,
    createOrganizationEnabled: true,
    verification: null,
    createOrganization: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getSessions: jest.fn(),
    getOrganizationMemberships: jest.fn(),
    createExternalAccount: jest.fn(),
    getOrCreateOrganization: jest.fn(),
    reload: jest.fn(),
    setProfileImage: jest.fn(),
    destroy: jest.fn(),
    updatePassword: jest.fn(),
    removePassword: jest.fn(),
    createEmailAddress: jest.fn(),
    createPhoneNumber: jest.fn(),
    createWeb3Wallet: jest.fn(),
    createTOTP: jest.fn(),
    disableTOTP: jest.fn(),
    createBackupCode: jest.fn(),
    createPasskey: jest.fn(),
    getFirstName: jest.fn(),
    getLastName: jest.fn(),
    getFullName: jest.fn(),
    getInitials: jest.fn(),
    hasVerifiedEmailAddress: jest.fn(),
    hasVerifiedPhoneNumber: jest.fn(),
  } as any

  const mockUserData = {
    _id: 'convex_user_123',
    email: 'test@example.com',
    preferences: {
      dataSharing: false,
      analyticsOptIn: true,
      marketingOptIn: false,
      searchIndexing: true,
      dataRetention: '3years' as const,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })
    mockUseQuery.mockReturnValue(mockUserData)
    mockUseMutation.mockReturnValue(mockUpdatePrivacySettings)
    mockUpdatePrivacySettings.mockResolvedValue(undefined)
  })

  it('should render privacy settings form', () => {
    render(<PrivacySettings />)

    expect(screen.getByText('Privacy Settings')).toBeInTheDocument()
    expect(screen.getByText('Data Usage & Sharing')).toBeInTheDocument()
    expect(screen.getByText('Allow anonymous data sharing')).toBeInTheDocument()
    expect(screen.getByText('Allow search indexing')).toBeInTheDocument()
  })

  it('should load and display current privacy settings', () => {
    render(<PrivacySettings />)

    // Data sharing should be unchecked (false)
    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    expect(dataSharingCheckbox).not.toBeChecked()

    // Analytics should be checked (true)
    const analyticsCheckbox = screen.getByLabelText(/Allow usage analytics/i)
    expect(analyticsCheckbox).toBeChecked()

    // Marketing should be unchecked (false)
    const marketingCheckbox = screen.getByLabelText(
      /Receive marketing communications/i
    )
    expect(marketingCheckbox).not.toBeChecked()

    // Search indexing should be checked (true)
    const searchCheckbox = screen.getByLabelText(/Allow search indexing/i)
    expect(searchCheckbox).toBeChecked()
  })

  it('should handle data sharing toggle', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    await user.click(dataSharingCheckbox)

    expect(dataSharingCheckbox).toBeChecked()

    // Should show changes indicator
    expect(screen.getByText('Save Settings')).not.toBeDisabled()
  })

  it('should handle analytics toggle', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    const analyticsCheckbox = screen.getByLabelText(/Allow usage analytics/i)
    await user.click(analyticsCheckbox)

    expect(analyticsCheckbox).not.toBeChecked()

    // Should enable save button
    expect(screen.getByText('Save Settings')).not.toBeDisabled()
  })

  it('should handle marketing communications toggle', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    const marketingCheckbox = screen.getByLabelText(
      /Receive marketing communications/i
    )
    await user.click(marketingCheckbox)

    expect(marketingCheckbox).toBeChecked()

    // Should enable save button
    expect(screen.getByText('Save Settings')).not.toBeDisabled()
  })

  it('should handle search indexing toggle', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    const searchCheckbox = screen.getByLabelText(/Allow search indexing/i)
    await user.click(searchCheckbox)

    expect(searchCheckbox).not.toBeChecked()

    // Should enable save button
    expect(screen.getByText('Save Settings')).not.toBeDisabled()
  })

  it('should handle data retention selection', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    // Find and click 1 year option
    const oneYearOption = screen.getByLabelText(/1 Year/i)
    await user.click(oneYearOption)

    expect(oneYearOption).toBeChecked()

    // Should enable save button
    expect(screen.getByText('Save Settings')).not.toBeDisabled()
  })

  it('should save privacy settings when save button is clicked', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    // Make a change
    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    await user.click(dataSharingCheckbox)

    // Click save
    const saveButton = screen.getByText('Save Settings')
    await user.click(saveButton)

    expect(mockUpdatePrivacySettings).toHaveBeenCalledWith({
      userId: 'convex_user_123',
      preferences: {
        dataSharing: true, // Changed from false to true
        analyticsOptIn: true,
        marketingOptIn: false,
        searchIndexing: true,
        dataRetention: '3years',
      },
    })
  })

  it('should show loading state when saving', async () => {
    const user = userEvent.setup()

    // Mock mutation to be pending
    const pendingPromise = new Promise(() => {}) // Never resolves
    mockUpdatePrivacySettings.mockReturnValue(pendingPromise)

    render(<PrivacySettings />)

    // Make a change
    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    await user.click(dataSharingCheckbox)

    // Click save
    const saveButton = screen.getByText('Save Settings')
    await user.click(saveButton)

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(saveButton).toBeDisabled()
  })

  it('should show success message after saving', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    // Make a change
    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    await user.click(dataSharingCheckbox)

    // Click save
    const saveButton = screen.getByText('Save Settings')
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('Privacy settings saved successfully')
      ).toBeInTheDocument()
    })

    // Save button should be disabled after successful save
    expect(saveButton).toBeDisabled()
  })

  it('should show error message when save fails', async () => {
    const user = userEvent.setup()

    // Mock mutation to reject
    mockUpdatePrivacySettings.mockRejectedValue(new Error('Save failed'))

    render(<PrivacySettings />)

    // Make a change
    const dataSharingCheckbox = screen.getByLabelText(
      /Allow anonymous data sharing/i
    )
    await user.click(dataSharingCheckbox)

    // Click save
    const saveButton = screen.getByText('Save Settings')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to save settings/i)).toBeInTheDocument()
    })
  })

  it('should display privacy explanations', () => {
    render(<PrivacySettings />)

    // Should show helpful explanations for each setting
    expect(
      screen.getByText(/Help improve our AI analysis features/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Help us understand how you use/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Receive updates about new features/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Allow your entries to be searchable/i)
    ).toBeInTheDocument()
  })

  it('should handle loading state when user data is not available', () => {
    mockUseQuery.mockReturnValue(null) // No user data loaded yet

    render(<PrivacySettings />)

    // Should show loading state (spinner)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should use default settings when no user preferences exist', () => {
    const userDataWithoutPreferences = {
      _id: 'convex_user_123',
      email: 'test@example.com',
      preferences: null,
    }

    mockUseQuery.mockReturnValue(userDataWithoutPreferences)

    render(<PrivacySettings />)

    // Should use default values
    expect(
      screen.getByLabelText(/Allow anonymous data sharing/i)
    ).not.toBeChecked() // Default false
    expect(screen.getByLabelText(/Allow usage analytics/i)).toBeChecked() // Default true
    expect(
      screen.getByLabelText(/Receive marketing communications/i)
    ).not.toBeChecked() // Default false
    expect(screen.getByLabelText(/Allow search indexing/i)).toBeChecked() // Default true
  })

  it('should show privacy impact warnings for sensitive changes', async () => {
    const user = userEvent.setup()
    render(<PrivacySettings />)

    // Disable search indexing (sensitive change)
    const searchCheckbox = screen.getByLabelText(/Allow search indexing/i)
    await user.click(searchCheckbox)

    // Should show warning about impact
    expect(
      screen.getByText(/may affect search functionality/i)
    ).toBeInTheDocument()
  })

  it('should meet accessibility requirements', () => {
    render(<PrivacySettings />)

    // All checkboxes should have proper labels
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAccessibleName()
    })

    // Radio buttons should have proper labels
    const radioButtons = screen.getAllByRole('radio')
    radioButtons.forEach(radio => {
      expect(radio).toHaveAccessibleName()
    })

    // Should have proper heading structure
    expect(
      screen.getByRole('heading', { name: /Privacy Settings/i })
    ).toBeInTheDocument()
  })
})
