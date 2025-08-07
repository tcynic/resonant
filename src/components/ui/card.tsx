import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  className = '',
  padding = 'md',
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const paddingInline = {
    none: 0,
    sm: 16,
    md: 24,
    lg: 32,
  } as const

  const classes = `
    bg-white rounded-lg border border-gray-200 shadow-sm
    ${paddingClasses[padding]}
    ${className}
  `.trim()

  const fallbackStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    padding: paddingInline[padding],
  }

  const mergedStyle: React.CSSProperties = {
    ...fallbackStyle,
    ...(props.style as React.CSSProperties),
  }

  return (
    <div className={classes} style={mergedStyle} {...props}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`border-b border-gray-200 pb-4 mb-4 ${className}`}
      style={{
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: 16,
        marginBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`border-t border-gray-200 pt-4 mt-4 ${className}`}
      style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: 16,
        marginTop: 16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function CardDescription({
  children,
  className = '',
}: CardDescriptionProps) {
  return <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>
}
