// Matches Figma: Week Column Header
// Two rows — month banner (24px) + week dates (28px) = 52px total

export const HEADER_HEIGHT = 52
export const MONTH_ROW_H  = 24
export const WEEK_ROW_H   = 28

interface WeekHeaderProps {
  weeks: Date[]
  colWidth: number
  todayCol: number
}

export default function WeekHeader({ weeks, colWidth, todayCol }: WeekHeaderProps) {
  const totalWidth = weeks.length * colWidth

  // Build month groups: { label, startIndex }
  const monthGroups: { label: string; startIndex: number }[] = []
  let prevMonth = ''
  weeks.forEach((week, i) => {
    const label = week.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (label !== prevMonth) {
      monthGroups.push({ label, startIndex: i })
      prevMonth = label
    }
  })

  return (
    <div style={{ width: totalWidth, flexShrink: 0, position: 'relative' }}>

      {/* Month banner */}
      <div
        style={{
          position: 'relative',
          height: MONTH_ROW_H,
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-tertiary)',
        }}
      >
        {monthGroups.map((m, i) => (
          <div key={m.label}>
            {/* Month separator line (not before first) */}
            {i > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: m.startIndex * colWidth,
                  top: 0,
                  width: 1,
                  height: MONTH_ROW_H,
                  backgroundColor: 'var(--border-tertiary)',
                }}
              />
            )}
            {/* Month label */}
            <span
              style={{
                position: 'absolute',
                left: m.startIndex * colWidth + 8,
                top: 5,
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Week dates row */}
      <div
        style={{
          position: 'relative',
          height: WEEK_ROW_H,
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-tertiary)',
        }}
      >
        {weeks.map((week, i) => {
          const isToday = i === todayCol
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: i * colWidth,
                top: 0,
                width: colWidth,
                height: WEEK_ROW_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderLeft: i > 0 ? '1px solid var(--border-tertiary)' : 'none',
                backgroundColor: isToday ? 'rgba(6,182,212,0.06)' : undefined,
              }}
            >
              {isToday ? (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: 'var(--brand-primary)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Today
                </span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  {week.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
