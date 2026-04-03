'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Project } from '@/data/projects'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import BudgetBar from '@/components/ui/BudgetBar'
import PhaseProgressBar from '@/components/ui/PhaseProgressBar'
import AddResourcePopup from './AddResourcePopup'

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad)
  const db = new Date(by, bm - 1, bd)
  return (db.getTime() - da.getTime()) / 86_400_000
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  'Healthy':          'success',
  'At risk':          'warning',
  'Attention needed': 'error',
}

interface ProjectDialogProps {
  project: Project
  onClose: () => void
}

export default function ProjectDialog({ project, onClose }: ProjectDialogProps) {
  const { people, removeAssignment } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showAdd) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, showAdd])

  const assigned = people.filter(p => p.assignments.some(a => a.projectId === project.id))

  const projDays = Math.max(1, daysBetween(project.startDate, project.endDate))

  function ganttBar(startDate: string, endDate: string) {
    const leftPct  = Math.max(0, daysBetween(project.startDate, startDate)) / projDays * 100
    const endFrac  = Math.min(projDays, daysBetween(project.startDate, endDate)) / projDays * 100
    return { leftPct, widthPct: Math.max(2, endFrac - leftPct) }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 51,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: 880, maxHeight: '90vh',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-primary)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} size="sm">{project.status}</Badge>
                  <Badge variant="default" size="sm">{project.sector}</Badge>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  {project.name}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {project.client}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  flexShrink: 0, width: 32, height: 32,
                  borderRadius: 8, border: '1px solid var(--border-primary)',
                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
          </div>

          {/* ── Stats strip ────────────────────────────────────────── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            padding: '16px 24px', gap: 24,
            borderBottom: '1px solid var(--border-primary)',
            flexShrink: 0,
          }}>
            {/* Phase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Phase</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{project.phase}</span>
                <Badge variant="default" size="sm">{project.phaseProgress}</Badge>
              </div>
              <PhaseProgressBar phase={project.phase} progress={project.phaseProgress} />
            </div>

            {/* Budget */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Budget vs Actual</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: project.overBudget ? 'var(--error-text)' : 'var(--text-primary)' }}>
                  {Math.round(project.budgetUsed * 100)}% used
                </span>
                {project.overBudget && <Badge variant="error" size="sm">Over budget</Badge>}
              </div>
              <BudgetBar budgetUsed={project.budgetUsed} overBudget={project.overBudget} budgetOverrun={project.budgetOverrun} />
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Timeline</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(project.startDate)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→ {fmt(project.endDate)}</span>
            </div>

            {/* Team */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Team</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: assigned.length > project.capacity ? 'var(--error-text)' : 'var(--text-primary)' }}>
                {assigned.length} / {project.capacity} allocated
              </span>
              <div style={{ display: 'flex' }}>
                {assigned.slice(0, 7).map((p, i) => (
                  <Avatar
                    key={p.id}
                    initials={p.initials}
                    size="xs"
                    colorIndex={p.colorIndex ?? i}
                    style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 7 - i, outline: '2px solid var(--bg-primary)' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Resources ──────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px 12px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Resources
                </span>
                <Badge variant="default" size="sm">{assigned.length}</Badge>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 32, padding: '0 14px', borderRadius: 8,
                  backgroundColor: '#06b6d4', border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff',
                }}
              >
                + Add Resource
              </button>
            </div>

            {/* Column labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 64px 1fr 148px 36px',
              gap: 12, padding: '0 24px 8px',
              flexShrink: 0,
            }}>
              {['', 'Person', 'Alloc', 'Project span', 'Dates', ''].map((label, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Resource rows */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
              {assigned.length === 0 && (
                <p style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                  No resources assigned yet.
                </p>
              )}

              {assigned.map(person => {
                const asgn = person.assignments.find(a => a.projectId === project.id)!
                const { leftPct, widthPct } = ganttBar(asgn.startDate, asgn.endDate)

                return (
                  <div
                    key={person.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr 64px 1fr 148px 36px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 24px',
                      borderTop: '1px solid var(--border-tertiary)',
                    }}
                  >
                    <Avatar initials={person.initials} size="xs" colorIndex={person.colorIndex ?? 0} />

                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {person.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {person.role}
                      </p>
                    </div>

                    <Badge variant={asgn.allocationPct > 100 ? 'error' : 'default'} size="sm">
                      {asgn.allocationPct}%
                    </Badge>

                    {/* Mini Gantt bar */}
                    <div style={{ position: 'relative', height: 8, backgroundColor: 'var(--bg-tertiary)', borderRadius: 1 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: 0, height: '100%',
                          backgroundColor: '#06b6d4',
                          borderRadius: 1,
                        }}
                      />
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>{fmt(asgn.startDate)}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>→ {fmt(asgn.endDate)}</p>
                    </div>

                    <button
                      onClick={() => removeAssignment(person.id, project.id)}
                      title="Remove from project"
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'transparent', color: 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showAdd && <AddResourcePopup project={project} onClose={() => setShowAdd(false)} />}
    </>
  )
}
