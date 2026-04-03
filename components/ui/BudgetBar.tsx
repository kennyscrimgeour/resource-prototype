interface BudgetBarProps {
  budgetUsed: number
  overBudget?: boolean
  budgetOverrun?: number
  height?: number
}

const FILL_COLOR   = '#00bc7d'
const FILL_ERROR   = '#ef4444'
const MARKER_COLOR = '#52525b'
const MARKER_OVER  = '#fef2f2'

export default function BudgetBar({ budgetUsed, overBudget = false, budgetOverrun = 0, height = 8 }: BudgetBarProps) {
  const markerW  = 2
  const radius   = height / 2
  const leftPct  = Math.min(budgetUsed, 1) * 50
  const rightPct = overBudget ? budgetOverrun * 50 : 0

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height,
      borderRadius: 1,
      backgroundColor: 'var(--budget-track)',
      overflow: 'hidden',
    }}>
      {leftPct > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${leftPct}%`,
          backgroundColor: overBudget ? FILL_ERROR : FILL_COLOR,
          borderRadius: '1px 0 0 1px',
        }} />
      )}

      <div style={{
        position: 'absolute',
        top: 0,
        left: `calc(50% - ${markerW / 2}px)`,
        width: markerW,
        height: '100%',
        backgroundColor: overBudget ? MARKER_OVER : MARKER_COLOR,
      }} />

      {rightPct > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: `${rightPct}%`,
          height: '100%',
          backgroundColor: FILL_ERROR,
        }} />
      )}
    </div>
  )
}
