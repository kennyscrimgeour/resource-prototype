interface BudgetBarProps {
  actualSpend:    number
  projectedSpend: number
  budgetTotal:    number
  height?:        number
}

const COLOR_ACTUAL    = '#16a34a'
const COLOR_PROJECTED = 'rgba(34,197,94,0.38)'
const COLOR_OVERRUN   = '#ef4444'

/**
 * Bar width is always fixed = budgetTotal (100%).
 *
 * Segments (left → right, never exceeding 100%):
 *   [actualPct]   solid green  — costs locked before today
 *   [ghostPct]    ghost green  — forecast that fits within budget
 *   [redPct]      solid red    — forecast that exceeds budget (right-aligned)
 */
export default function BudgetBar({ actualSpend, projectedSpend, budgetTotal, height = 8 }: BudgetBarProps) {
  if (budgetTotal <= 0)
    return <div style={{ height, borderRadius: height / 2, backgroundColor: 'var(--budget-track)' }} />

  const totalForecast = actualSpend + projectedSpend
  const isOver        = totalForecast > budgetTotal

  // All fractions relative to budgetTotal, capped at 1.0
  const actualFrac  = Math.min(actualSpend / budgetTotal, 1)
  const totalFrac   = Math.min(totalForecast / budgetTotal, 1)         // capped at 1 for layout
  const overrunFrac = Math.max(0, (totalForecast - budgetTotal) / budgetTotal)

  // Red occupies the rightmost portion of the bar equal to the overrun (capped by remaining space)
  const redFrac   = Math.min(overrunFrac, 1 - actualFrac)
  // Ghost green fills between actual and the red segment
  const ghostFrac = Math.max(0, totalFrac - actualFrac - redFrac)

  const actualPct = actualFrac * 100
  const ghostPct  = ghostFrac  * 100
  const redPct    = redFrac    * 100
  const r         = height / 2

  return (
    <div
      style={{
        position:        'relative',
        width:           '100%',
        height,
        borderRadius:    r,
        backgroundColor: 'var(--budget-track)',
        overflow:        'hidden',
      }}
    >
      {/* Solid green — actual spend */}
      {actualPct > 0 && (
        <div style={{
          position:        'absolute',
          top: 0, left:    0,
          height:          '100%',
          width:           `${actualPct}%`,
          backgroundColor: COLOR_ACTUAL,
          borderRadius:    `${r}px 0 0 ${r}px`,
        }} />
      )}

      {/* Ghost green — on-track forecast */}
      {ghostPct > 0 && (
        <div style={{
          position:        'absolute',
          top: 0,
          left:            `${actualPct}%`,
          height:          '100%',
          width:           `${ghostPct}%`,
          backgroundColor: COLOR_PROJECTED,
        }} />
      )}

      {/* Solid red — overrun forecast, right-aligned */}
      {redPct > 0 && (
        <div style={{
          position:        'absolute',
          top: 0,
          left:            `${100 - redPct}%`,
          height:          '100%',
          width:           `${redPct}%`,
          backgroundColor: COLOR_OVERRUN,
          borderRadius:    `0 ${r}px ${r}px 0`,
        }} />
      )}
    </div>
  )
}
