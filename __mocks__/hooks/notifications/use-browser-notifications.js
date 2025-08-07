// Mock for use-browser-notifications hook
module.exports = {
  useBrowserNotifications: jest.fn(() => ({
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted'),
    showNotification: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
  })),
}
