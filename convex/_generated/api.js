// Stub API file for build compatibility when Convex codegen is not available
export const api = new Proxy(
  {},
  {
    get(target, prop) {
      return new Proxy(
        function stubFunction() {
          // Return a function that can be called during build
          return undefined
        },
        {
          get(fnTarget, fnProp) {
            // Handle property access on the stub function
            if (fnProp === 'toString') {
              return () => `[Function: ${String(prop)}.stub]`
            }
            if (fnProp === 'name') {
              return `${String(prop)}.stub`
            }
            if (fnProp === Symbol.toStringTag) {
              return 'Function'
            }
            // Return another stub function for chained calls
            return function nestedStubFunction() {
              return undefined
            }
          },
        }
      )
    },
  }
)

export const internal = new Proxy(
  {},
  {
    get(target, prop) {
      return new Proxy(
        function stubFunction() {
          // Return a function that can be called during build
          return undefined
        },
        {
          get(fnTarget, fnProp) {
            // Handle property access on the stub function
            if (fnProp === 'toString') {
              return () => `[Function: internal.${String(prop)}.stub]`
            }
            if (fnProp === 'name') {
              return `internal.${String(prop)}.stub`
            }
            if (fnProp === Symbol.toStringTag) {
              return 'Function'
            }
            // Return another stub function for chained calls
            return function nestedStubFunction() {
              return undefined
            }
          },
        }
      )
    },
  }
)
