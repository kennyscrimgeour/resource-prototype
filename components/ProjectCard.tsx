import type { Project, ProjectStatus } from '@/data/projects'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import BudgetBar from '@/components/ui/BudgetBar'
import PhaseProgressBar from '@/components/ui/PhaseProgressBar'

const statusBadge: Record<ProjectStatus, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  'Healthy':          { variant: 'success', label: 'Healthy' },
  'At risk':          { variant: 'warning', label: 'At risk' },
  'Attention needed': { variant: 'error',   label: 'Attention needed' },
}

export default function ProjectCard({ project, onOpen, onOpenPerson }: { project: Project; onOpen?: () => void; onOpenPerson?: (initials: string) => void }) {
  const { variant, label } = statusBadge[project.status]
  const isOverAllocated    = project.allocated > project.capacity
  const allocationColor    = isOverAllocated ? 'var(--error-text)' : 'var(--text-secondary)'

  // Show exactly `allocated` avatars, cycling through team if needed
  const avatarSlots = Array.from({ length: project.allocated }, (_, i) => {
    const member = project.team[i % project.team.length]
    return { initials: member.initials, colorIndex: member.colorIndex ?? i }
  })

  return (
    <div
      className="flex flex-col rounded-xl border p-5 gap-3"
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', cursor: onOpen ? 'pointer' : 'default' }}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-base leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
            {project.name}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {project.client}
          </p>
        </div>
        <Badge variant={variant} size="sm" className="flex-shrink-0 mt-0.5">{label}</Badge>
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Phase progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Phase progress</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{project.dueDate}</span>
        </div>
        <PhaseProgressBar phase={project.phase} progress={project.phaseProgress} />
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Budget vs Actual */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Budget vs Actual</span>
          {project.warningText && (
            <span className="text-[11px] truncate text-right" style={{ color: 'var(--warning-text)' }}>
              ⚠ {project.warningText}
            </span>
          )}
        </div>
        <BudgetBar
          budgetUsed={project.budgetUsed}
          overBudget={project.overBudget}
          budgetOverrun={project.budgetOverrun}
        />
      </div>

      <div className="h-px" style={{ backgroundColor: 'var(--border-primary)' }} />

      {/* Allocation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {avatarSlots.map((a, i) => (
            <Avatar
              key={i}
              initials={a.initials}
              size="xs"
              colorIndex={a.colorIndex}
              style={{
                marginLeft: i > 0 ? -6 : 0,
                zIndex: avatarSlots.length - i,
                outline: '2px solid var(--bg-primary)',
                cursor: onOpenPerson ? 'pointer' : 'default',
              }}
              onClick={onOpenPerson ? (e) => { e.stopPropagation(); onOpenPerson(a.initials) } : undefined}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium" style={{ color: allocationColor }}>
          {project.allocated} / {project.capacity} allocated
        </span>
      </div>
    </div>
  )
}
