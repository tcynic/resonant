import { render, screen } from '@testing-library/react'
import SignInPage from '../page'

// Mock Clerk's SignIn component
jest.mock('@clerk/nextjs', () => ({
  SignIn: () => <div data-testid="clerk-signin">Sign In Component</div>,
}))

describe('SignInPage', () => {
  it('renders the sign-in page with Clerk component', () => {
    render(<SignInPage />)

    expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
  })

  it('has proper page structure with centering', () => {
    render(<SignInPage />)

    const container = screen.getByTestId('clerk-signin').parentElement
    expect(container).toHaveClass(
      'flex',
      'min-h-screen',
      'items-center',
      'justify-center'
    )
  })
})
