// Matches Figma: Today Indicator (410:1858)
// Pill (--brand-primary bg) + 2px vertical line (--brand-primary).
// Positioned absolutely by the timeline grid at the correct x offset.

interface TodayIndicatorProps {
  /** Total height of the scrollable grid area in px */
  height: number
}

export default function TodayIndicator({ height }: TodayIndicatorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        width: 34,
        height,
        pointerEvents: 'none',
        zIndex: 10,
        transform: 'translateX(-50%)',  // centre over the current-day column midpoint
      }}
    >
      {/* Pill */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          right: 0,
          height: 18,
          borderRadius: 9,
          backgroundColor: 'var(--brand-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--bg-primary)',
            letterSpacing: '0.01em',
          }}
        >
          Today
        </span>
      </div>

      {/* Line */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 2,
          bottom: 0,
          borderRadius: 1,
          backgroundColor: 'var(--brand-primary)',
        }}
      />
    </div>
  )
}
