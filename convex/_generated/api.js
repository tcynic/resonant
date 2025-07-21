/**
 * Build-time stub for Convex API
 * 
 * This provides minimal functionality for Vercel builds.
 * Gets replaced with actual generated content during development.
 */

// Create a proxy that returns mock function references for any property access
const createMockFunctionRef = () => ({
  _type: "query",
  _visibility: "public", 
  _args: {},
  _returns: {}
});

const createMockModule = () => new Proxy({}, {
  get: () => createMockFunctionRef()
});

export const api = new Proxy({}, {
  get: () => createMockModule()
});