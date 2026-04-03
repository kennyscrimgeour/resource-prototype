import Avatar from '@/components/ui/Avatar'
import { projects as allProjects } from '@/data/projects'
import type { Person } from '@/data/people'

// ── Status logic ──────────────────────────────────────────────────────────────

type CardStatus = 'Available' | 'Allocated' | 'Overloaded' | 'Bench'

function getStatus(person: Person): CardStatus {
  if (!person.projects || person.projects.length === 0) return 'Bench'
  if (person.utilizationPct > 100) return 'Overloaded'
  if (person.utilizationPct < 80)  return 'Available'
  return 'Allocated'
}

// ── Badge styles per status ───────────────────────────────────────────────────

const STATUS_BADGE: Record<CardStatus, { bg: string; border: string; color: string }> = {
  Available:  { bg: 'var(--success-bg)',    border: 'var(--success-border)',  color: 'var(--success-text)'  },
  Allocated:  { bg: 'var(--brand-tertiary)',border: 'var(--brand-secondary)', color: 'var(--text-brand)'    },
  Overloaded: { bg: 'var(--error-bg)',      border: 'var(--error-border)',    color: 'var(--error-text)'    },
  Bench:      { bg: 'var(--warning-bg)',    border: 'var(--warning-border)',  color: 'var(--warning-text)'  },
}

// ── Segment colour palette (normal utilisation, cycling per project) ───────────

const SEGMENT_COLORS = [
  '#06b6d4', // cyan  — project 1
  '#8b5cf6', // violet — project 2
  '#f97316', // orange — project 3
  '#10b981', // emerald — project 4
]

// Overloaded uses two red shades
const OVERLOAD_COLORS = ['#ef4444', '#b91c1c']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClient(projectName: string): string {
  return allProjects.find(p => p.name === projectName)?.client ?? ''
}

// ── Segmented allocation bar ──────────────────────────────────────────────────

interface Segment { color: string; pct: number }

function AllocBar({ segments }: { segments: Segment[] }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        height: 8,
        borderRadius: 2,
        backgroundColor: '#e4e4e6',
        overflow: 'hidden',
        width: '100%',
        flexShrink: 0,
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            height: '100%',
            width: `${seg.pct}%`,
            backgroundColor: seg.color,
            flexShrink: 0,
            borderRadius:
              segments.length === 1 ? 2
              : i === 0             ? '2px 0 0 2px'
              : i === segments.length - 1 ? '0 2px 2px 0'
              : 0,
          }}
        />
      ))}
    </div>
  )
}

// ── PersonCard ────────────────────────────────────────────────────────────────

export default function PersonCard({ person, onOpen }: { person: Person; onOpen?: () => void }) {
  const status       = getStatus(person)
  const badge        = STATUS_BADGE[status]
  const projectList  = person.projects ?? []
  const isOverloaded = status === 'Overloaded'
  const isBench      = status === 'Bench'
  const isAvailable  = status === 'Available'

  // Distribute utilisation evenly across projects
  const perProjectPct = projectList.length > 0
    ? Math.round(person.utilizationPct / projectList.length)
    : 0

  // Build bar segments
  const segments: Segment[] = isOverloaded
    ? projectList.map((_, i) => ({ color: OVERLOAD_COLORS[i % OVERLOAD_COLORS.length], pct: perProjectPct }))
    : projectList.map((_, i) => ({ color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],   pct: perProjectPct }))

  // % label colour per project row
  function pctColor(i: number): string {
    if (isBench)      return 'var(--warning-text)'
    if (isOverloaded) return 'var(--error-text)'
    if (isAvailable)  return 'var(--success-text)'
    return SEGMENT_COLORS[i % SEGMENT_COLORS.length]
  }

  const visibleSkills = person.skills.slice(0, 3)
  const skillOverflow = person.skills.length - 3

  return (
    <div
      className="flex flex-col gap-3 relative rounded-[10px]"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-primary)',
        padding: 16,
        cursor: onOpen ? 'pointer' : 'default',
      }}
      onClick={onOpen}
    >
      {/* Status badge — absolute top-right */}
      <div
        className="absolute flex items-center justify-center px-1.5 rounded text-[10px] font-medium"
        style={{
          top: 15, right: 15, height: 18,
          backgroundColor: badge.bg,
          border: `1px solid ${badge.border}`,
          color: badge.color,
        }}
      >
        {isOverloaded ? `${person.utilizationPct}%` : status === 'Bench' ? 'On Bench' : status}
      </div>

      {/* Header: avatar + name + role */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <Avatar initials={person.initials} size="md" colorIndex={person.colorIndex} />
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {person.name}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {person.role}
          </p>
        </div>
      </div>

      {/* Skills chips */}
      <div className="flex flex-wrap gap-1">
        {person.dayRate != null && (
          <span
            className="flex items-center justify-center px-1.5 rounded text-[10px] font-medium"
            style={{
              height: 18,
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
            }}
          >
            £{person.dayRate.toLocaleString()}
          </span>
        )}
        {visibleSkills.map(s => (
          <span
            key={s.label}
            className="flex items-center justify-center px-1.5 rounded text-[10px] font-medium"
            style={{
              height: 18,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            {s.label}
          </span>
        ))}
        {skillOverflow > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>+{skillOverflow}</span>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'var(--border-primary)' }} />

      {/* Current projects label */}
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Current projects</p>

      {/* Allocation bar */}
      {isBench
        ? <div style={{ height: 8, borderRadius: 2, backgroundColor: '#e4e4e6', width: '100%', flexShrink: 0 }} />
        : <AllocBar segments={segments} />
      }

      {/* Project rows */}
      <div className="flex flex-col gap-2">
        {isBench ? (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>—</span>
            <span className="font-medium" style={{ color: 'var(--warning-text)' }}>0%</span>
          </div>
        ) : (
          projectList.map((projName, i) => (
            <div key={projName} className="flex items-center justify-between gap-2 text-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {projName}
                </span>
                <span className="flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {getClient(projName)}
                </span>
              </div>
              <span className="font-bold flex-shrink-0" style={{ color: pctColor(i) }}>
                {perProjectPct}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
