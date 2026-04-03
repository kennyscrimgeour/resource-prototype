type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info'
type BadgeSize    = 'sm' | 'md' | 'lg'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  brand:   'bg-[var(--brand-tertiary)] text-[var(--text-brand)] border-[var(--brand-secondary)]',
  success: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  error:   'bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]',
  info:    'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded',
  md: 'text-xs px-2 py-0.5 rounded',
  lg: 'text-xs px-2.5 py-1 rounded',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

export default function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium border whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  )
}
