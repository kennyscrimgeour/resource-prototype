'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import TimelineBar from '@/components/timeline/TimelineBar'
import TimelineStub, { STUB_WIDTH, ROW_HEIGHT } from '@/components/timeline/TimelineStub'
import WeekHeader, { HEADER_HEIGHT } from '@/components/timeline/WeekHeader'
import { useStore } from '@/lib/store'
import { useDialog } from '@/lib/useDialog'
import type { Assignment } from '@/data/people'
import { Bell } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const COL_W = 11   // px per calendar day — gives ~77px per week, day-level snap
const BAR_H = 28

// ── Project → colour token ────────────────────────────────────────────────────
const PROJECT_COLORS: Record<string, string> = {
  '1':  '#06b6d4', '2':  '#10b981', '3':  '#8b5cf6', '4':  '#f97316',
  '5':  '#06b6d4', '6':  '#8b5cf6', '7':  '#10b981', '8':  '#f97316',
  '9':  '#06b6d4', '10': '#8b5cf6', '11': '#10b981',
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function generateDays(startISO: string, endISO: string): Date[] {
  const days: Date[] = []
  const cur = new Date(startISO); cur.setHours(0, 0, 0, 0)
  const end = new Date(endISO);   end.setHours(0, 0, 0, 0)
  while (cur <= end) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function getColIndex(weeks: Date[], isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  let idx = 0
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i] <= target) idx = i; else break
  }
  return idx
}

// ── Dept filter ───────────────────────────────────────────────────────────────
type DeptFilter = 'All' | 'Design' | 'Engineering' | 'Product' | 'Research' | 'Data'
const DEPT_FILTERS: DeptFilter[] = ['All', 'Design', 'Engineering', 'Product', 'Research', 'Data']
function getDept(role: string): DeptFilter {
  if (role.includes('Designer') || role.includes('Brand'))                                                       return 'Design'
  if (role.includes('Engineer') || role.includes('Developer') || role.includes('Dev') || role.includes('Lead')) return 'Engineering'
  if (role.includes('PM') || role.includes('Product Manager'))                                                   return 'Product'
  if (role.includes('Researcher') || role.includes('Research'))                                                  return 'Research'
  if (role.includes('Analyst'))                                                                                   return 'Data'
  return 'Design'
}

type ViewMode = 'Wk' | 'Mo' | 'Qtr'

