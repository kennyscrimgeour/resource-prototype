'use client'

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { Project } from '@/data/projects'
import type { Assignment, Person } from '@/data/people'
import { computeProjectBudget, businessDaysBetween } from '@/lib/budget'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import BudgetBar from '@/components/ui/BudgetBar'
import PhaseProgressBar from '@/components/ui/PhaseProgressBar'

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
  '1': '#06b6d4', '2': '#10b981', '3': '#8b5cf6', '4': '#f97316',
  '5': '#06b6d4', '6': '#8b5cf6', '7': '#10b981', '8': '#f97316',
  '9': '#06b6d4', '10': '#8b5cf6', '11': '#10b981',
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DraftAssignment {
  personId:   string
  assignment: Assignment
}

interface GanttDragState {
  personId:       string
  handle:         'left' | 'right'
  startX:         number
  baseLeftPct:    number
  baseWidthPct:   number
  baseStartISO:   string
  baseEndISO:     string
  containerWidth: number
  dayRate:        number
  allocationPct:  number
}

interface LiveOverride {
  personId:  string
  startDate: string
  endDate:   string
  cost:      number
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

function pctToISO(pct: number, projStartISO: string, projDays: number): string {
  const [sy, sm, sd] = projStartISO.split('-').map(Number)
  const ms = new Date(sy, sm - 1, sd).getTime() + (pct / 100) * projDays * 86_400_000
  const d  = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthMarkers(startISO: string, endISO: string, projDays: number) {
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const projStart = new Date(sy, sm - 1, sd)
  const projEnd   = new Date(endISO)
  const markers: Array<{ label: string; leftPct: number }> = []
  let cur = new Date(sy, sm, 1) // first day of month after start
  while (cur < projEnd) {
    const pct = (cur.getTime() - projStart.getTime()) / (projDays * 86_400_000) * 100
    if (pct > 0 && pct < 100)
      markers.push({ label: cur.toLocaleDateString('en-GB', { month: 'narrow' }), leftPct: pct })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return markers
}

function snapshotDraft(people: Person[], projectId: string): DraftAssignment[] {
  return people.flatMap(p =>
    p.assignments.filter(a => a.projectId === projectId).map(a => ({ personId: p.id, assignment: { ...a } }))
  )
}

function draftsEqual(a: DraftAssignment[], b: DraftAssignment[]): boolean {
  if (a.length !== b.length) return false
  return a.every(da => b.some(db =>
    db.personId === da.personId &&
    db.assignment.startDate     === da.assignment.startDate &&
    db.assignment.endDate       === da.assignment.endDate &&
    db.assignment.allocationPct === da.assignment.allocationPct
  ))
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  'Healthy': 'success', 'At risk': 'warning', 'Attention needed': 'error',
}

// ── Shared row styles — grid: avatar | person | alloc | mini-gantt | dates | remove ──

const COLS = '32px 1fr 56px 2fr 120px 36px'

const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: COLS,
  alignItems: 'center',
  gap: 12,
  padding: '10px 24px',
  borderTop: '1px solid var(--border-tertiary)',
}

const ACTION_BTN: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--border-primary)',
  backgroundColor: 'transparent', color: 'var(--text-secondary)',
  cursor: 'pointer', fontSize: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const GANTT_H = 20

// ── Component ──────────────────────────────────────────────────────────────────

interface ProjectDialogProps {
  project: Project
  onClose: () => void
}

export default function ProjectDialog({ project, onClose }: ProjectDialogProps) {
  const { people, addAssignment, removeAssignment, updateAssignment } = useStore()

  // ── Stable today ISO (dialog lifetime) ───────────────────────────────────────
  const todayISO = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  // ── Project geometry ──────────────────────────────────────────────────────────
  const projDays     = Math.max(1, daysBetween(project.startDate, project.endDate))
  const todayPct     = useMemo(() => Math.max(0, Math.min(100, daysBetween(project.startDate, todayISO) / projDays * 100)), [todayISO, projDays])
  const monthMarkers = useMemo(() => getMonthMarkers(project.startDate, project.endDate, projDays), [project.startDate, project.endDate, projDays])
  const barColor     = PROJECT_COLORS[project.id] ?? '#06b6d4'

  // ── Draft state ───────────────────────────────────────────────────────────────
  const [draft,     setDraft]     = useState<DraftAssignment[]>(() => snapshotDraft(people, project.id))
  const [committed, setCommitted] = useState<DraftAssignment[]>(() => snapshotDraft(people, project.id))

  const isDirty      = !draftsEqual(draft, committed)
  const addedCount   = draft.filter(d => !committed.some(c => c.personId === d.personId)).length
  const removedCount = committed.filter(c => !draft.some(d => d.personId === c.personId)).length
  const changeCount  = addedCount + removedCount

  const [showLedger, setShowLedger] = useState(false)

  // ── isAdding state ────────────────────────────────────────────────────────────
  const [isAdding,         setIsAdding]         = useState(false)
  const [addSearch,        setAddSearch]        = useState('')
  const [addSelectedId,    setAddSelectedId]    = useState<string | null>(null)
  const [addStartDate,     setAddStartDate]     = useState(project.startDate)
  const [addEndDate,       setAddEndDate]       = useState(project.endDate)
  const [addAllocationPct, setAddAllocationPct] = useState(100)

  const addSearchCellRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!isAdding || addSelectedId) return
    function update() {
      if (!addSearchCellRef.current) return
      const r = addSearchCellRef.current.getBoundingClientRect()
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [isAdding, addSelectedId])

