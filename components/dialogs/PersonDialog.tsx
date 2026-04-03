'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Person } from '@/data/people'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import AddToProjectPopup from './AddToProjectPopup'

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAvail(from?: string): string {
  if (!from || from === 'now') return 'Available now'
  const [y, m, d] = from.split('-').map(Number)
  return `Free from ${new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// Project colour by ID (same palette as Timeline)
const PROJECT_HEX: Record<string, string> = {
  '1': '#06b6d4', '2': '#10b981', '3': '#8b5cf6',
  '4': '#f97316', '5': '#06b6d4', '6': '#8b5cf6',
  '7': '#10b981', '8': '#f97316', '9': '#06b6d4',
  '10': '#8b5cf6', '11': '#10b981',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function statusBadge(person: Person): { variant: 'success' | 'warning' | 'error' | 'brand'; label: string } {
  if (!person.projects || person.projects.length === 0) return { variant: 'warning', label: 'On Bench' }
  if (person.utilizationPct > 100) return { variant: 'error', label: `${person.utilizationPct}% — Overloaded` }
  if (person.utilizationPct < 80)  return { variant: 'success', label: 'Available' }
  return { variant: 'brand', label: 'Allocated' }
}

// ── Utilisation bar ───────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color = pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--bg-tertiary)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${clamped}%`, backgroundColor: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{pct}%</span>
    </div>
  )
}

// ── Dialog ────────────────────────────────────────────────────────────────────

interface PersonDialogProps {
  person: Person
  onClose: () => void
}

export default function PersonDialog({ person, onClose }: PersonDialogProps) {
  const { projects, removeAssignment } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showAdd) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, showAdd])

  const { variant, label } = statusBadge(person)
  const visibleSkills = person.skills.slice(0, 5)
  const skillOverflow = person.skills.length - 5

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
            width: '100%', maxWidth: 860, maxHeight: '90vh',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Avatar initials={person.initials} size="md" colorIndex={person.colorIndex ?? 0} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {person.name}
                    </h2>
                    <Badge variant={variant} size="sm">{label}</Badge>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{person.role}</p>
                </div>
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
            borderBottom: '1px solid var(--border-primary)', flexShrink: 0,
          }}>
            {/* Utilisation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Utilisation</span>
              <UtilBar pct={person.utilizationPct} />
            </div>

            {/* Skills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Skills</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {visibleSkills.map(s => (
                  <Badge key={s.label} variant="default" size="sm">{s.label}</Badge>
                ))}
                {skillOverflow > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', alignSelf: 'center' }}>+{skillOverflow}</span>
                )}
              </div>
            </div>

            {/* Availability */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Availability</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: !person.availableFrom || person.availableFrom === 'now' ? 'var(--success-text)' : 'var(--text-primary)',
              }}>
                {fmtAvail(person.availableFrom)}
              </span>
            </div>

            {/* Day rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Day rate</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {person.dayRate != null ? `£${person.dayRate.toLocaleString()}` : '—'}
              </span>
            </div>
          </div>

          {/* ── Assignments ─────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 24px 12px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Assignments
                </span>
                <Badge variant="default" size="sm">{person.assignments.length}</Badge>
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
                + Add to Project
              </button>
            </div>

            {/* Column labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '12px 1fr 64px 1fr 148px 36px',
              gap: 12, padding: '0 24px 8px', flexShrink: 0,
            }}>
              {['', 'Project', 'Alloc', 'Project span', 'Dates', ''].map((label, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Assignment rows */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
              {person.assignments.length === 0 && (
                <p style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>
                  No assignments yet.
                </p>
              )}

              {person.assignments.map((asgn, i) => {
                const proj = projects.find(p => p.id === asgn.projectId)
                if (!proj) return null

                const projDays  = Math.max(1, daysBetween(proj.startDate, proj.endDate))
                const leftPct   = Math.max(0, daysBetween(proj.startDate, asgn.startDate)) / projDays * 100
                const endFrac   = Math.min(projDays, daysBetween(proj.startDate, asgn.endDate)) / projDays * 100
                const widthPct  = Math.max(2, endFrac - leftPct)
                const barColor  = PROJECT_HEX[asgn.projectId] ?? '#06b6d4'

                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '12px 1fr 64px 1fr 148px 36px',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 24px',
                      borderTop: '1px solid var(--border-tertiary)',
                    }}
                  >
                    {/* Project colour swatch */}
                    <div style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: barColor, justifySelf: 'center' }} />

                    {/* Project name + client */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {proj.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {proj.client}
                      </p>
                    </div>

                    <Badge variant={asgn.allocationPct > 100 ? 'error' : 'default'} size="sm">
                      {asgn.allocationPct}%
                    </Badge>

                    {/* Mini Gantt bar */}
                    <div style={{ position: 'relative', height: 8, backgroundColor: 'var(--bg-tertiary)', borderRadius: 1 }}>
                      <div
                        style={{
                          position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`,
                          top: 0, height: '100%', backgroundColor: barColor, borderRadius: 1,
                        }}
                      />
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>{fmt(asgn.startDate)}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>→ {fmt(asgn.endDate)}</p>
                    </div>

                    <button
                      onClick={() => removeAssignment(person.id, asgn.projectId)}
                      title="Remove assignment"
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

      {showAdd && <AddToProjectPopup person={person} onClose={() => setShowAdd(false)} />}
    </>
  )
}
