// Stub API file for build compatibility when Convex codegen is not available
export const api = new Proxy(
  {},
  {
    get() {
      return new Proxy(() => {}, {
        get() {
          return () => {}
        },
      })
    },
  }
)
