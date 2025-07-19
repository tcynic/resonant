import { render, screen } from '@testing-library/react'
import ProfilePage from '../page'

// Mock Clerk's UserProfile component
jest.mock('@clerk/nextjs', () => ({
  UserProfile: () => (
    <div data-testid="clerk-userprofile">User Profile Component</div>
  ),
}))

describe('ProfilePage', () => {
  it('renders the profile page with Clerk component', () => {
    render(<ProfilePage />)

    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
    expect(screen.getByTestId('clerk-userprofile')).toBeInTheDocument()
  })

  it('has proper page structure and styling', () => {
    render(<ProfilePage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Profile Settings')
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'mb-6')
  })
})
