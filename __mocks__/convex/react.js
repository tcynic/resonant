// Mock for convex/react
const mockQuery = jest.fn()
const mockMutation = jest.fn()
const mockAction = jest.fn()

// Export all hooks as jest functions
const useQuery = jest.fn((queryFunc, ...args) => {
  // Return undefined by default (loading state)
  return undefined
})

const useMutation = jest.fn(mutationFunc => {
  // Return a mock mutation function
  return jest.fn().mockResolvedValue(undefined)
})

const useAction = jest.fn(actionFunc => {
  // Return a mock action function
  return jest.fn().mockResolvedValue(undefined)
})

const usePaginatedQuery = jest.fn((queryFunc, args, options) => {
  // Return a mock paginated query result
  return {
    results: [],
    status: 'LoadingFirstPage',
    isLoading: true,
    loadMore: jest.fn(),
  }
})

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
