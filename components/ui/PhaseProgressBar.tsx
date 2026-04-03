import type { ProjectPhase, PhaseProgress } from '@/data/projects'

const PHASES: ProjectPhase[] = ['Discovery', 'Design', 'Build', 'UAT', 'Live']
const PROGRESS_PCT: Record<PhaseProgress, number> = { Early: 0.2, Mid: 0.5, Late: 0.85 }

const GAP   = 3
const H     = 8
const R_OUT = 1

interface PhaseProgressBarProps {
  phase: ProjectPhase
  progress: PhaseProgress
}

export default function PhaseProgressBar({ phase, progress }: PhaseProgressBarProps) {
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

          return (
            <div
              key={p}
              className="relative flex-1 overflow-hidden"
              style={{
                height: H,
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: `${tl}px ${tr}px ${br}px ${bl}px`,
              }}
            >
              {fillPct > 0 && (
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: 'var(--brand-primary)',
                    borderRadius: `${tl}px 0 0 ${bl}px`,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels — each centered below its segment */}
      <div className="flex w-full" style={{ gap: GAP }}>
        {PHASES.map((p, i) => (
          <div key={p} className="flex-1 flex justify-center">
            <span
              className="text-[9px] font-medium"
              style={{ color: p === phase ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
            >
              {p}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
