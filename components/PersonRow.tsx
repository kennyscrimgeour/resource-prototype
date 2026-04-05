import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import type { Person, Skill } from '@/data/people'
import type { Project } from '@/data/projects'

export type { Person, Skill }

const _d = new Date()
const TODAY_ISO = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

interface PersonRowProps {
  person:      Person
  projects?:   Project[]
  showDayRate?: boolean
  onAction?: (person: Person) => void
  onOpen?: () => void
}

// ── Inline utilization bar ────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const isOver = pct > 100
  const isWarn = pct >= 80 && !isOver

  const fillColor = isOver
    ? 'var(--error-text)'
    : isWarn
    ? 'var(--warning-text)'
    : 'var(--success-text)'

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div
        className="h-[3px] w-14 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'var(--border-secondary)' }}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>
      <span
        className="text-[10px] font-medium tabular-nums flex-shrink-0"
        style={{ color: fillColor }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ── Skills chips — max 2 visible + overflow count ─────────────────────────────

function SkillChips({ skills }: { skills: Skill[] }) {
  const visible = skills.slice(0, 2)
  const overflow = skills.length - 2

  return (
    <div className="flex items-center gap-1 min-w-0">
      {visible.map((s) => (
        <Badge key={s.label} size="sm" variant="default">
          {s.label}
        </Badge>
      ))}
      {overflow > 0 && (
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

// ── Availability label ────────────────────────────────────────────────────────

function AvailLabel({ from }: { from?: string }) {
  if (!from) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>

  if (from === 'now') {
    return (
      <span className="text-[10px] font-medium" style={{ color: 'var(--success-text)' }}>
        Available now
      </span>
    )
  }

  const date = new Date(from)
  const formatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
      Free {formatted}
    </span>
  )
}

// ── PersonRow ─────────────────────────────────────────────────────────────────

export default function PersonRow({ person, projects = [], showDayRate = false, onAction, onOpen }: PersonRowProps) {
  const activeAssignments = person.assignments.filter(a => a.endDate >= TODAY_ISO)
  const totalAlloc        = activeAssignments.reduce((sum, a) => sum + a.allocationPct, 0)
  const isUnallocated     = totalAlloc === 0
  const primaryProject    = activeAssignments[0]
    ? (projects.find(p => p.id === activeAssignments[0].projectId)?.name ?? activeAssignments[0].projectId)
    : undefined
  const extraProjects = Math.max(0, activeAssignments.length - 1)

  return (
    <div
      className="flex items-center h-8 px-3 gap-4 text-xs select-none border-b"
      style={{
        borderColor: 'var(--border-secondary)',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--bg-primary)',
        cursor: onOpen ? 'pointer' : 'default',
      }}
      onClick={onOpen}
    >
      {/* Name — 180px */}
      <div className="flex items-center gap-2 w-[180px] flex-shrink-0 min-w-0">
        <Avatar initials={person.initials} size="xs" colorIndex={person.colorIndex} />
        <span className="truncate font-medium leading-none">{person.name}</span>
      </div>

      {/* Role — 128px */}
      <div
        className="w-32 flex-shrink-0 truncate leading-none"
        style={{ color: 'var(--text-secondary)' }}
      >
        {person.role}
      </div>

      {/* Skills — 160px */}
      <div className="w-40 flex-shrink-0 flex items-center gap-1">
        {person.dayRate != null && (
          <span
            className="flex items-center justify-center px-1.5 rounded text-[10px] font-medium flex-shrink-0"
            style={{
              height: 16,
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
            }}
          >
            £{person.dayRate.toLocaleString()}
          </span>
        )}
        <SkillChips skills={person.skills} />
      </div>

      {/* Utilization — 100px */}
      <div className="w-[100px] flex-shrink-0">
        <UtilBar pct={totalAlloc} />
      </div>

      {/* Project — flex-1 */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {isUnallocated ? (
          <Badge variant="warning" size="sm">Unallocated</Badge>
        ) : (
          <>
            <span className="truncate leading-none" style={{ color: 'var(--text-secondary)' }}>
              {primaryProject}
            </span>
            {extraProjects > 0 && (
              <Badge variant="default" size="sm" className="flex-shrink-0">+{extraProjects}</Badge>
            )}
          </>
        )}
      </div>

      {/* Availability — 96px */}
      <div className="w-24 flex-shrink-0">
        <AvailLabel from={person.availableFrom} />
      </div>

      {/* Day Rate — 64px, optional */}
      {showDayRate && (
        <div
          className="w-16 flex-shrink-0 text-right tabular-nums leading-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          {person.dayRate != null
            ? `£${person.dayRate.toLocaleString()}`
            : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
        </div>
      )}

      {/* Actions — 32px */}
      {onAction && (
        <button
          className="w-8 flex-shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={() => onAction(person)}
          aria-label={`Actions for ${person.name}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      )}
    </div>
  )
}
