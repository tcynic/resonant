// Mock for convex/react
const mockQuery = jest.fn()
const mockMutation = jest.fn()
const mockAction = jest.fn()

// Export all hooks as jest functions - make them real jest mocks
const useQuery = jest.fn()

const useMutation = jest.fn(() => jest.fn())

const useAction = jest.fn(() => jest.fn())

const usePaginatedQuery = jest.fn()

// Components
const Authenticated = ({ children }) => children
const Unauthenticated = ({ children }) => children
const AuthLoading = ({ children }) => children
const ConvexProvider = ({ children }) => children

// Client
const ConvexReactClient = jest.fn().mockImplementation(() => ({
  setAuth: jest.fn(),
  clearAuth: jest.fn(),
}))

module.exports = {
  useQuery,
  useMutation,
  useAction,
  usePaginatedQuery,
  Authenticated,
  Unauthenticated,
  AuthLoading,
  ConvexProvider,
  ConvexReactClient,
}
