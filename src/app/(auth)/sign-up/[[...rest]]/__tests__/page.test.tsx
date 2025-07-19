import { render, screen } from '@testing-library/react'
import SignUpPage from '../page'

// Mock Clerk's SignUp component
jest.mock('@clerk/nextjs', () => ({
  SignUp: () => <div data-testid="clerk-signup">Sign Up Component</div>,
}))

describe('SignUpPage', () => {
  it('renders the sign-up page with Clerk component', () => {
    render(<SignUpPage />)

    expect(screen.getByTestId('clerk-signup')).toBeInTheDocument()
  })

  it('has proper page structure with centering', () => {
    render(<SignUpPage />)

    const container = screen.getByTestId('clerk-signup').parentElement
    expect(container).toHaveClass(
      'flex',
      'min-h-screen',
      'items-center',
      'justify-center'
    )
  })
})
