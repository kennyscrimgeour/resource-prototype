import type { ReactNode } from 'react'
import type { ProjectPhase, PhaseProgress } from '@/data/projects'

const PHASES: ProjectPhase[] = ['Discovery', 'Design', 'Build', 'UAT', 'Live']
const PROGRESS_PCT: Record<PhaseProgress, number> = { Early: 0.2, Mid: 0.5, Late: 0.85 }

const GAP   = 3
const H     = 8
const R_OUT = 1

const COLOR_UNDER = '#22c55e'
const COLOR_OVER  = '#ef4444'
const COLOR_BRAND = 'var(--brand-primary)'

interface PhaseProgressBarProps {
  phase:         ProjectPhase
  progress:      PhaseProgress
  phaseBudgets?: Partial<Record<ProjectPhase, number>>
  phaseSpend?:   Partial<Record<ProjectPhase, number>>
}

export default function PhaseProgressBar({
  phase,
  progress,
  phaseBudgets,
  phaseSpend,
}: PhaseProgressBarProps) {
  const currentIdx = PHASES.indexOf(phase)
  const pct        = PROGRESS_PCT[progress]

  return (
    <div className="flex flex-col w-full gap-1">
      {/* Segments */}
      <div className="flex w-full" style={{ gap: GAP, height: H }}>
        {PHASES.map((p, i) => {
          const isFirst     = i === 0
          const isLast      = i === PHASES.length - 1
          const isCompleted = i < currentIdx
          const isCurrent   = i === currentIdx
          const fillPct     = isCompleted ? 100 : isCurrent ? pct * 100 : 0

          const tl = isFirst ? R_OUT : 0
          const bl = isFirst ? R_OUT : 0
          const tr = isLast  ? R_OUT : 0
          const br = isLast  ? R_OUT : 0

          // Determine fill colour for completed segments
          let fillColor = COLOR_BRAND
          if (isCompleted && phaseBudgets && phaseSpend) {
            const budget = phaseBudgets[p] ?? 0
            const spent  = phaseSpend[p]  ?? 0
            fillColor = budget > 0 && spent > budget ? COLOR_OVER : COLOR_UNDER
          }

          // Variance tooltip for completed phases only
          let tooltipNode: ReactNode = null
          if (isCompleted && phaseBudgets && phaseSpend) {
            const budget     = phaseBudgets[p] ?? 0
            const spent      = phaseSpend[p]  ?? 0
            const variancePct = budget > 0
              ? Math.round(((spent - budget) / budget) * 100)
              : 0
            const isOver     = variancePct > 0
            const label      = isOver
              ? `+${variancePct}% over`
              : variancePct < 0
                ? `${Math.abs(variancePct)}% under`
                : 'On budget'
            const labelColor = isOver ? COLOR_OVER : COLOR_UNDER

            tooltipNode = (
              <div
                className="absolute bottom-full left-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none"
                style={{ transform: 'translateX(-50%)', zIndex: 20, whiteSpace: 'nowrap' }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    color: 'var(--sidebar-text)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 11,
                    fontWeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{p}</span>
                  <span>£{spent.toLocaleString()} / £{budget.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: labelColor }}>{label}</span>
                </div>
                {/* Arrow */}
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid var(--sidebar-bg)',
                }} />
              </div>
            )
          }

          return (
            <div
              key={p}
              className="relative flex-1 group"
              style={{ height: H }}
            >
              {/* Track + fill (overflow-hidden scoped to this inner div) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: `${tl}px ${tr}px ${br}px ${bl}px`,
                }}
              >
                {fillPct > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${fillPct}%`,
                      backgroundColor: fillColor,
                      borderRadius: `${tl}px 0 0 ${bl}px`,
                    }}
                  />
                )}
              </div>

              {tooltipNode}
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex w-full" style={{ gap: GAP }}>
        {PHASES.map((p, i) => (
          <div key={p} className="flex-1 flex justify-center">
            <span
              className="text-[9px] font-medium"
              style={{ color: p === phase ? COLOR_BRAND : 'var(--text-secondary)' }}
            >
              {p}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
