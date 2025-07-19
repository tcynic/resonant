import React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
}

export default function Checkbox({
  label,
  description,
  error,
  className = '',
  id,
  ...props
}: CheckboxProps) {
  const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const checkboxClasses = `
    h-4 w-4 text-blue-600 border-gray-300 rounded
    focus:ring-blue-500 focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `.trim()

  return (
    <div className="space-y-1">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id={checkboxId}
            className={checkboxClasses}
            {...props}
          />
        </div>
        <div className="ml-3 text-sm">
          {label && (
            <label
              htmlFor={checkboxId}
              className="font-medium text-gray-700 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && <p className="text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 ml-7">{error}</p>}
    </div>
  )
}
