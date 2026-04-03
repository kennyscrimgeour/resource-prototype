type AvatarSize = 'xs' | 'sm' | 'md'

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-sm',
}

const PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
  '#14b8a6', // teal
]

interface AvatarProps {
  initials: string
  size?: AvatarSize
  colorIndex?: number
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export default function Avatar({ initials, size = 'sm', colorIndex = 0, className = '', style, onClick }: AvatarProps) {
  const bg = PALETTE[colorIndex % PALETTE.length]

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white ${sizeStyles[size]} ${className}`}
      style={{ backgroundColor: bg, ...style }}
      onClick={onClick}
    >
      {initials}
    </div>
  )
}