  const draftPersonIds = draft.map(d => d.personId)
  const addAvailable = people.filter(p => {
    if (draftPersonIds.includes(p.id)) return false
    if (!addSearch) return true
    const q = addSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
  })
  const addPerson = people.find(p => p.id === addSelectedId)

  function cancelAdding() {
    setIsAdding(false); setAddSearch(''); setAddSelectedId(null)
    setAddStartDate(project.startDate); setAddEndDate(project.endDate); setAddAllocationPct(100)
  }
  function confirmAdding() {
    if (!addSelectedId) return
    handleDraftAdd(addSelectedId, { projectId: project.id, startDate: addStartDate, endDate: addEndDate, allocationPct: addAllocationPct })
    cancelAdding()
  }

  // ── Gantt drag state (refs = stable handlers) ─────────────────────────────────
  const [liveOverride, setLiveOverride] = useState<LiveOverride | null>(null)
  const ganttDragRef     = useRef<GanttDragState | null>(null)
  const liveOverrideRef  = useRef<LiveOverride | null>(null)
  const todayPctRef      = useRef(todayPct)
  useEffect(() => { todayPctRef.current = todayPct }, [todayPct])
  useEffect(() => { liveOverrideRef.current = liveOverride }, [liveOverride])

  // Stable callbacks that read from refs → registered once
  const onMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const onUpRef   = useRef<(e: MouseEvent) => void>(() => {})

