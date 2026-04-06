// Week/Month header — works with day-based column arrays (one Date per calendar day).
// Month banner spans each calendar month.
// Week row renders one cell per Monday (7 × colWidth wide).
// Today's week is highlighted; all other weeks show the Monday date.

export const HEADER_HEIGHT = 52
export const MONTH_ROW_H  = 24
export const WEEK_ROW_H   = 28

interface WeekHeaderProps {
  weeks: Date[]   // one entry per calendar day
  colWidth: number
  todayCol: number
}

export default function WeekHeader({ weeks: days, colWidth, todayCol }: WeekHeaderProps) {
  const totalWidth = days.length * colWidth

  // ── Month groups ──────────────────────────────────────────────────────────
  const monthGroups: { label: string; startIndex: number }[] = []
  let prevMonth = ''
  days.forEach((day, i) => {
    const label = day.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (label !== prevMonth) {
      monthGroups.push({ label, startIndex: i })
      prevMonth = label
    }
  })

  // ── Today's week Monday index ─────────────────────────────────────────────
  const todayDay        = days[Math.min(todayCol, days.length - 1)]
  const todayDow        = todayDay ? (todayDay.getDay() + 6) % 7 : 0   // 0=Mon, 6=Sun
  const todayWeekStart  = todayCol - todayDow

  return (
    <div style={{ width: totalWidth, flexShrink: 0, position: 'relative' }}>

      {/* ── Month banner ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', height: MONTH_ROW_H,
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-tertiary)',
      }}>
        {monthGroups.map((m, i) => (
          <div key={m.label}>
            {i > 0 && (
              <div style={{
                position: 'absolute', left: m.startIndex * colWidth, top: 0,
                width: 1, height: MONTH_ROW_H, backgroundColor: 'var(--border-tertiary)',
              }} />
            )}
            <span style={{
              position: 'absolute', left: m.startIndex * colWidth + 8, top: 5,
              fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)',
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Week row — one cell per Monday, 7 columns wide ────────────────── */}
      <div style={{
        position: 'relative', height: WEEK_ROW_H,
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-tertiary)',
      }}>
        {days.map((day, i) => {
          // Only render on Mondays
          if (day.getDay() !== 1) return null
          const isThisWeek = i === todayWeekStart
          const cellWidth  = Math.min(7, days.length - i) * colWidth

          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: i * colWidth, top: 0,
                width: cellWidth, height: WEEK_ROW_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderLeft: i > 0 ? '1px solid var(--border-tertiary)' : 'none',
                backgroundColor: isThisWeek ? 'rgba(6,182,212,0.06)' : undefined,
                overflow: 'hidden',
              }}
            >
              {isThisWeek ? (
                <span style={{
                  fontSize: 9, fontWeight: 600,
                  color: 'var(--neutral-lightest, #fafafa)',
                  backgroundColor: 'var(--neutral-darkest, #18181b)',
                  borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>
                  Today
                </span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
