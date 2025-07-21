/**
 * Build-time stub for Convex API
 * 
 * This provides minimal functionality for Vercel builds.
 * Gets replaced with actual generated content during development.
 */

// Create a proxy that returns appropriate mock function references
const createMockQueryRef = () => ({
  _type: "query",
  _visibility: "public", 
  _args: {},
  _returns: {}
});

const createMockMutationRef = () => ({
  _type: "mutation",
  _visibility: "public", 
  _args: {},
  _returns: {}
});

// Known mutation functions - update this list as needed
const mutationFunctions = new Set([
  'create',
  'update', 
  'delete',
  'upsert',
  'store',
  'save',
  'remove'
]);

const createMockModule = (moduleName) => new Proxy({}, {
  get: (target, prop) => {
    const functionName = String(prop);
    // Check if this looks like a mutation based on common patterns
    const isMutation = mutationFunctions.has(functionName) || 
                     functionName.startsWith('create') ||
                     functionName.startsWith('update') ||
                     functionName.startsWith('delete') ||
                     functionName.startsWith('upsert');
    
    return isMutation ? createMockMutationRef() : createMockQueryRef();
  }
});

export const api = new Proxy({}, {
  get: (target, prop) => createMockModule(String(prop))
});