/**
 * Demo page for testing journal entry creation with MCP Playwright
 * This bypasses authentication for E2E testing demonstration
 */

import { JournalDemoClient } from './journal-demo-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journal Entry Demo - Resonant',
  description: 'Demo page for testing journal entry creation functionality',
}

export default function TestJournalDemo() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Journal Entry Creation Demo
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Testing journal entry functionality with MCP Playwright automation
          </p>
        </div>

        <JournalDemoClient />

        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🧪 Testing Features Available:
          </h2>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Rich text content editor with validation</li>
            <li>• Mood selector with 10 different mood options</li>
            <li>• Dynamic tag input with suggestions and autocomplete</li>
            <li>• Relationship picker with multi-select capability</li>
            <li>• Privacy toggle (public/private entries)</li>
            <li>• Form validation and error handling</li>
            <li>• Save and cancel functionality</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
