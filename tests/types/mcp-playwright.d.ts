// MCP Playwright types for test environment
// These functions are available only when running tests in MCP environment

declare global {
  // Navigation functions
  function mcp__playwright__browser_navigate(options: {
    url: string
  }): Promise<void>
  function mcp__playwright__browser_navigate_back(): Promise<void>
  function mcp__playwright__browser_navigate_forward(): Promise<void>

  // Page interaction functions
  function mcp__playwright__browser_click(options: {
    element: string
    ref: string
    button?: 'left' | 'right' | 'middle'
    doubleClick?: boolean
  }): Promise<void>

  function mcp__playwright__browser_type(options: {
    element: string
    ref: string
    text: string
    slowly?: boolean
    submit?: boolean
  }): Promise<void>

  function mcp__playwright__browser_press_key(options: {
    key: string
  }): Promise<void>

  function mcp__playwright__browser_hover(options: {
    element: string
    ref: string
  }): Promise<void>

  function mcp__playwright__browser_select_option(options: {
    element: string
    ref: string
    values: string[]
  }): Promise<void>

  // Wait functions
  function mcp__playwright__browser_wait_for(options: {
    text?: string
    textGone?: string
    time?: number
  }): Promise<void>

  // Capture functions
  function mcp__playwright__browser_snapshot(): Promise<{
    elements: Array<{
      ref: string
      text: string
      role: string
      tagName: string
    }>
  }>

  function mcp__playwright__browser_take_screenshot(options?: {
    element?: string
    ref?: string
    filename?: string
    raw?: boolean
  }): Promise<string>

  // Browser management
  function mcp__playwright__browser_close(): Promise<void>
  function mcp__playwright__browser_resize(options: {
    width: number
    height: number
  }): Promise<void>

  // Tab management
  function mcp__playwright__browser_tab_list(): Promise<
    Array<{ index: number; url: string; title: string }>
  >
  function mcp__playwright__browser_tab_new(options?: {
    url?: string
  }): Promise<void>
  function mcp__playwright__browser_tab_select(options: {
    index: number
  }): Promise<void>
  function mcp__playwright__browser_tab_close(options?: {
    index?: number
  }): Promise<void>

  // Advanced functions
  function mcp__playwright__browser_evaluate(options: {
    function: string
    element?: string
    ref?: string
  }): Promise<unknown>

  function mcp__playwright__browser_drag(options: {
    startElement: string
    startRef: string
    endElement: string
    endRef: string
  }): Promise<void>

  function mcp__playwright__browser_file_upload(options: {
    paths: string[]
  }): Promise<void>

  function mcp__playwright__browser_handle_dialog(options: {
    accept: boolean
    promptText?: string
  }): Promise<void>

  // Debugging functions
  function mcp__playwright__browser_console_messages(): Promise<
    Array<{
      type: string
      text: string
      timestamp: number
    }>
  >

  function mcp__playwright__browser_network_requests(): Promise<
    Array<{
      url: string
      method: string
      status: number
      timestamp: number
    }>
  >

  function mcp__playwright__browser_install(): Promise<void>
}

export {}
