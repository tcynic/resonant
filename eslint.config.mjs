import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: ['convex/_generated/**/*', 'convex/_generated_stubs/**/*'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...compat.config({
    extends: ['prettier'],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': 'error',
    },
  }),
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': 'off',
    },
  },
  // Convex-specific rules
  {
    files: ['convex/**/*.ts', 'convex/**/*.js'],
    rules: {
      // Allow any types in Convex files due to generated type limitations
      '@typescript-eslint/no-explicit-any': 'off',
      // Disable TypeScript argument type checking for convex-test library issues
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  // Convex test files - handle convex-test library limitations
  {
    files: ['convex/__tests__/**/*.ts', 'convex/**/*.test.ts'],
    rules: {
      // Disable specific TypeScript rules that conflict with convex-test library definitions
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // Allow TypeScript ignore comments for known convex-test issues
      '@typescript-eslint/prefer-ts-expect-error': 'off',
    },
  },
]

export default eslintConfig
