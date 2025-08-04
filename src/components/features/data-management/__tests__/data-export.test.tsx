import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { DataExport } from '../data-export'

// Mock dependencies
jest.mock('@clerk/nextjs')
// Convex is mocked globally in jest.setup.js

// Mock URL.createObjectURL and document methods
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock document.createElement only for anchor elements
const originalCreateElement = document.createElement
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
  style: {},
  setAttribute: jest.fn(),
  removeAttribute: jest.fn(),
}

jest.spyOn(document, 'createElement').mockImplementation(tagName => {
  if (tagName === 'a') {
    return mockLink as any
  }
  return originalCreateElement.call(document, tagName)
})

const originalAppendChild = document.body.appendChild
const originalRemoveChild = document.body.removeChild
jest.spyOn(document.body, 'appendChild').mockImplementation(node => {
  if (node === mockLink) {
    return node as any
  }
  return originalAppendChild.call(document.body, node)
})
jest.spyOn(document.body, 'removeChild').mockImplementation(node => {
  if (node === mockLink) {
    return node as any
  }
  return originalRemoveChild.call(document.body, node)
})

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

describe('DataExport', () => {
  const mockCreateExport = jest.fn()

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
    name: 'Test User',
  }

  const mockExportStats = {
    statistics: {
      relationships: 5,
      journalEntries: 25,
      healthScores: 12,
      aiAnalysis: 8,
    },
    accountCreated: '2024-01-01',
    estimatedSize: {
      jsonMB: 2.5,
    },
    dateRange: {
      firstEntry: '2024-01-15',
      lastEntry: '2024-12-15',
    },
  }

  const mockExportResult = {
    data: {
      user: mockUserData,
      relationships: [],
      journalEntries: [],
      healthScores: [],
      aiAnalysis: [],
    },
    fileName: 'resonant-export-json-2024-12-15.json',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })
    mockUseQuery.mockImplementation((apiFunc: any, args: any) => {
      // Handle the 'skip' case
      if (args === 'skip') return null

      // Return appropriate mock based on the arguments passed
      if (args && typeof args === 'object') {
        if ('clerkId' in args) {
          return mockUserData
        }
        if ('userId' in args) {
          return mockExportStats
        }
      }

      // Default: return null for unknown queries
      return null
    })
    mockUseMutation.mockReturnValue(mockCreateExport)
    mockCreateExport.mockResolvedValue(mockExportResult)
  })

  it('should render data export interface', () => {
    render(<DataExport />)

    expect(screen.getByText('Export Your Data')).toBeInTheDocument()
    // Use more flexible text matching for potentially broken up text
    expect(
      screen.getByText(
        content =>
          content.includes('Download') && content.includes('complete copy')
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Export Options')).toBeInTheDocument()
  })

  it('should display data overview statistics', () => {
    render(<DataExport />)

    expect(screen.getByText('5')).toBeInTheDocument() // relationships
    expect(screen.getByText('25')).toBeInTheDocument() // journal entries
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Journal Entries')).toBeInTheDocument()
  })

  it('should show AI analysis stats when include analysis is enabled', async () => {
    render(<DataExport />)

    // Should show AI analysis stats by default
    expect(screen.getByText('12')).toBeInTheDocument() // health scores
    expect(screen.getByText('8')).toBeInTheDocument() // ai analysis
    expect(screen.getByText('Health Scores')).toBeInTheDocument()
    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
  })

  it('should handle format selection', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    // JSON should be selected by default
    const jsonOption = screen.getByRole('button', { name: /JSON/ })
    expect(jsonOption).toHaveClass('border-blue-500')

    // Click CSV option
    const csvOption = screen.getByRole('button', { name: /CSV/ })
    await user.click(csvOption)

    expect(csvOption).toHaveClass('border-blue-500')
    expect(jsonOption).not.toHaveClass('border-blue-500')
  })

  it('should toggle include analysis option', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    const analysisCheckbox = screen.getByRole('checkbox', {
      name: /Include AI Analysis Data/,
    })
    expect(analysisCheckbox).toBeChecked()

    await user.click(analysisCheckbox)
    expect(analysisCheckbox).not.toBeChecked()
  })

  it('should perform export when export button is clicked', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    expect(mockCreateExport).toHaveBeenCalledWith({
      userId: 'convex_user_123',
      format: 'json',
      includeAnalysis: true,
      email: 'test@example.com',
    })
  })

  it('should show loading state during export', async () => {
    const user = userEvent.setup()

    // Mock pending export
    const pendingPromise = new Promise(() => {}) // Never resolves
    mockCreateExport.mockReturnValue(pendingPromise)

    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    expect(screen.getByText('Preparing your export...')).toBeInTheDocument()
    expect(screen.getByText('Preparing Export...')).toBeInTheDocument()
    expect(exportButton).toBeDisabled()
  })

  it('should show success state after export completion', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    await waitFor(() => {
      expect(
        screen.getByText('Export completed successfully!')
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('Your data has been downloaded to your device')
    ).toBeInTheDocument()
  })

  it('should trigger automatic download on export success', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled()
    })

    expect(mockLink.href).toBe('blob:mock-url')
    expect(mockLink.download).toBe('resonant-export-json-2024-12-15.json')
  })

  it('should handle export errors', async () => {
    const user = userEvent.setup()

    mockCreateExport.mockRejectedValue(new Error('Export failed'))

    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Failed to export data. Please try again.')
    ).toBeInTheDocument()
  })

  it('should show privacy and security information', () => {
    render(<DataExport />)

    expect(screen.getByText('Privacy & Security')).toBeInTheDocument()
    expect(
      screen.getByText(/Your export will include all personal data/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/The download is generated in real-time/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Keep your exported data secure/)
    ).toBeInTheDocument()
  })

  it('should display account creation date and estimated size', () => {
    render(<DataExport />)

    expect(screen.getByText('Account created:')).toBeInTheDocument()
    // Use flexible date matching in case formatting differs
    expect(
      screen.getByText(content => content.includes('2024'))
    ).toBeInTheDocument()
    expect(screen.getByText('Estimated size:')).toBeInTheDocument()
    expect(
      screen.getByText(content => content.includes('2.5'))
    ).toBeInTheDocument()
  })

  it('should display data date range', () => {
    render(<DataExport />)

    expect(screen.getByText('Data range:')).toBeInTheDocument()
    // Use flexible date range matching
    expect(
      screen.getByText(
        content => content.includes('2024') && content.includes('to')
      )
    ).toBeInTheDocument()
  })

  it('should provide alternative download link after export', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    await waitFor(() => {
      expect(
        screen.getByText(/If your download didn't start automatically/)
      ).toBeInTheDocument()
    })

    const downloadAgainButton = screen.getByRole('button', {
      name: /Download Again/,
    })
    expect(downloadAgainButton).toBeInTheDocument()

    await user.click(downloadAgainButton)
    expect(mockLink.click).toHaveBeenCalledTimes(2) // Once for auto-download, once for manual
  })

  it('should handle missing user data gracefully', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    })
    mockUseQuery.mockReturnValue(null)

    render(<DataExport />)

    // Should show loading state when user data is missing
    expect(screen.getByText('Loading user data...')).toBeInTheDocument()
  })

  it('should show different export parameters based on selections', async () => {
    const user = userEvent.setup()
    render(<DataExport />)

    // Change to CSV format
    const csvOption = screen.getByRole('button', { name: /CSV/ })
    await user.click(csvOption)

    // Disable analysis inclusion
    const analysisCheckbox = screen.getByRole('checkbox', {
      name: /Include AI Analysis Data/,
    })
    await user.click(analysisCheckbox)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    expect(mockCreateExport).toHaveBeenCalledWith({
      userId: 'convex_user_123',
      format: 'csv',
      includeAnalysis: false,
      email: 'test@example.com',
    })
  })

  it('should meet accessibility requirements', () => {
    render(<DataExport />)

    // Check for proper heading structure
    expect(
      screen.getByRole('heading', { name: /Export Your Data/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Your Data Overview/ })
    ).toBeInTheDocument()

    // Check for proper form labels
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAccessibleName()

    // Check for button accessibility
    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    expect(exportButton).toBeInTheDocument()
  })

  it('should validate user email before export', async () => {
    const user = userEvent.setup()

    // Mock user without email
    const userWithoutEmail = {
      ...mockUser,
      id: 'user_456',
      primaryEmailAddress: null,
      primaryEmailAddressId: null,
      firstName: null,
      lastName: null,
      fullName: null,
      emailAddresses: [],
      passwordEnabled: false,
      lastSignInAt: null,
    } as any
    mockUseUser.mockReturnValue({
      user: userWithoutEmail,
      isLoaded: true,
      isSignedIn: true,
    })

    render(<DataExport />)

    const exportButton = screen.getByRole('button', { name: /Export My Data/ })
    await user.click(exportButton)

    expect(mockCreateExport).not.toHaveBeenCalled()
  })
})
