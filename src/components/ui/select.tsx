import React from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
}

export default function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const selectClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm text-sm
    focus:outline-none focus:ring-2 focus:ring-offset-0
    ${
      error
        ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
    }
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${className}
  `.trim()

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <select 
        id={selectId} 
        className={selectClasses} 
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}
