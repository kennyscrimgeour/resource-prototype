import Avatar from '@/components/ui/Avatar'
import type { Person } from '@/data/people'
import type { Project } from '@/data/projects'

// ── Today ────────────────────────────────────────────────────────────────────

const d = new Date()
const TODAY_ISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── Status logic ──────────────────────────────────────────────────────────────

type CardStatus = 'Available' | 'Allocated' | 'Over-allocated' | 'On Bench'

function getStatus(totalAlloc: number): CardStatus {
  if (totalAlloc > 100) return 'Over-allocated'
  if (totalAlloc === 100) return 'Allocated'
  if (totalAlloc > 0) return 'Available'
  return 'On Bench'
}

// ── Badge styles per status ───────────────────────────────────────────────────

const STATUS_BADGE: Record<CardStatus, { bg: string; border: string; color: string }> = {
  'Available':      { bg: 'var(--success-bg)',     border: 'var(--success-border)',  color: 'var(--success-text)'  },
  'Allocated':      { bg: 'var(--brand-tertiary)',  border: 'var(--brand-secondary)', color: 'var(--text-brand)'    },
  'Over-allocated': { bg: 'var(--error-bg)',        border: 'var(--error-border)',    color: 'var(--error-text)'    },
  'On Bench':       { bg: 'var(--warning-bg)',      border: 'var(--warning-border)',  color: 'var(--warning-text)'  },
}

const STATUS_LABEL: Record<CardStatus, string> = {
  'Available':      'Available',
  'Allocated':      'Allocated',
  'Over-allocated': 'Over-allocated',
  'On Bench':       'On Bench',
}

// ── Segment colour palette ────────────────────────────────────────────────────

const SEGMENT_COLORS = ['#06b6d4', '#8b5cf6', '#f97316', '#10b981']
const OVERLOAD_COLORS = ['#ef4444', '#b91c1c']

// ── Segmented allocation bar ──────────────────────────────────────────────────

interface Segment { color: string; pct: number }

function AllocBar({ segments }: { segments: Segment[] }) {
  return (
    <div
      style={{
        display: 'flex', gap: 2, height: 8, borderRadius: 2,
        backgroundColor: '#e4e4e6', overflow: 'hidden', width: '100%', flexShrink: 0,
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

interface PersonCardProps {
  person:   Person
  projects: Project[]
  onOpen?:  () => void
}

export default function PersonCard({ person, projects, onOpen }: PersonCardProps) {
  // Derive active assignments (not rolled off) from the source-of-truth assignments array
  const activeAssignments = person.assignments.filter(a => a.endDate >= TODAY_ISO)

  // Total allocation across all active projects
  const totalAlloc = activeAssignments.reduce((sum, a) => sum + a.allocationPct, 0)

  const status       = getStatus(totalAlloc)
  const badge        = STATUS_BADGE[status]
  const isOverloaded = status === 'Over-allocated'
  const isBench      = status === 'On Bench'
  const isAvailable  = status === 'Available'

  // Resolve project name + client for each active assignment
  const activeRows = activeAssignments.map((asgn, i) => {
    const proj = projects.find(p => p.id === asgn.projectId)
    return { asgn, name: proj?.name ?? asgn.projectId, client: proj?.client ?? '', colorIdx: i }
  })

  // Build bar segments — each assignment gets a segment proportional to its allocationPct
  const segments: Segment[] = activeRows.map(({ asgn, colorIdx }) => ({
    color: isOverloaded
      ? OVERLOAD_COLORS[colorIdx % OVERLOAD_COLORS.length]
      : SEGMENT_COLORS[colorIdx % SEGMENT_COLORS.length],
    pct: asgn.allocationPct,
  }))

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
      className="flex flex-col gap-3 relative rounded-[10px] card-interactive"
      style={{
        background: 'radial-gradient(ellipse at top center, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
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
        {STATUS_LABEL[status]}
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
          activeRows.map(({ asgn, name, client, colorIdx }) => (
            <div key={asgn.projectId} className="flex items-center justify-between gap-2 text-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </span>
                <span className="flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {client}
                </span>
              </div>
              <span className="font-bold flex-shrink-0" style={{ color: pctColor(colorIdx) }}>
                {asgn.allocationPct}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