const NAV_LINKS = [
  { label: 'People',   href: '/people'   },
  { label: 'Projects', href: '/'         },
  { label: 'Timeline', href: '/timeline' },
]

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: warn ? 'var(--warning-text)' : 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
function HudDivider() {
  return <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { people, projects, toggleTheme, timelineDrafts, recordTimelineDraft, applyTimelineDrafts, discardTimelineDrafts } = useStore()
  const { openProject, openPerson } = useDialog()
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('All')
  const [viewMode]                  = useState<ViewMode>('Wk')
  const scrollRef                   = useRef<HTMLDivElement>(null)

  const isDraft = timelineDrafts.size > 0

  // ── Effective assignment (draft overlay) ──────────────────────────────────
  function effectiveAssignment(personId: string, asgn: Assignment): Assignment {
    const draft = timelineDrafts.get(`${personId}:${asgn.projectId}`)
    return draft ? { ...asgn, startDate: draft.startDate, endDate: draft.endDate } : asgn
  }

  // ── Today ─────────────────────────────────────────────────────────────────
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const weeks    = useMemo(() => generateDays('2025-10-06', '2026-12-28'), [])
  const todayCol = useMemo(() => getColIndex(weeks, todayISO), [weeks, todayISO])

  const filteredPeople = useMemo(
    () => people.filter(p => deptFilter === 'All' || getDept(p.role) === deptFilter),
    [deptFilter, people],
  )

  useEffect(() => {
    if (scrollRef.current && todayCol >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayCol * COL_W - 300)
    }
  }, [todayCol])

  // HUD stats
  const onBenchCount    = people.filter(p => !p.assignments.some(a => a.endDate >= todayISO)).length
  const overloadedCount = people.filter(p => {
    const total = p.assignments.filter(a => a.endDate >= todayISO).reduce((s, a) => s + a.allocationPct, 0)
    return total > 100
  }).length
  const activeProjects  = projects.filter(p => p.startDate <= todayISO && p.endDate >= todayISO).length
  const pipelineCount   = projects.filter(p => p.startDate > todayISO).length

  // Today line x
  const todayLineX = STUB_WIDTH + todayCol * COL_W + Math.floor(COL_W / 2)


  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
      <Sidebar activePage="timeline" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header style={{
          height: 60, flexShrink: 0,
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: 24, paddingRight: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Timeline</span>
            <Badge variant="default" size="sm">{people.length} people</Badge>
            {isDraft && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--info-text, #0369a1)', backgroundColor: 'var(--info-bg, #f0f9ff)', border: '1px solid var(--info-border, #bae6fd)', borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>
                Draft
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 4, flexShrink: 0 }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} style={{
                padding: '4px 12px', borderRadius: 6, fontWeight: 500, fontSize: 14, textDecoration: 'none',
                ...(label === 'Timeline'
                  ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }
                  : { color: 'var(--text-secondary)', border: '1px solid transparent' }),
              }}>{label}</Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
            <Avatar initials="KS" size="sm" style={{ cursor: 'pointer' }} onClick={() => toggleTheme()} />
          </div>
        </header>

        {/* ── HUD ──────────────────────────────────────────────────────────── */}
        <div style={{
          height: 56, flexShrink: 0,
          backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', gap: 20, paddingLeft: 24, paddingRight: 24,
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>Resource Timeline</h1>
          <HudDivider />
          <Stat label="Total People"    value={people.length} />
          <HudDivider />
          <Stat label="On Bench"        value={onBenchCount}    warn={onBenchCount > 0} />
          <HudDivider />
          <Stat label="Overloaded"      value={overloadedCount} warn={overloadedCount > 0} />
          <HudDivider />
          <Stat label="Active Projects" value={activeProjects} />
          <HudDivider />
          <Stat label="Pipeline"        value={pipelineCount} />
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div style={{
          height: 44, flexShrink: 0,
          backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24, paddingRight: 24,
        }}>
          {DEPT_FILTERS.map(f => (
            <button key={f} onClick={() => setDeptFilter(f)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <Badge variant={deptFilter === f ? 'brand' : 'default'} size="sm">{f}</Badge>
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'var(--bg-secondary)', borderRadius: 6, padding: 2 }}>
            {(['Wk', 'Mo', 'Qtr'] as ViewMode[]).map(v => (
              <div key={v} style={{
                width: 40, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: v === viewMode ? 600 : 400,
                color: v === viewMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                backgroundColor: v === viewMode ? 'var(--bg-primary)' : 'transparent',
                boxShadow: v === viewMode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: v === 'Wk' ? 'default' : 'not-allowed',
                opacity: v !== 'Wk' ? 0.5 : 1,
              }}>{v}</div>
            ))}
          </div>
        </div>

        {/* ── Timeline grid ────────────────────────────────────────────────── */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div style={{ position: 'relative', width: STUB_WIDTH + weeks.length * COL_W }}>

            {/* Sticky week header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', height: HEADER_HEIGHT }}>
              <div style={{
                position: 'sticky', left: 0, zIndex: 30, width: STUB_WIDTH, flexShrink: 0,
                height: HEADER_HEIGHT, backgroundColor: 'var(--bg-primary)',
                borderRight: '1px solid var(--border-tertiary)', borderBottom: '1px solid var(--border-tertiary)',
                display: 'flex', alignItems: 'flex-end', paddingLeft: 12, paddingBottom: 8,
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>People</span>
              </div>
              <WeekHeader weeks={weeks} colWidth={COL_W} todayCol={todayCol} />
            </div>

            {/* Person rows */}
            {filteredPeople.map(person => {
              const rowCount = Math.max(1, person.assignments.length)
              const totalH   = rowCount * ROW_HEIGHT

              return (
                <div key={person.id} style={{ display: 'flex' }}>

                  {/* Sticky stub */}
                  <div
                    style={{ position: 'sticky', left: 0, zIndex: 10, flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => openPerson(person.id)}
                  >
                    <TimelineStub
                      name={person.name} role={person.role}
                      initials={person.initials} colorIndex={person.colorIndex ?? 0}
                      rowCount={rowCount}
                    />
                  </div>

                  {/* Bars area */}
                  <div style={{
                    position: 'relative', flex: 1, height: totalH,
                    backgroundColor: 'var(--bg-primary)',
                    borderBottom: '1px solid var(--border-tertiary)',
                    backgroundImage: `repeating-linear-gradient(to right, transparent 0px, transparent ${COL_W - 1}px, var(--border-tertiary) ${COL_W - 1}px, var(--border-tertiary) ${COL_W}px)`,
                  }}>
                    {rowCount > 1 && Array.from({ length: rowCount - 1 }).map((_, ri) => (
                      <div key={ri} style={{
                        position: 'absolute', left: 0, right: 0, top: (ri + 1) * ROW_HEIGHT - 1,
                        height: 1, backgroundColor: 'var(--border-tertiary)', opacity: 0.5, pointerEvents: 'none',
                      }} />
                    ))}

                    {person.assignments.map((rawAsgn, ri) => {
                      const asgn     = effectiveAssignment(person.id, rawAsgn)
                      const startCol = Math.max(0, getColIndex(weeks, asgn.startDate))
                      const endCol   = Math.min(weeks.length - 1, getColIndex(weeks, asgn.endDate))
                      const barLeft  = startCol * COL_W + 4
                      const barWidth = Math.max(8, (endCol - startCol + 1) * COL_W - 8)
                      const barTop   = ri * ROW_HEIGHT + Math.floor((ROW_HEIGHT - BAR_H) / 2)
                      const proj     = projects.find(p => p.id === asgn.projectId)
                      if (!proj) return null

                      const isDraftBar = timelineDrafts.has(`${person.id}:${asgn.projectId}`)
                      const color      = PROJECT_COLORS[asgn.projectId] ?? '#06b6d4'

                      return (
                        <div key={`${asgn.projectId}-${rawAsgn.startDate}`} style={{ position: 'absolute', left: barLeft, top: barTop }}>
                          <TimelineBar
                            projectName={proj.name}
                            client={proj.client}
                            color={color}
                            width={barWidth}
                            dayRate={person.dayRate ?? 0}
                            allocationPct={asgn.allocationPct}
                            startCol={startCol}
                            endCol={endCol}
                            colWidth={COL_W}
                            weeks={weeks}
                            todayCol={todayCol}
                            isDraft={isDraftBar}
                            onBarClick={() => openProject(asgn.projectId)}
                            onResizeEnd={(newStart, newEnd) =>
                              recordTimelineDraft(person.id, asgn.projectId, newStart, newEnd)
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Today vertical line — solid 2px, neutral tokens */}
            <div style={{
              position: 'absolute',
              left:   todayLineX - 1,
              top:    HEADER_HEIGHT,
              bottom: 0,
              width:  2,
              backgroundColor: 'var(--neutral-darkest, #18181b)',
              zIndex: 5,
              pointerEvents: 'none',
            }} />

          </div>
        </div>

        {/* ── Draft footer ─────────────────────────────────────────────────── */}
        {isDraft && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 24px', flexShrink: 0,
            borderTop: '1px solid var(--info-border, #bae6fd)',
            backgroundColor: 'var(--info-bg, #f0f9ff)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--info-text, #0369a1)' }}>
              {timelineDrafts.size} unsaved change{timelineDrafts.size !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={discardTimelineDrafts}
                style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid var(--info-border, #bae6fd)', backgroundColor: 'transparent', color: 'var(--info-text, #0369a1)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >Discard</button>
              <button
                onClick={applyTimelineDrafts}
                style={{ height: 32, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: '#06b6d4', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >Apply Changes</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
