// Mock for convex-test
module.exports = {
  convexTest: jest.fn(schema => {
    return {
      run: jest.fn(async fn => {
        // Mock context object
        const ctx = {
          db: {
            query: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue('mock-id'),
            patch: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(null),
            replace: jest.fn().mockResolvedValue(undefined),
            system: {
              query: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue(null),
            },
          },
          auth: {
            getUserIdentity: jest.fn().mockResolvedValue(null),
          },
          storage: {
            store: jest.fn().mockResolvedValue('mock-storage-id'),
            get: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        }

        // Call the function with mock context
        return await fn(ctx)
      }),

      mutation: jest.fn(fn => fn),
      query: jest.fn(fn => fn),
      action: jest.fn(fn => fn),

      finishAllScheduledFunctions: jest.fn().mockResolvedValue(undefined),
      finishInProgressScheduledFunctions: jest
        .fn()
        .mockResolvedValue(undefined),
    }
  }),
}
