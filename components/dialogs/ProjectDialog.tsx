'use client'

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { ProjectDialogDraftItem } from '@/lib/store'
import type { Project } from '@/data/projects'
import type { Assignment, Person } from '@/data/people'
import { computeProjectBudget, businessDaysBetween, getPhaseDateRanges } from '@/lib/budget'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import BudgetBar from '@/components/ui/BudgetBar'
import PhaseProgressBar from '@/components/ui/PhaseProgressBar'
import { ChevronLeft } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
  '1': '#06b6d4', '2': '#10b981', '3': '#8b5cf6', '4': '#f97316',
  '5': '#06b6d4', '6': '#8b5cf6', '7': '#10b981', '8': '#f97316',
  '9': '#06b6d4', '10': '#8b5cf6', '11': '#10b981',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type DraftAssignment = ProjectDialogDraftItem

// 'move' drags both handles together (Stone Rule: blocked if startDate ≤ today)
interface GanttDragState {
  personId:               string
  handle:                 'left' | 'right' | 'move'
  startX:                 number
  baseLeftPct:            number
  baseWidthPct:           number
  baseStartISO:           string
  baseEndISO:             string
  containerWidth:         number
  dayRate:                number
  allocationPct:          number
  committedAllocationPct: number
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

function fmtShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}/${m}`
}

function projCostCalc(dayRate: number, allocationPct: number, startISO: string, endISO: string): number {
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [ey, em, ed] = endISO.split('-').map(Number)
  const s  = new Date(sy, sm - 1, sd)
  const e2 = new Date(ey, em - 1, ed); e2.setDate(e2.getDate() + 1)
  return Math.round(dayRate * (allocationPct / 100) * businessDaysBetween(s, e2))
}

/**
 * Row "landing position" cost: locked actuals (committed %) + projected (current slider %).
 * Past portion is immutable; only the future window reacts to slider changes.
 */
function computeRowCost(
  dayRate: number,
  committedPct: number,
  currentPct: number,
  startISO: string,
  endISO: string,
): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [ey, em, ed] = endISO.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end2  = new Date(ey, em - 1, ed); end2.setDate(end2.getDate() + 1)
  // Actual window: start → yesterday
  const actualEnd  = end2 < today ? end2 : today
  const actualDays = start < actualEnd ? businessDaysBetween(start, actualEnd) : 0
  const actualCost = Math.round(dayRate * (committedPct / 100) * actualDays)
  // Projected window: today → end
  const projStart = start > today ? start : today
  const projDays  = projStart < end2 ? businessDaysBetween(projStart, end2) : 0
  const projCost  = Math.round(dayRate * (currentPct / 100) * projDays)
  return actualCost + projCost
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
  let cur = new Date(sy, sm, 1)
  while (cur < projEnd) {
    const pct = (cur.getTime() - projStart.getTime()) / (projDays * 86_400_000) * 100
    if (pct > 0 && pct < 100)
      markers.push({
        label: cur.toLocaleDateString('en-GB', { month: 'long' }),   // full month name
        leftPct: pct,
      })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return markers
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Ghost contributors ─────────────────────────────────────────────────────────

interface GhostRow {
  id: string; initials: string; name: string; role: string
  startDate: string; endDate: string; allocationPct: number; cost: number
}

function generateGhostRows(project: Project, today: Date): GhostRow[] {
  if (project.phase !== 'Build' && project.phase !== 'UAT') return []
  const ranges = getPhaseDateRanges(project)
  const ghosts: GhostRow[] = []
  const dEnd = ranges.Discovery.end
  if (dEnd < today) {
    const days = businessDaysBetween(ranges.Discovery.start, dEnd)
    ghosts.push({ id: 'ghost-strategist', initials: 'GS', name: 'Strategy Lead', role: 'Strategist', startDate: project.startDate, endDate: toISO(dEnd), allocationPct: 100, cost: Math.round(580 * days) })
  }
  const dsEnd = ranges.Design.end
  if (dsEnd < today) {
    const days = businessDaysBetween(ranges.Design.start, dsEnd)
    ghosts.push({ id: 'ghost-designer', initials: 'GD', name: 'Design Lead', role: 'UX Designer', startDate: toISO(ranges.Design.start), endDate: toISO(dsEnd), allocationPct: 80, cost: Math.round(620 * 0.8 * days) })
  }
  if (project.phase === 'UAT') {
    const bEnd = ranges.Build.end
    if (bEnd < today) {
      const days = businessDaysBetween(ranges.Build.start, bEnd)
      ghosts.push({ id: 'ghost-ba', initials: 'GB', name: 'Business Analyst', role: 'Business Analyst', startDate: toISO(ranges.Build.start), endDate: toISO(bEnd), allocationPct: 60, cost: Math.round(560 * 0.6 * days) })
    }
  }
  return ghosts
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

// ── Layout constants ───────────────────────────────────────────────────────────
// avatar | person (name+role+dayrate) | allocation | gantt | proj-cost | remove

const COLS = '28px minmax(0,1fr) 140px 2fr 96px 32px'

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

// ── Component ──────────────────────────────────────────────────────────────────

interface ProjectDialogProps {
  project:               Project
  onClose:               () => void
  canGoBack?:            boolean
  onBack?:               () => void
  onNavigateToPerson?:   (personId: string) => void
  globalDirtyCount?:     number
}

export default function ProjectDialog({
  project, onClose,
  canGoBack = false, onBack,
  onNavigateToPerson,
  globalDirtyCount = 0,
}: ProjectDialogProps) {
  const {
    people, timelineDrafts, recordTimelineDraft,
    personDialogDrafts, projectDialogDrafts, setProjectDialogDraft, clearProjectDialogDraft,
    applyAllDialogDrafts, discardAllDialogDrafts,
  } = useStore()

  const todayISO = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const projDays     = Math.max(1, daysBetween(project.startDate, project.endDate))
  const todayPct     = useMemo(() => Math.max(0, Math.min(100, daysBetween(project.startDate, todayISO) / projDays * 100)), [todayISO, projDays])
  const monthMarkers = useMemo(() => getMonthMarkers(project.startDate, project.endDate, projDays), [project.startDate, project.endDate, projDays])
  const barColor     = PROJECT_COLORS[project.id] ?? '#06b6d4'

  // ── Draft state — restore parked draft if navigated back, else snapshot from store ──
  const [draft, setDraft] = useState<DraftAssignment[]>(() => {
    const parked = projectDialogDrafts.get(project.id)
    if (parked) return parked.draft
    const base = snapshotDraft(people, project.id)
    return base.map(da => {
      // Prefer in-flight PersonDialog draft (has allocation % + any date changes)
      const personDraft = personDialogDrafts.get(da.personId)
      if (personDraft) {
        const personEntry = personDraft.draft.find(d => d.projectId === project.id)
        if (personEntry) return { ...da, assignment: { ...personEntry.assignment } }
      }
      const tlDraft = timelineDrafts.get(`${da.personId}:${project.id}`)
      if (tlDraft) return { ...da, assignment: { ...da.assignment, startDate: tlDraft.startDate, endDate: tlDraft.endDate } }
      return da
    })
  })
  // committed = the store's actual saved state (no overlay)
  const [committed, setCommitted] = useState<DraftAssignment[]>(() => {
    const parked = projectDialogDrafts.get(project.id)
    if (parked) return parked.committed
    return snapshotDraft(people, project.id)
  })

  // bars that were modified by a timeline drag but not yet applied
  const timelineEditedIds = useMemo(() =>
    new Set(
      Array.from(timelineDrafts.values())
        .filter(d => d.projectId === project.id)
        .map(d => d.personId)
    ),
    [timelineDrafts, project.id]
  )

  // Real-time sync: push date changes from dialog draft back to timeline
  useEffect(() => {
    for (const da of draft) {
      const c = committed.find(x => x.personId === da.personId)
      if (!c) continue
      if (da.assignment.startDate !== c.assignment.startDate ||
          da.assignment.endDate   !== c.assignment.endDate) {
        recordTimelineDraft(da.personId, project.id, da.assignment.startDate, da.assignment.endDate)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // Sticky draft: once any edit is made the footer stays visible even if user manually reverts
  const [everEdited, setEverEdited] = useState(false)
  const isDirty = everEdited || !draftsEqual(draft, committed)
  const showFooter = isDirty || globalDirtyCount > 0

  // Park draft in global store so navigation doesn't lose state
  useEffect(() => {
    if (isDirty) {
      setProjectDialogDraft(project.id, { draft, committed })
    } else {
      clearProjectDialogDraft(project.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isDirty])

  const [showLedger,    setShowLedger]    = useState(true)
  const [showExitGuard, setShowExitGuard] = useState(false)

  function attemptClose() {
    if (showFooter) { setShowExitGuard(true); return }
    clearProjectDialogDraft(project.id)
    onClose()
  }

  // ── isAdding state ────────────────────────────────────────────────────────────
  const [isAdding,      setIsAdding]      = useState(false)
  const [addSearch,     setAddSearch]     = useState('')
  const [addSelectedId, setAddSelectedId] = useState<string | null>(null)

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

  function cancelAdding() {
    setIsAdding(false); setAddSearch(''); setAddSelectedId(null)
  }

  /** Immediately inject with defaults: today → projectEnd.
   *  Stone Rule: startDate floor = today. No back-dating without admin approval.
   *  Future logic: Admin approval required for back-dating. */
  function selectAndInject(personId: string) {
    handleDraftAdd(personId, {
      projectId: project.id, startDate: todayISO,
      endDate: project.endDate, allocationPct: 100,
    })
    cancelAdding()
  }

  // ── Gantt drag ─────────────────────────────────────────────────────────────────
  const [liveOverride, setLiveOverride] = useState<LiveOverride | null>(null)
  const ganttDragRef    = useRef<GanttDragState | null>(null)
  const liveOverrideRef = useRef<LiveOverride | null>(null)
  const todayPctRef     = useRef(todayPct)
  useEffect(() => { todayPctRef.current = todayPct }, [todayPct])
  useEffect(() => { liveOverrideRef.current = liveOverride }, [liveOverride])

  const onMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const onUpRef   = useRef<(e: MouseEvent) => void>(() => {})

  useEffect(() => {
    onMoveRef.current = (e: MouseEvent) => {
      const drag = ganttDragRef.current
      if (!drag) return
      const { handle, startX, baseLeftPct, baseWidthPct, containerWidth, personId, dayRate, allocationPct, committedAllocationPct } = drag
      const deltaPct = ((e.clientX - startX) / containerWidth) * 100

      let newStartISO = drag.baseStartISO
      let newEndISO   = drag.baseEndISO

      if (handle === 'left') {
        // Floor = today (can't drag into the past), ceiling = just before end
        const newLeftPct = Math.max(todayPctRef.current, Math.min(baseLeftPct + deltaPct, baseLeftPct + baseWidthPct - 2))
        newStartISO = pctToISO(newLeftPct, project.startDate, projDays)
      } else if (handle === 'right') {
        // Stone Rule: floor at today+2%, ceiling at 100%
        const newRightPct = Math.max(todayPctRef.current + 2, Math.min(100, baseLeftPct + baseWidthPct + deltaPct))
        newEndISO = pctToISO(newRightPct, project.startDate, projDays)
      } else {
        // move: shift both ends equally
        // Clamp so newStartDate >= today (Stone Rule: can't slide into the past)
        const minDelta    = todayPctRef.current - baseLeftPct
        const clampedDelta = Math.max(minDelta, Math.min(deltaPct, 100 - baseLeftPct - baseWidthPct))
        newStartISO = pctToISO(baseLeftPct + clampedDelta, project.startDate, projDays)
        newEndISO   = pctToISO(baseLeftPct + baseWidthPct + clampedDelta, project.startDate, projDays)
      }

      const cost = dayRate ? computeRowCost(dayRate, committedAllocationPct, allocationPct, newStartISO, newEndISO) : 0
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

  function startGanttDrag(e: React.MouseEvent, personId: string, handle: 'left' | 'right' | 'move', asgn: Assignment) {
    // Stone Rule: block move if start is strictly before today
    if (handle === 'move' && asgn.startDate < todayISO) return
    e.preventDefault(); e.stopPropagation()
    const cell = (e.currentTarget as HTMLElement).closest('[data-gantt-cell]') as HTMLElement | null
    const containerWidth = cell?.offsetWidth ?? 200
    const { leftPct, widthPct } = ganttBar(asgn.startDate, asgn.endDate)
    const person = people.find(p => p.id === personId)
    const committedEntry = committed.find(c => c.personId === personId)
    ganttDragRef.current = {
      personId, handle, startX: e.clientX,
      baseLeftPct: leftPct, baseWidthPct: widthPct,
      baseStartISO: asgn.startDate, baseEndISO: asgn.endDate,
      containerWidth,
      dayRate:               person?.dayRate ?? 0,
      allocationPct:         asgn.allocationPct,
      committedAllocationPct: committedEntry?.assignment.allocationPct ?? asgn.allocationPct,
    }
  }

  // ── Budget preview ────────────────────────────────────────────────────────────
  const draftPeople = useMemo(() =>
    people.map(p => {
      const draftEntry      = draft.find(d => d.personId === p.id)
      const baseAssignments = p.assignments.filter(a => a.projectId !== project.id)
      if (!draftEntry) return { ...p, assignments: baseAssignments }
      // Stamp committedAllocationPct so the budget calc locks past spend at the original %
      const committedEntry           = committed.find(c => c.personId === p.id)
      const committedAllocationPct   = committedEntry?.assignment.allocationPct ?? draftEntry.assignment.allocationPct
      let asgn = { ...draftEntry.assignment, committedAllocationPct }
      if (liveOverride?.personId === p.id)
        asgn = { ...asgn, startDate: liveOverride.startDate, endDate: liveOverride.endDate }
      return { ...p, assignments: [...baseAssignments, asgn] }
    }),
    [people, draft, committed, liveOverride, project.id]
  )

  const budget = computeProjectBudget(project, draftPeople)

  // ── Row segregation ───────────────────────────────────────────────────────────
  const allDraftRows = draft
    .map(da => ({
      person:     people.find(p => p.id === da.personId)!,
      assignment: da.assignment,
      isNew:      !committed.some(c => c.personId === da.personId),
      isChanged:  committed.some(c => {
        if (c.personId !== da.personId) return false
        return JSON.stringify(c.assignment) !== JSON.stringify(da.assignment)
      }),
    }))
    .filter(r => r.person != null)

  const draftRows = allDraftRows.filter(r => r.assignment.endDate >= todayISO)
  const pastRows  = allDraftRows.filter(r => r.assignment.endDate <  todayISO)

  const ghostRows = useMemo(() =>
    pastRows.length === 0 ? generateGhostRows(project, new Date(todayISO)) : [],
    [pastRows.length, project, todayISO]
  )

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showExitGuard) { setShowExitGuard(false); return }
      if (isAdding) { cancelAdding(); return }
      attemptClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, isAdding, showExitGuard, isDirty])

  // ── Draft operations ──────────────────────────────────────────────────────────
  function handleDraftAdd(personId: string, assignment: Assignment) {
    setDraft(prev => [...prev, { personId, assignment }])
    setEverEdited(true)
  }
  function handleDraftRemove(personId: string) {
    setDraft(prev => prev.filter(d => d.personId !== personId))
    setEverEdited(true)
  }
  function handleDraftUpdateAllocation(personId: string, allocationPct: number) {
    setDraft(prev => prev.map(d =>
      d.personId === personId ? { ...d, assignment: { ...d.assignment, allocationPct } } : d
    ))
    setEverEdited(true)
  }

  function handleApply() {
    // Ensure current state is parked before applying all
    setProjectDialogDraft(project.id, { draft, committed })
    applyAllDialogDrafts()
    setCommitted(draft)
    setEverEdited(false)
    onClose()
  }
  function handleCancel() {
    // Discard everything globally + reset local state
    setDraft(committed)
    setEverEdited(false)
    discardAllDialogDrafts()
  }

  // ── Gantt helpers ─────────────────────────────────────────────────────────────
  function ganttBar(startDate: string, endDate: string) {
    const leftPct = Math.max(0, daysBetween(project.startDate, startDate)) / projDays * 100
    const endFrac = Math.min(projDays, daysBetween(project.startDate, endDate)) / projDays * 100
    return { leftPct, widthPct: Math.max(2, endFrac - leftPct) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={attemptClose}
      />

      {/* Panel — anchored at top: 5vh, expands downward */}
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

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} size="sm">{project.status}</Badge>
                  <Badge variant="default" size="sm">{project.sector}</Badge>
                  {showFooter && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--info-text, #0369a1)', backgroundColor: 'var(--info-bg, #f0f9ff)', border: '1px solid var(--info-border, #bae6fd)', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>Draft</span>
                  )}
                </div>
                {/* Chevron directly left of the project name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {canGoBack && (
                    <button
                      onClick={() => { setProjectDialogDraft(project.id, { draft, committed }); onBack?.() }}
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
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{project.name}</h2>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{project.client}</p>
              </div>
              <button onClick={attemptClose} style={{ ...ACTION_BTN, flexShrink: 0, width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>✕</button>
            </div>
          </div>

          {/* ── HUD strip — 5 cells: Phase | Budget (wider) | Start | End | Team ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 2fr 2fr 2fr', padding: '16px 24px', gap: 20, borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>

            {/* Phase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Phase</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{project.phase}</span>
                <Badge variant="default" size="sm">{project.phaseProgress}</Badge>
              </div>
              <PhaseProgressBar phase={project.phase} progress={project.phaseProgress} phaseBudgets={budget.phaseBudgets} phaseSpend={budget.phaseSpend} />
            </div>

            {/* Budget vs Actual — wider cell, no wrapping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Budget vs Actual</span>
                {liveOverride && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--warning-text)', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>Live</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: budget.overBudget ? 'var(--error-text)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  £{(budget.actualSpend + budget.projectedSpend).toLocaleString()} / £{project.budgetTotal.toLocaleString()}
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> ({project.budgetTotal > 0 ? Math.round((budget.actualSpend + budget.projectedSpend) / project.budgetTotal * 100) : 0}%)</span>
                </span>
                {budget.overBudget && <Badge variant="error" size="sm">Over budget</Badge>}
              </div>
              <BudgetBar actualSpend={budget.actualSpend} projectedSpend={budget.projectedSpend} budgetTotal={project.budgetTotal} />
            </div>

            {/* Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Start Date</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(project.startDate)}</span>
            </div>

            {/* End Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>End Date</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(project.endDate)}</span>
            </div>

            {/* Team */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Team</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {draftRows.slice(0, 8).map(({ person }, i) => (
                  <Avatar key={person.id} initials={person.initials} size="sm" colorIndex={person.colorIndex ?? i}
                    style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 8 - i, outline: '2px solid var(--bg-primary)' }} />
                ))}
                {draftRows.length > 8 && (
                  <div style={{ marginLeft: -8, width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '2px solid var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    +{draftRows.length - 8}
                  </div>
                )}
                {draftRows.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No team yet</span>}
              </div>
            </div>
          </div>

          {/* ── Resources ────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resources</span>
                <Badge variant="default" size="sm">{draftRows.length}</Badge>
              </div>
              <button
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 8,
                  backgroundColor: isAdding ? 'var(--bg-tertiary)' : '#06b6d4',
                  border: 'none', cursor: isAdding ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 600, color: isAdding ? 'var(--text-tertiary)' : '#fff',
                }}
              >+ Add Resource</button>
            </div>

            {/* Column headers — gantt col has the month axis */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '0 24px 6px', flexShrink: 0 }}>
              <span />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Person</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation</span>
              {/* Gantt axis — full month names */}
              <div style={{ position: 'relative', height: 14, overflow: 'hidden' }}>
                {monthMarkers.map(m => (
                  <span key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proj. Cost</span>
              <span />
            </div>

            {/* Resource rows */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>

              {/* ── Inline adding row ─────────────────────────────────── */}
              {isAdding && (
                <div style={{ ...ROW, backgroundColor: 'var(--bg-secondary)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed var(--border-secondary)', flexShrink: 0 }} />
                  <div ref={addSearchCellRef} style={{ gridColumn: '2 / -1', minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      autoFocus
                      value={addSearch}
                      onChange={e => setAddSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); cancelAdding() } }}
                      placeholder="Search by name or role…"
                      style={{ flex: 1, height: 24, fontSize: 12, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', padding: 0 }}
                    />
                    <button onClick={cancelAdding} title="Cancel" style={ACTION_BTN}>✕</button>
                  </div>
                </div>
              )}

              {!isAdding && draftRows.length === 0 && (
                <p style={{ padding: '12px 24px', fontSize: 13, color: 'var(--text-tertiary)' }}>No resources assigned yet.</p>
              )}

              {/* ── Active draft rows ─────────────────────────────────── */}
              {draftRows.map(({ person, assignment: asgn, isNew, isChanged }) => {
                const isDraftRow = isNew || isChanged
                const isThisDragging = liveOverride?.personId === person.id
                const liveStart = isThisDragging ? liveOverride!.startDate : asgn.startDate
                const liveEnd   = isThisDragging ? liveOverride!.endDate   : asgn.endDate
                const { leftPct, widthPct } = ganttBar(liveStart, liveEnd)

                // Stone Rule: left handle locked only if assignment start is strictly before today
                const leftLocked = asgn.startDate < todayISO
                // Stone Rule: move handle locked only if start is strictly before today
                const moveLocked = asgn.startDate < todayISO

                const fillColor = barColor

                // Landing cost = locked actuals (committed %) + projected (current slider %)
                const committedEntry2    = committed.find(c => c.personId === person.id)
                const committedPct       = committedEntry2?.assignment.allocationPct ?? asgn.allocationPct
                const rowProjCost = person.dayRate
                  ? computeRowCost(person.dayRate, committedPct, asgn.allocationPct, liveStart, liveEnd)
                  : null

                const otherAlloc  = person.assignments.filter(a => a.projectId !== project.id && a.endDate >= todayISO).reduce((s, a) => s + a.allocationPct, 0)
                const isOverloaded = otherAlloc + asgn.allocationPct > 100

                // Bookend label format based on bar visual width (widthPct × ~4.5 ≈ px)
                const approxBarPx = widthPct * 4.5
                const showBookends = approxBarPx > 48
                const useShortFmt  = approxBarPx < 120

                return (
                  <div
                    key={person.id}
                    style={{
                      ...ROW,
                      backgroundColor: isDraftRow ? 'var(--info-bg, #f0f9ff)' : 'transparent',
                      transition: 'background-color 0.12s',
                    }}
                  >
                    {/* Avatar — part of the click anchor, sits outside the cell */}
                    <Avatar
                      initials={person.initials} size="xs" colorIndex={person.colorIndex ?? 0}
                      style={{ cursor: onNavigateToPerson ? 'pointer' : 'default' }}
                      onClick={() => onNavigateToPerson?.(person.id)}
                    />

                    {/* Person name/role — the click anchor for navigation */}
                    <div
                      className={onNavigateToPerson ? 'dialog-row-hover' : undefined}
                      style={{ minWidth: 0, borderRadius: 4, padding: '2px 4px', margin: '-2px -4px', cursor: onNavigateToPerson ? 'pointer' : 'default' }}
                      onClick={() => onNavigateToPerson?.(person.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, minWidth: 0 }}>{person.name}</p>
                        {person.dayRate && (
                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, padding: '1px 4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            £{person.dayRate}/d
                          </span>
                        )}
                        {isNew && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--info-text, #0369a1)', backgroundColor: 'var(--info-bg, #f0f9ff)', border: '1px solid var(--info-border, #bae6fd)', borderRadius: 3, padding: '1px 4px', textTransform: 'uppercase', flexShrink: 0 }}>New</span>}
                        {isOverloaded && <span title={`${otherAlloc + asgn.allocationPct}% total`} style={{ fontSize: 9, fontWeight: 700, color: 'var(--error-text)', backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 3, padding: '1px 4px', textTransform: 'uppercase', flexShrink: 0, cursor: 'help' }}>Overloaded</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.role}</p>
                    </div>

                    {/* Allocation slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <input
                        type="range" min={5} max={100} step={5}
                        value={Math.min(asgn.allocationPct, 100)}
                        onChange={e => handleDraftUpdateAllocation(person.id, Number(e.target.value))}
                        className="alloc-slider"
                        style={{ flex: 1, minWidth: 0, '--slider-pct': `${((Math.min(asgn.allocationPct, 100) - 5) / 95) * 100}%`, '--slider-fill': isOverloaded ? 'var(--error-text)' : fillColor } as React.CSSProperties}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 26, textAlign: 'right', flexShrink: 0, color: isOverloaded ? 'var(--error-text)' : 'var(--text-secondary)' }}>
                        {asgn.allocationPct}%
                      </span>
                    </div>

                    {/* ── Mini-Gantt with bookend dates ─────────────────── */}
                    <div
                      data-gantt-cell
                      style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {monthMarkers.map(m => (
                        <div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none', zIndex: 0 }} />
                      ))}
                      {/* Fill bar — ghost style for new (unsaved) rows */}
                      <div
                        style={{
                          position: 'absolute', zIndex: 1,
                          left: `${leftPct}%`, width: `${widthPct}%`,
                          top: 0, height: '100%',
                          backgroundColor: isDraftRow
                            ? `color-mix(in srgb, ${fillColor} 20%, transparent)`
                            : fillColor,
                          border: isDraftRow ? `1px solid ${fillColor}` : 'none',
                          borderRadius: 4,
                          boxSizing: 'border-box',
                          boxShadow: isThisDragging ? `0 0 0 2px ${fillColor}40` : 'none',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Bookend: start date */}
                        {showBookends && (
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: isDraftRow ? fillColor : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1 }}>
                            {useShortFmt ? fmtShort(liveStart) : fmt(liveStart)}
                          </span>
                        )}
                        {/* Bookend: end date */}
                        {showBookends && (
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: isDraftRow ? fillColor : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1 }}>
                            {useShortFmt ? fmtShort(liveEnd) : fmt(liveEnd)}
                          </span>
                        )}
                        {/* Left handle */}
                        {!leftLocked && (
                          <div onMouseDown={e => startGanttDrag(e, person.id, 'left', asgn)}
                            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: isDraftRow ? fillColor : 'rgba(255,255,255,0.55)' }} />
                          </div>
                        )}
                        {/* Move handle — center strip, blocked if start ≤ today */}
                        {!moveLocked && (
                          <div onMouseDown={e => startGanttDrag(e, person.id, 'move', asgn)}
                            style={{ position: 'absolute', left: 8, right: 8, top: 0, bottom: 0, cursor: 'grab', zIndex: 2 }} />
                        )}
                        {/* Right handle */}
                        <div onMouseDown={e => startGanttDrag(e, person.id, 'right', asgn)}
                          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: isDraftRow ? fillColor : 'rgba(255,255,255,0.55)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Projected Cost — live on drag + slider */}
                    <div style={{ textAlign: 'right' }}>
                      {rowProjCost != null ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          £{rowProjCost.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </div>

                    <button onClick={() => handleDraftRemove(person.id)} title="Remove" style={ACTION_BTN}>✕</button>
                  </div>
                )
              })}

              {/* ── Historical Ledger ─────────────────────────────────── */}
              {(pastRows.length > 0 || ghostRows.length > 0) && (
                <>
                  <button
                    onClick={() => setShowLedger(v => !v)}
                    style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '8px 24px', borderTop: '1px solid var(--border-tertiary)', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', alignItems: 'center' }}
                  >
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                        {showLedger ? '▾' : '▸'} Past Contributors
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                        {pastRows.length + ghostRows.length}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        £{budget.actualSpend.toLocaleString()} locked
                      </span>
                    </div>
                  </button>

                  {showLedger && ghostRows.map(ghost => {
                    const { leftPct, widthPct } = ganttBar(ghost.startDate, ghost.endDate)
                    return (
                      <div key={ghost.id} style={{ ...ROW, opacity: 0.6 }}>
                        <Avatar initials={ghost.initials} size="xs" colorIndex={3} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{ghost.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{ghost.role}</p>
                        </div>
                        <Badge variant="default" size="sm">{ghost.allocationPct}%</Badge>
                        <div style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}>
                          {monthMarkers.map(m => (<div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none' }} />))}
                          <div style={{ position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`, top: 0, height: '100%', backgroundColor: '#16a34a', borderRadius: 4, overflow: 'hidden' }}>
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(ghost.startDate)}</span>}
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(ghost.endDate)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>£{ghost.cost.toLocaleString()}</span></div>
                        <div style={{ ...ACTION_BTN, cursor: 'default', opacity: 0.35, fontSize: 11 }}>🔒</div>
                      </div>
                    )
                  })}

                  {showLedger && pastRows.map(({ person, assignment: asgn }) => {
                    const { leftPct, widthPct } = ganttBar(asgn.startDate, asgn.endDate)
                    const cost = person.dayRate ? projCostCalc(person.dayRate, asgn.allocationPct, asgn.startDate, asgn.endDate) : null
                    return (
                      <div key={`past-${person.id}`} style={{ ...ROW, opacity: 0.6 }}>
                        <Avatar initials={person.initials} size="xs" colorIndex={person.colorIndex ?? 0} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{person.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{person.role}</p>
                        </div>
                        <Badge variant="default" size="sm">{asgn.allocationPct}%</Badge>
                        <div style={{ position: 'relative', height: GANTT_H, borderRadius: 4, backgroundColor: 'var(--bg-tertiary)' }}>
                          {monthMarkers.map(m => (<div key={m.leftPct} style={{ position: 'absolute', left: `${m.leftPct}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border-secondary)', pointerEvents: 'none' }} />))}
                          <div style={{ position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`, top: 0, height: '100%', backgroundColor: '#16a34a', borderRadius: 4, overflow: 'hidden' }}>
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(asgn.startDate)}</span>}
                            {widthPct * 4.5 > 48 && <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{fmtShort(asgn.endDate)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>{cost != null ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>£{cost.toLocaleString()}</span> : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>}</div>
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
                <button onClick={handleCancel} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--info-border, #bae6fd)', backgroundColor: 'transparent', color: 'var(--info-text, #0369a1)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Discard All</button>
                <button onClick={handleApply} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: '#06b6d4', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Apply All</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Search dropdown ─────────────────────────────────────────── */}
      {isAdding && !addSelectedId && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 260), zIndex: 100, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 220, overflowY: 'auto' }}>
          {addAvailable.length === 0 ? (
            <p style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
              {addSearch ? 'No people match your search.' : 'No available people.'}
            </p>
          ) : addAvailable.map(p => (
            <button key={p.id} onClick={() => selectAndInject(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}
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

      {/* ── Exit guard modal ─────────────────────────────────────────── */}
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
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>Projected Cost</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>£{liveOverride.cost.toLocaleString()}</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>{fmt(liveOverride.startDate)} → {fmt(liveOverride.endDate)}</span>
        </div>
      )}
    </>
  )
}
