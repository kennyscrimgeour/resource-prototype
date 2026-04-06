'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { PersonDialogDraftItem } from '@/lib/store'
import type { Person, Assignment } from '@/data/people'
import { businessDaysBetween } from '@/lib/budget'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import AddToProjectPopup from './AddToProjectPopup'
import { ChevronLeft } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
  '1': '#06b6d4', '2': '#10b981', '3': '#8b5cf6', '4': '#f97316',
  '5': '#06b6d4', '6': '#8b5cf6', '7': '#10b981', '8': '#f97316',
  '9': '#06b6d4', '10': '#8b5cf6', '11': '#10b981',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type DraftEntry = PersonDialogDraftItem

interface GanttDragState {
  projectId:     string
  handle:        'left' | 'right' | 'move'
  startX:        number
  baseLeftPct:   number
  baseWidthPct:  number
  baseStartISO:  string
  baseEndISO:    string
  containerWidth: number
  projDays:      number
  projStartISO:  string
}

interface LiveOverride {
  projectId: string
  startDate: string
  endDate:   string
  mouseX:    number
  mouseY:    number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}/${m}`
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function pctToISO(pct: number, projStartISO: string, projDays: number): string {
  const [sy, sm, sd] = projStartISO.split('-').map(Number)
  const ms = new Date(sy, sm - 1, sd).getTime() + (pct / 100) * projDays * 86_400_000
  const d  = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function projCostCalc(dayRate: number, allocationPct: number, startISO: string, endISO: string): number {
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [ey, em, ed] = endISO.split('-').map(Number)
  const s  = new Date(sy, sm - 1, sd)
  const e2 = new Date(ey, em - 1, ed); e2.setDate(e2.getDate() + 1)
  return Math.round(dayRate * (allocationPct / 100) * businessDaysBetween(s, e2))
}

// ── Layout constants ───────────────────────────────────────────────────────────

const COLS = '12px minmax(0,1fr) 140px 2fr 88px 32px'

const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: COLS,
  alignItems: 'center',
  gap: 10,
  padding: '9px 24px',
  borderTop: '1px solid var(--border-tertiary)',
}

const ACTION_BTN: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--border-primary)',
  backgroundColor: 'transparent', color: 'var(--text-secondary)',
  cursor: 'pointer', fontSize: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const GANTT_H = 24

// ── Utilisation bar ────────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const clamped   = Math.min(pct, 100)
  const isOver    = pct > 100
  const isWarn    = pct >= 80 && !isOver
  const fillColor = isOver ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981'
  return (
    <div style={{ position: 'relative', width: '100%', height: 8, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        height: '100%', width: `${clamped}%`,
        backgroundColor: fillColor, borderRadius: 4,
        transition: 'width 0.2s ease',
      }} />
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface PersonDialogProps {
  person:                Person
  onClose:               () => void
  canGoBack?:            boolean
  onBack?:               () => void
  onNavigateToProject?:  (projectId: string) => void
  globalDirtyCount?:     number
}

export default function PersonDialog({
  person, onClose,
  canGoBack = false, onBack,
  onNavigateToProject,
  globalDirtyCount = 0,
}: PersonDialogProps) {
  const {
    projects,
    recordTimelineDraft, timelineDrafts,
    personDialogDrafts, setPersonDialogDraft, clearPersonDialogDraft,
    applyAllDialogDrafts, discardAllDialogDrafts,
  } = useStore()

  const todayISO = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  const todayISORef = useRef(todayISO)

  // ── Draft state — restore parked draft if user navigated back ────────────
  const [draft, setDraft] = useState<DraftEntry[]>(() => {
    const parked = personDialogDrafts.get(person.id)
    if (parked) return parked.draft
    return person.assignments.map(a => {
      const tlDraft = timelineDrafts.get(`${person.id}:${a.projectId}`)
      return {
        projectId:  a.projectId,
        assignment: tlDraft ? { ...a, startDate: tlDraft.startDate, endDate: tlDraft.endDate } : { ...a },
      }
    })
  })

  const [committed] = useState<DraftEntry[]>(() => {
    const parked = personDialogDrafts.get(person.id)
    if (parked) return parked.committed
    return person.assignments.map(a => ({ projectId: a.projectId, assignment: { ...a } }))
  })

  const [everEdited,    setEverEdited]    = useState(false)
  const [showAdd,       setShowAdd]       = useState(false)
  const [showExitGuard, setShowExitGuard] = useState(false)

  const isDirty = everEdited || JSON.stringify(draft) !== JSON.stringify(committed)
  // Footer shows if THIS dialog is dirty OR other dialogs have pending changes
  const showFooter = isDirty || globalDirtyCount > 0

  function attemptClose() {
    if (showFooter) { setShowExitGuard(true); return }
    clearPersonDialogDraft(person.id)
    onClose()
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showExitGuard) { setShowExitGuard(false); return }
      if (showAdd) return
      attemptClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, showAdd, showExitGuard, isDirty])

  // ── Park draft in global store so jumps don't lose state ─────────────────
  useEffect(() => {
    if (isDirty) {
      setPersonDialogDraft(person.id, { draft, committed })
    } else {
      clearPersonDialogDraft(person.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isDirty])

  // ── Sync draft date changes → timeline drafts ─────────────────────────────
  useEffect(() => {
    for (const de of draft) {
      const c = committed.find(x => x.projectId === de.projectId)
      if (!c) continue
      if (de.assignment.startDate !== c.assignment.startDate ||
          de.assignment.endDate   !== c.assignment.endDate) {
        recordTimelineDraft(person.id, de.projectId, de.assignment.startDate, de.assignment.endDate)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // ── Row segregation ───────────────────────────────────────────────────────
  const draftRows = draft
    .map(de => {
      const proj      = projects.find(p => p.id === de.projectId)
      if (!proj) return null
      const c         = committed.find(x => x.projectId === de.projectId)
      const isNew     = !c
      const isChanged = c ? JSON.stringify(c.assignment) !== JSON.stringify(de.assignment) : false
      return { de, proj, isNew, isChanged }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.de.assignment.endDate >= todayISO)

  const pastRows = draft
    .map(de => {
      const proj = projects.find(p => p.id === de.projectId)
      if (!proj) return null
      return { de, proj }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.de.assignment.endDate < todayISO)

  // ── Live utilisation (from draft) ─────────────────────────────────────────
  const totalAlloc = draftRows.reduce((sum, r) => sum + r.de.assignment.allocationPct, 0)

  const availText = useMemo(() => {
    if (totalAlloc < 100) return 'Available Now'
    const lastEnd = draftRows.reduce((latest, r) =>
      r.de.assignment.endDate > latest ? r.de.assignment.endDate : latest, '')
    return lastEnd ? `Available from ${fmt(addDays(lastEnd, 1))}` : 'Available Now'
  }, [totalAlloc, draftRows])

  // ── Gantt drag ─────────────────────────────────────────────────────────────
  const [liveOverride, setLiveOverride] = useState<LiveOverride | null>(null)
  const ganttDragRef    = useRef<GanttDragState | null>(null)
  const liveOverrideRef = useRef<LiveOverride | null>(null)
  useEffect(() => { liveOverrideRef.current = liveOverride }, [liveOverride])

  const onMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const onUpRef   = useRef<(e: MouseEvent) => void>(() => {})

  useEffect(() => {
    onMoveRef.current = (e: MouseEvent) => {
      const drag = ganttDragRef.current
      if (!drag) return
      const { handle, startX, baseLeftPct, baseWidthPct, containerWidth, projDays, projStartISO, projectId } = drag
      const deltaPct = ((e.clientX - startX) / containerWidth) * 100
      const todayPct = Math.max(0, Math.min(100, daysBetween(projStartISO, todayISORef.current) / projDays * 100))

      let newStartISO = drag.baseStartISO
      let newEndISO   = drag.baseEndISO

      if (handle === 'left') {
        const clamped = Math.max(todayPct, Math.min(baseLeftPct + deltaPct, baseLeftPct + baseWidthPct - 2))
        newStartISO = pctToISO(clamped, projStartISO, projDays)
      } else if (handle === 'right') {
        const clamped = Math.max(todayPct + 2, Math.min(100, baseLeftPct + baseWidthPct + deltaPct))
        newEndISO = pctToISO(clamped, projStartISO, projDays)
      } else {
        const minDelta     = todayPct - baseLeftPct
        const clampedDelta = Math.max(minDelta, Math.min(deltaPct, 100 - baseLeftPct - baseWidthPct))
        newStartISO = pctToISO(baseLeftPct + clampedDelta, projStartISO, projDays)
        newEndISO   = pctToISO(baseLeftPct + baseWidthPct + clampedDelta, projStartISO, projDays)
      }

      setLiveOverride({ projectId, startDate: newStartISO, endDate: newEndISO, mouseX: e.clientX, mouseY: e.clientY })
    }

    onUpRef.current = () => {
      const drag = ganttDragRef.current
      if (!drag) return
      const live = liveOverrideRef.current
      if (live) {
        setDraft(prev => prev.map(de =>
          de.projectId === drag.projectId
            ? { ...de, assignment: { ...de.assignment, startDate: live.startDate, endDate: live.endDate } }
            : de
        ))
        setEverEdited(true)
      }
      ganttDragRef.current = null
      setLiveOverride(null)
    }
  })

  useEffect(() => {
    const onMove = (e: MouseEvent) => onMoveRef.current(e)
    const onUp   = (e: MouseEvent) => onUpRef.current(e)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function startGanttDrag(
    e: React.MouseEvent, projectId: string,
    handle: 'left' | 'right' | 'move',
    asgn: Assignment,
    proj: { startDate: string; endDate: string },
  ) {
    if (handle === 'move' && asgn.startDate < todayISO) return
    e.preventDefault(); e.stopPropagation()
    const cell = (e.currentTarget as HTMLElement).closest('[data-gantt-cell]') as HTMLElement | null
    const containerWidth = cell?.offsetWidth ?? 200
    const projDays = Math.max(1, daysBetween(proj.startDate, proj.endDate))
    const leftPct  = Math.max(0, daysBetween(proj.startDate, asgn.startDate)) / projDays * 100
    const endFrac  = Math.min(projDays, daysBetween(proj.startDate, asgn.endDate)) / projDays * 100
    const widthPct = Math.max(2, endFrac - leftPct)
    ganttDragRef.current = {
      projectId, handle, startX: e.clientX,
      baseLeftPct: leftPct, baseWidthPct: widthPct,
      baseStartISO: asgn.startDate, baseEndISO: asgn.endDate,
      containerWidth, projDays, projStartISO: proj.startDate,
    }
  }

  // ── Draft operations ──────────────────────────────────────────────────────
  function handleDraftUpdateAllocation(projectId: string, allocationPct: number) {
    setDraft(prev => {
      const next = prev.map(de =>
        de.projectId === projectId ? { ...de, assignment: { ...de.assignment, allocationPct } } : de
      )
      // Mark the timeline bar as draft-state so it turns ghost on the Timeline page
      const entry = next.find(de => de.projectId === projectId)
      if (entry) recordTimelineDraft(person.id, projectId, entry.assignment.startDate, entry.assignment.endDate)
      return next
    })
    setEverEdited(true)
  }

  function handleDraftRemove(projectId: string) {
    setDraft(prev => prev.filter(de => de.projectId !== projectId))
    setEverEdited(true)
  }

  function handleApply() {
    // Ensure current dialog's draft is up to date in the global map before applying all
    setPersonDialogDraft(person.id, { draft, committed })
    applyAllDialogDrafts()
    setEverEdited(false)
    onClose()
  }

  function handleDiscard() {
    // Reset this dialog's local state AND clear all global drafts
    setDraft(committed.map(c => ({ ...c, assignment: { ...c.assignment } })))
    setEverEdited(false)
    discardAllDialogDrafts()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={attemptClose}
      />

      {/* Panel — same geometry as ProjectDialog */}
      <div style={{ position: 'fixed', top: '5vh', left: 0, right: 0, zIndex: 51, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div
          style={{
            width: '100%', maxWidth: 1200, maxHeight: '90vh',
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
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {/* Back chevron sits directly left of the name */}
                {canGoBack && (
                      <button
                        onClick={() => { setPersonDialogDraft(person.id, { draft, committed }); onBack?.() }}
                        style={{
                          flexShrink: 0, width: 32, height: 32, borderRadius: '50%', marginLeft: -4,
                          border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-secondary)', transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="Go back"
                      >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                      </button>
                    )}
                <Avatar initials={person.initials} size="md" colorIndex={person.colorIndex ?? 0} />
                <div style={{ minWidth: 0 }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                      {person.name}
                    </h2>
                    {showFooter && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--info-text, #0369a1)', backgroundColor: 'var(--info-bg, #f0f9ff)', border: '1px solid var(--info-border, #bae6fd)', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', marginLeft: 4 }}>
                        Draft
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                    {person.role}
                  </p>
                </div>
              </div>
              <button onClick={attemptClose} style={{ ...ACTION_BTN, flexShrink: 0, width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>✕</button>
            </div>
          </div>

          {/* ── HUD strip — 4 cells ───────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 2fr 2fr', padding: '16px 24px', gap: 20, borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>

            {/* Utilisation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Utilisation</span>
                {liveOverride && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>Live</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  color: totalAlloc > 100 ? 'var(--error-text)' : totalAlloc >= 80 ? 'var(--warning-text)' : 'var(--text-primary)',
                }}>
                  {totalAlloc}%
                </span>
                {totalAlloc > 100 && <Badge variant="error" size="sm">Overloaded</Badge>}
              </div>
              <UtilBar pct={totalAlloc} />
              <span style={{ fontSize: 11, fontWeight: 500, color: totalAlloc < 100 ? 'var(--success-text)' : 'var(--text-secondary)' }}>
                {availText}
              </span>
            </div>

            {/* Skills — horizontal chip row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Skills</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {person.skills.map(s => (
                  <Badge key={s.label} variant="default" size="sm">{s.label}</Badge>
                ))}
              </div>
            </div>

            {/* Day Rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Day Rate</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {person.dayRate != null ? `£${person.dayRate.toLocaleString()}` : '—'}
              </span>
            </div>

            {/* Active projects count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Active Projects</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {draftRows.length}
              </span>
            </div>
          </div>

          {/* ── Project grid ─────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</span>
                <Badge variant="default" size="sm">{draftRows.length}</Badge>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 8, backgroundColor: '#06b6d4', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff' }}
              >
                + Add to Project
              </button>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '0 24px 6px', flexShrink: 0 }}>
              <span />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Span</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</span>
              <span />
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
              {draftRows.length === 0 && (
                <p style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>No active assignments.</p>
              )}

              {draftRows.map(({ de, proj, isNew, isChanged }) => {
                const isDraftRow     = isNew || isChanged
                const isThisDragging = liveOverride?.projectId === de.projectId
                const liveStart      = isThisDragging ? liveOverride!.startDate : de.assignment.startDate
                const liveEnd        = isThisDragging ? liveOverride!.endDate   : de.assignment.endDate

                const projDays = Math.max(1, daysBetween(proj.startDate, proj.endDate))
                const leftPct  = Math.max(0, daysBetween(proj.startDate, liveStart)) / projDays * 100
                const endFrac  = Math.min(projDays, daysBetween(proj.startDate, liveEnd)) / projDays * 100
                const widthPct = Math.max(2, endFrac - leftPct)

                const barColor   = PROJECT_COLORS[de.projectId] ?? '#06b6d4'
                const leftLocked = de.assignment.startDate < todayISO
                const moveLocked = de.assignment.startDate < todayISO

                const rowCost = person.dayRate
                  ? projCostCalc(person.dayRate, de.assignment.allocationPct, liveStart, liveEnd)
                  : null

                const approxBarPx  = widthPct * 4.5
                const showBookends = approxBarPx > 48
                const useShortFmt  = approxBarPx < 120

                const todayPct = Math.max(0, Math.min(100, daysBetween(proj.startDate, todayISO) / projDays * 100))

                return (
                  <div
                    key={de.projectId}
                    style={{
                      ...ROW,
                      backgroundColor: isDraftRow ? 'var(--info-bg, #f0f9ff)' : 'transparent',
                      transition: 'background-color 0.12s',
                    }}
                  >
                    {/* Color swatch */}
                    <div style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: barColor, justifySelf: 'center' }} />

                    {/* Project name + client — click zone for jump */}
                    <div
                      className={onNavigateToProject ? 'dialog-row-hover' : undefined}
                      style={{ minWidth: 0, borderRadius: 4, padding: '2px 4px', margin: '-2px -4px', cursor: onNavigateToProject ? 'pointer' : 'default' }}
                      onClick={() => onNavigateToProject?.(de.projectId)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, minWidth: 0 }}>
                          {proj.name}
                        </p>
                        {isNew && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--info-text, #0369a1)', backgroundColor: 'var(--info-bg, #f0f9ff)', border: '1px solid var(--info-border, #bae6fd)', borderRadius: 3, padding: '1px 4px', textTransform: 'uppercase', flexShrink: 0 }}>New</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {proj.client}
                      </p>
                    </div>

                    {/* Allocation slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <input
                        type="range" min={5} max={100} step={5}
                        value={Math.min(de.assignment.allocationPct, 100)}
                        onChange={e => handleDraftUpdateAllocation(de.projectId, Number(e.target.value))}
                        className="alloc-slider"
                        style={{ flex: 1, minWidth: 0, '--slider-pct': `${((Math.min(de.assignment.allocationPct, 100) - 5) / 95) * 100}%`, '--slider-fill': barColor } as React.CSSProperties}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 26, textAlign: 'right', flexShrink: 0, color: 'var(--text-secondary)' }}>
                        {de.assignment.allocationPct}%
                      </span>
                    </div>

                    {/* Mini-Gantt */}
                    <div
                      data-gantt-cell
                      style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {/* Today line */}
                      {todayPct > 0 && todayPct < 100 && (
                        <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--neutral-darkest, #18181b)', zIndex: 2, pointerEvents: 'none', borderRadius: 1 }} />
                      )}

                      {/* Fill bar */}
                      <div
                        style={{
                          position: 'absolute', zIndex: 1,
                          left: `${leftPct}%`, width: `${widthPct}%`,
                          top: 0, height: '100%',
                          backgroundColor: isDraftRow ? `color-mix(in srgb, ${barColor} 20%, transparent)` : barColor,
                          border: isDraftRow ? `1px solid ${barColor}` : 'none',
                          borderRadius: 4,
                          boxSizing: 'border-box',
                          boxShadow: isThisDragging ? `0 0 0 2px ${barColor}40` : 'none',
                          overflow: 'hidden',
                        }}
                      >
                        {showBookends && (
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: isDraftRow ? barColor : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1 }}>
                            {useShortFmt ? fmtShort(liveStart) : fmt(liveStart)}
                          </span>
                        )}
                        {showBookends && (
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: isDraftRow ? barColor : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1 }}>
                            {useShortFmt ? fmtShort(liveEnd) : fmt(liveEnd)}
                          </span>
                        )}
                        {/* Left handle */}
                        {!leftLocked && (
                          <div
                            onMouseDown={e => startGanttDrag(e, de.projectId, 'left', de.assignment, proj)}
                            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: isDraftRow ? barColor : 'rgba(255,255,255,0.55)' }} />
                          </div>
                        )}
                        {/* Move handle */}
                        {!moveLocked && (
                          <div
                            onMouseDown={e => startGanttDrag(e, de.projectId, 'move', de.assignment, proj)}
                            style={{ position: 'absolute', left: 8, right: 8, top: 0, bottom: 0, cursor: 'grab', zIndex: 2 }}
                          />
                        )}
                        {/* Right handle */}
                        <div
                          onMouseDown={e => startGanttDrag(e, de.projectId, 'right', de.assignment, proj)}
                          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: isDraftRow ? barColor : 'rgba(255,255,255,0.55)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Cost */}
                    <div style={{ textAlign: 'right' }}>
                      {rowCost != null ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          £{rowCost.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </div>

                    <button onClick={() => handleDraftRemove(de.projectId)} title="Remove" style={ACTION_BTN}>✕</button>
                  </div>
                )
              })}

              {/* ── Past projects ledger ────────────────────────────── */}
              {pastRows.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', borderTop: '1px solid var(--border-tertiary)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                      ▾ Past Projects
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      {pastRows.length}
                    </span>
                  </div>

                  {pastRows.map(({ de, proj }) => {
                    const projDays = Math.max(1, daysBetween(proj.startDate, proj.endDate))
                    const leftPct  = Math.max(0, daysBetween(proj.startDate, de.assignment.startDate)) / projDays * 100
                    const endFrac  = Math.min(projDays, daysBetween(proj.startDate, de.assignment.endDate)) / projDays * 100
                    const widthPct = Math.max(2, endFrac - leftPct)
                    const barColor = PROJECT_COLORS[de.projectId] ?? '#06b6d4'
                    const rowCost  = person.dayRate ? projCostCalc(person.dayRate, de.assignment.allocationPct, de.assignment.startDate, de.assignment.endDate) : null
                    return (
                      <div key={`past-${de.projectId}`} style={{ ...ROW, opacity: 0.6 }}>
                        <div style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: barColor, justifySelf: 'center' }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{proj.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{proj.client}</p>
                        </div>
                        <Badge variant="default" size="sm">{de.assignment.allocationPct}%</Badge>
                        <div style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}>
                          <div style={{ position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`, top: 0, height: '100%', backgroundColor: barColor, borderRadius: 4, overflow: 'hidden' }}>
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(de.assignment.startDate)}</span>}
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(de.assignment.endDate)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {rowCost != null
                            ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>£{rowCost.toLocaleString()}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>}
                        </div>
                        <div style={{ ...ACTION_BTN, cursor: 'default', opacity: 0.35, fontSize: 11 }}>🔒</div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Apply / Discard footer ────────────────────────────────── */}
          {showFooter && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--info-border, #bae6fd)', backgroundColor: 'var(--info-bg, #f0f9ff)', flexShrink: 0, gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--info-text, #0369a1)', fontWeight: 500 }}>
                {globalDirtyCount > 0 ? `${globalDirtyCount} unsaved change${globalDirtyCount !== 1 ? 's' : ''} across dialogs` : 'Unsaved changes'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDiscard} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--info-border, #bae6fd)', backgroundColor: 'transparent', color: 'var(--info-text, #0369a1)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Discard All</button>
                <button onClick={handleApply} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: '#06b6d4', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Apply All</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Exit guard ───────────────────────────────────────────────── */}
      {showExitGuard && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowExitGuard(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '24px 28px', width: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Unsaved changes</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                You have draft changes that haven't been applied. Leaving now will discard them.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowExitGuard(false)} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Keep editing</button>
              <button onClick={() => { discardAllDialogDrafts(); onClose() }} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: 'var(--error-text, #ef4444)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Discard &amp; close</button>
            </div>
          </div>
        </>
      )}

      {/* ── Drag tooltip ─────────────────────────────────────────────── */}
      {liveOverride && (
        <div style={{ position: 'fixed', left: liveOverride.mouseX + 14, top: liveOverride.mouseY - 72, zIndex: 9999, pointerEvents: 'none', backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 3, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>Date Range</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(liveOverride.startDate)} → {fmt(liveOverride.endDate)}</span>
        </div>
      )}

      {showAdd && <AddToProjectPopup person={person} onClose={() => setShowAdd(false)} />}
    </>
  )
}