  useEffect(() => {
    onMoveRef.current = (e: MouseEvent) => {
      const drag = ganttDragRef.current
      if (!drag) return
      const { handle, startX, baseLeftPct, baseWidthPct, containerWidth, personId, dayRate, allocationPct } = drag
      const deltaPct = ((e.clientX - startX) / containerWidth) * 100

      let newStartISO = drag.baseStartISO
      let newEndISO   = drag.baseEndISO

      if (handle === 'left') {
        // Left: cannot be dragged past today (floor = todayPct, ceiling = current end − 2%)
        const newLeftPct = Math.max(
          0,
          Math.min(baseLeftPct + deltaPct, todayPctRef.current, baseLeftPct + baseWidthPct - 2)
        )
        newStartISO = pctToISO(newLeftPct, project.startDate, projDays)
      } else {
        // Right: cannot be dragged before today (floor = todayPct + 2%, ceiling = 100%)
        const newRightPct = Math.max(
          todayPctRef.current + 2,
          Math.min(100, baseLeftPct + baseWidthPct + deltaPct)
        )
        newEndISO = pctToISO(newRightPct, project.startDate, projDays)
      }

      // Compute live cost
      const [sy, sm, sd] = newStartISO.split('-').map(Number)
      const [ey, em, ed] = newEndISO.split('-').map(Number)
      const s = new Date(sy, sm - 1, sd)
      const e2 = new Date(ey, em - 1, ed); e2.setDate(e2.getDate() + 1)
      const cost = Math.round(dayRate * (allocationPct / 100) * businessDaysBetween(s, e2))

      setLiveOverride({ personId, startDate: newStartISO, endDate: newEndISO, cost, mouseX: e.clientX, mouseY: e.clientY })
    }

    onUpRef.current = () => {
      const drag = ganttDragRef.current
      if (!drag) return
      const live = liveOverrideRef.current
      if (live) {
        setDraft(prev => prev.map(d =>
          d.personId === drag.personId
            ? { ...d, assignment: { ...d.assignment, startDate: live.startDate, endDate: live.endDate } }
            : d
        ))
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

  function startGanttDrag(e: React.MouseEvent, personId: string, handle: 'left' | 'right', asgn: Assignment) {
    e.preventDefault(); e.stopPropagation()
    const cell = (e.currentTarget as HTMLElement).closest('[data-gantt-cell]') as HTMLElement | null
    const containerWidth = cell?.offsetWidth ?? 200
    const { leftPct, widthPct } = ganttBar(asgn.startDate, asgn.endDate)
    const person = people.find(p => p.id === personId)
    ganttDragRef.current = {
      personId, handle, startX: e.clientX,
      baseLeftPct: leftPct, baseWidthPct: widthPct,
      baseStartISO: asgn.startDate, baseEndISO: asgn.endDate,
      containerWidth,
      dayRate:      person?.dayRate ?? 0,
      allocationPct: asgn.allocationPct,
    }
  }

  // ── Budget preview (reflects draft + live drag) ───────────────────────────────
  const draftPeople = useMemo(() =>
    people.map(p => {
      const draftEntry      = draft.find(d => d.personId === p.id)
      const baseAssignments = p.assignments.filter(a => a.projectId !== project.id)
      if (!draftEntry) return { ...p, assignments: baseAssignments }
      let asgn = draftEntry.assignment
      if (liveOverride?.personId === p.id)
        asgn = { ...asgn, startDate: liveOverride.startDate, endDate: liveOverride.endDate }
      return { ...p, assignments: [...baseAssignments, asgn] }
    }),
    [people, draft, liveOverride, project.id]
  )

  const budget = computeProjectBudget(project, draftPeople)

  // ── Draft rows — split into active (endDate >= today) and past (endDate < today) ──
  const allDraftRows = draft
    .map(da => ({ person: people.find(p => p.id === da.personId)!, assignment: da.assignment, isNew: !committed.some(c => c.personId === da.personId) }))
    .filter(row => row.person != null)

  const draftRows = allDraftRows.filter(r => r.assignment.endDate >= todayISO)
  const pastRows  = allDraftRows.filter(r => r.assignment.endDate <  todayISO)

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (isAdding) { cancelAdding(); return }
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, isAdding])

  // ── Draft operations ──────────────────────────────────────────────────────────
  function handleDraftAdd(personId: string, assignment: Assignment) {
    setDraft(prev => [...prev, { personId, assignment }])
  }
  function handleDraftRemove(personId: string) {
    setDraft(prev => prev.filter(d => d.personId !== personId))
  }

  // ── Apply / Cancel ────────────────────────────────────────────────────────────
  function handleApply() {
    for (const c of committed)
      if (!draft.some(d => d.personId === c.personId)) removeAssignment(c.personId, project.id)
    for (const d of draft)
      if (!committed.some(c => c.personId === d.personId)) addAssignment(d.personId, d.assignment)
    for (const d of draft) {
      const c = committed.find(c => c.personId === d.personId)
      if (c && JSON.stringify(c.assignment) !== JSON.stringify(d.assignment))
        updateAssignment(d.personId, project.id, d.assignment)
    }
    setCommitted(draft)
  }
  function handleCancel() { setDraft(committed) }

  // ── Gantt helpers ─────────────────────────────────────────────────────────────
  function ganttBar(startDate: string, endDate: string) {
    const leftPct = Math.max(0, daysBetween(project.startDate, startDate)) / projDays * 100
    const endFrac = Math.min(projDays, daysBetween(project.startDate, endDate)) / projDays * 100
    return { leftPct, widthPct: Math.max(2, endFrac - leftPct) }
  }

  const addGantt = isAdding && addSelectedId ? ganttBar(addStartDate, addEndDate) : null

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div
          style={{
            width: '100%', maxWidth: 920, maxHeight: '90vh',
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

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} size="sm">{project.status}</Badge>
                  <Badge variant="default" size="sm">{project.sector}</Badge>
                  {isDirty && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>Draft</span>
                  )}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{project.name}</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{project.client}</p>
              </div>
              <button onClick={onClose} style={{ ...ACTION_BTN, flexShrink: 0, width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>✕</button>
            </div>
          </div>

          {/* ── Stats strip ──────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '16px 24px', gap: 24, borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Phase</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{project.phase}</span>
                <Badge variant="default" size="sm">{project.phaseProgress}</Badge>
              </div>
              <PhaseProgressBar phase={project.phase} progress={project.phaseProgress} phaseBudgets={budget.phaseBudgets} phaseSpend={budget.phaseSpend} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Budget vs Actual</span>
                {liveOverride && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>
                    Live
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: budget.overBudget ? 'var(--error-text)' : 'var(--text-primary)' }}>
                  £{(budget.actualSpend + budget.projectedSpend).toLocaleString()} / £{project.budgetTotal.toLocaleString()} ({project.budgetTotal > 0 ? Math.round((budget.actualSpend + budget.projectedSpend) / project.budgetTotal * 100) : 0}%)
                </span>
                {budget.overBudget && <Badge variant="error" size="sm">Over budget</Badge>}
              </div>
              <BudgetBar actualSpend={budget.actualSpend} projectedSpend={budget.projectedSpend} budgetTotal={project.budgetTotal} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Timeline</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(project.startDate)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→ {fmt(project.endDate)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Team</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: draftRows.length > project.capacity ? 'var(--error-text)' : 'var(--text-primary)' }}>
                {draftRows.length} / {project.capacity} allocated
              </span>
              <div style={{ display: 'flex' }}>
                {draftRows.slice(0, 7).map(({ person }, i) => (
                  <Avatar key={person.id} initials={person.initials} size="xs" colorIndex={person.colorIndex ?? i}
                    style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 7 - i, outline: '2px solid var(--bg-primary)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Resources ────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resources</span>
                <Badge variant="default" size="sm">{draftRows.length}</Badge>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 32, padding: '0 14px', borderRadius: 8,
                  backgroundColor: isAdding ? 'var(--bg-tertiary)' : '#06b6d4',
                  border: 'none', cursor: isAdding ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 600,
                  color: isAdding ? 'var(--text-tertiary)' : '#fff',
                }}
              >
                + Add Resource
              </button>
            </div>

            {/* Column labels — col 4 is the mini-gantt month axis */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '0 24px 6px', flexShrink: 0 }}>
              <span />
              {['Person', 'Alloc'].map(label => (
                <span key={label} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              ))}
              {/* Month axis */}
              <div style={{ position: 'relative', height: 14 }}>
                {monthMarkers.map(m => (
                  <span
                    key={m.leftPct}
                    style={{
                      position: 'absolute', left: `${m.leftPct}%`, transform: 'translateX(-50%)',
                      fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)',
                      letterSpacing: '0.04em', userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              {['Dates', ''].map((label, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              ))}
            </div>

            {/* Resource rows */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>

              {/* ── Inline adding row ─────────────────────────────────── */}
              {isAdding && (
                <div style={{ ...ROW, backgroundColor: 'var(--bg-secondary)' }}>
                  {addPerson
                    ? <Avatar initials={addPerson.initials} size="xs" colorIndex={addPerson.colorIndex ?? 0} />
                    : <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed var(--border-secondary)', flexShrink: 0 }} />
                  }

                  {!addPerson ? (
                    <div ref={addSearchCellRef} style={{ minWidth: 0, position: 'relative' }}>
                      <input
                        autoFocus
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); cancelAdding() } }}
                        placeholder="Search by name or role…"
                        style={{ width: '100%', height: 24, fontSize: 12, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', padding: 0 }}
                      />
                    </div>
                  ) : (
                    <div style={{ minWidth: 0, cursor: 'pointer' }} title="Click to change person" onClick={() => { setAddSelectedId(null); setAddSearch('') }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{addPerson.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{addPerson.role}</p>
                    </div>
                  )}

                  {addPerson ? (
                    <input
                      type="number" min={10} max={200} step={5} value={addAllocationPct}
                      onChange={e => setAddAllocationPct(Number(e.target.value))}
                      style={{ width: '100%', height: 22, fontSize: 11, fontWeight: 600, border: '1px solid var(--border-primary)', borderRadius: 4, backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0 6px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  ) : <div />}

                  {/* Adding row gantt preview */}
                  {addPerson && addGantt ? (
                    <div
                      data-gantt-cell
                      style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {monthMarkers.map(m => (
                        <div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none' }} />
                      ))}
                      <div style={{ position: 'absolute', left: `${addGantt.leftPct}%`, width: `${addGantt.widthPct}%`, top: 0, height: '100%', backgroundColor: barColor, borderRadius: 4, opacity: 0.7 }} />
                    </div>
                  ) : <div />}

                  {addPerson ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <input type="date" value={addStartDate} onChange={e => setAddStartDate(e.target.value)}
                        style={{ fontSize: 10, color: 'var(--text-secondary)', border: 'none', background: 'transparent', outline: 'none', padding: 0, width: '100%', cursor: 'pointer' }} />
                      <input type="date" value={addEndDate} onChange={e => setAddEndDate(e.target.value)}
                        style={{ fontSize: 10, color: 'var(--text-secondary)', border: 'none', background: 'transparent', outline: 'none', padding: 0, width: '100%', cursor: 'pointer' }} />
                    </div>
                  ) : <div />}

                  {addPerson ? (
                    <button onClick={confirmAdding} title="Confirm" style={{ ...ACTION_BTN, color: '#06b6d4', borderColor: '#06b6d4' }}>✓</button>
                  ) : (
                    <button onClick={cancelAdding} title="Cancel" style={ACTION_BTN}>✕</button>
                  )}
                </div>
              )}

              {/* ── Existing / draft rows ─────────────────────────────── */}
              {!isAdding && draftRows.length === 0 && (
                <p style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>No resources assigned yet.</p>
              )}

              {draftRows.map(({ person, assignment: asgn, isNew }) => {
                const isThisDragging  = liveOverride?.personId === person.id
                const liveStart       = isThisDragging ? liveOverride!.startDate : asgn.startDate
                const liveEnd         = isThisDragging ? liveOverride!.endDate   : asgn.endDate
                const { leftPct, widthPct } = ganttBar(liveStart, liveEnd)
                const leftHandleLocked = asgn.startDate <= todayISO
                const fillColor = isNew ? 'var(--warning-text)' : barColor

                return (
                  <div
                    key={person.id}
                    style={{ ...ROW, backgroundColor: isNew ? 'var(--warning-bg)' : 'transparent', transition: 'background-color 0.15s' }}
                  >
                    <Avatar initials={person.initials} size="xs" colorIndex={person.colorIndex ?? 0} />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.name}</p>
                        {isNew && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 3, padding: '1px 4px', textTransform: 'uppercase', flexShrink: 0 }}>Draft</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.role}</p>
                    </div>

                    <Badge variant={asgn.allocationPct > 100 ? 'error' : 'default'} size="sm">{asgn.allocationPct}%</Badge>

                    {/* ── Mini-Gantt bar ────────────────────────────────── */}
                    <div
                      data-gantt-cell
                      style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {monthMarkers.map(m => (
                        <div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none', zIndex: 0 }} />
                      ))}
                      <div
                        style={{
                          position: 'absolute', zIndex: 1,
                          left: `${leftPct}%`, width: `${widthPct}%`,
                          top: 0, height: '100%',
                          backgroundColor: fillColor,
                          borderRadius: 4,
                          boxShadow: isThisDragging ? `0 0 0 2px ${fillColor}40` : 'none',
                        }}
                      >
                        {!leftHandleLocked && (
                          <div onMouseDown={e => startGanttDrag(e, person.id, 'left', asgn)}
                            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                          </div>
                        )}
                        <div onMouseDown={e => startGanttDrag(e, person.id, 'right', asgn)}
                          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>{fmt(liveStart)}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>→ {fmt(liveEnd)}</p>
                    </div>

                    <button onClick={() => handleDraftRemove(person.id)} title="Remove from project" style={ACTION_BTN}>✕</button>
                  </div>
                )
              })}

              {/* ── Historical Ledger ─────────────────────────────────── */}
              {pastRows.length > 0 && (
                <>
                  {/* Toggle row */}
                  <button
                    onClick={() => setShowLedger(v => !v)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: COLS,
                      gap: 12,
                      padding: '8px 24px',
                      borderTop: '1px solid var(--border-tertiary)',
                      borderRight: 'none',
                      borderBottom: 'none',
                      borderLeft: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    {/* Span across all columns */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: 'var(--text-tertiary)',
                      }}>
                        {showLedger ? '▾' : '▸'} Past Contributors
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 6px',
                        backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
                      }}>
                        {pastRows.length}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        £{budget.actualSpend.toLocaleString()} locked
                      </span>
                    </div>
                  </button>

                  {/* Ledger rows — read-only */}
                  {showLedger && pastRows.map(({ person, assignment: asgn }) => {
                    const { leftPct, widthPct } = ganttBar(asgn.startDate, asgn.endDate)
                    return (
                      <div
                        key={`past-${person.id}`}
                        style={{ ...ROW, opacity: 0.6 }}
                      >
                        <Avatar initials={person.initials} size="xs" colorIndex={person.colorIndex ?? 0} />

                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.role}</p>
                        </div>

                        <Badge variant="default" size="sm">{asgn.allocationPct}%</Badge>

                        {/* Static mini-gantt — no handles */}
                        <div style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}>
                          {monthMarkers.map(m => (
                            <div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none' }} />
                          ))}
                          <div style={{
                            position: 'absolute',
                            left: `${leftPct}%`, width: `${widthPct}%`,
                            top: 0, height: '100%',
                            backgroundColor: '#16a34a',   // solid green = fully incurred
                            borderRadius: 4,
                          }} />
                        </div>

                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>{fmt(asgn.startDate)}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>→ {fmt(asgn.endDate)}</p>
                        </div>

                        {/* Locked icon — no delete */}
                        <div style={{ ...ACTION_BTN, cursor: 'default', opacity: 0.4 }}>🔒</div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Apply / Cancel footer ─────────────────────────────────── */}
          {isDirty && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--warning-border)', backgroundColor: 'var(--warning-bg)', flexShrink: 0, gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--warning-text)', fontWeight: 500 }}>
                {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
                {addedCount > 0 && removedCount > 0
                  ? ` (${addedCount} added, ${removedCount} removed)`
                  : addedCount > 0 ? ` — ${addedCount} added` : ` — ${removedCount} removed`}
              </span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={handleCancel} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--warning-border)', backgroundColor: 'transparent', color: 'var(--warning-text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Discard</button>
                <button onClick={handleApply} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: '#06b6d4', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Apply {changeCount} change{changeCount !== 1 ? 's' : ''}</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Search dropdown ─────────────────────────────────────────── */}
      {isAdding && !addSelectedId && (
        <div
          style={{
            position: 'fixed', top: dropdownPos.top, left: dropdownPos.left,
            width: Math.max(dropdownPos.width, 240), zIndex: 100,
            backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: 220, overflowY: 'auto',
          }}
        >
          {addAvailable.length === 0 ? (
            <p style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              {addSearch ? 'No people match your search.' : 'No available people.'}
            </p>
          ) : addAvailable.map(p => (
            <button
              key={p.id}
              onClick={() => setAddSelectedId(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', width: '100%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Avatar initials={p.initials} size="xs" colorIndex={p.colorIndex ?? 0} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{p.role}</p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{p.utilizationPct}% util</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Drag tooltip ────────────────────────────────────────────── */}
      {liveOverride && (
        <div
          style={{
            position: 'fixed', left: liveOverride.mouseX + 14, top: liveOverride.mouseY - 72,
            zIndex: 9999, pointerEvents: 'none',
            backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)',
            borderRadius: 8, padding: '8px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', gap: 3,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>Total Cost</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>£{liveOverride.cost.toLocaleString()}</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>{fmt(liveOverride.startDate)} → {fmt(liveOverride.endDate)}</span>
        </div>
      )}
    </>
  )
}
