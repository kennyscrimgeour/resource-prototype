'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import PersonCard from '@/components/PersonCard'
import PersonRow from '@/components/PersonRow'
import { useStore } from '@/lib/store'
import { useDialog } from '@/lib/useDialog'
import { Search, Bell } from 'lucide-react'

type ViewMode = 'card' | 'table'
type DeptFilter = 'All' | 'Design' | 'Engineering' | 'Product' | 'Research' | 'Data'
type UtilFilter = 'All' | 'Available' | 'Allocated' | 'Over-allocated'

const DEPT_FILTERS: DeptFilter[] = ['All', 'Design', 'Engineering', 'Product', 'Research', 'Data']

function getDept(role: string): DeptFilter {
  if (role.includes('Designer') || role.includes('Brand')) return 'Design'
  if (role.includes('Engineer') || role.includes('Developer') || role.includes('Tech Lead')) return 'Engineering'
  if (role.includes('Product')) return 'Product'
  if (role.includes('Research')) return 'Research'
  if (role.includes('Analyst')) return 'Data'
  return 'Design'
}

const _d = new Date()
const TODAY_ISO = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

function getActiveAlloc(person: import('@/data/people').Person): number {
  return person.assignments
    .filter(a => a.endDate >= TODAY_ISO)
    .reduce((sum, a) => sum + a.allocationPct, 0)
}

function getUtilStatus(totalAlloc: number): UtilFilter {
  if (totalAlloc > 100) return 'Over-allocated'
  if (totalAlloc > 0)   return 'Allocated'
  return 'Available'
}

const utilFilters: { label: string; value: UtilFilter; activeVariant: 'success' | 'warning' | 'error' }[] = [
  { label: 'Available',      value: 'Available',      activeVariant: 'success' },
  { label: 'Allocated',      value: 'Allocated',      activeVariant: 'warning' },
  { label: 'Over-allocated', value: 'Over-allocated', activeVariant: 'error'   },
]

const NAV_LINKS = [
  { label: 'People',   href: '/people'   },
  { label: 'Projects', href: '/'         },
  { label: 'Timeline', href: '/timeline' },
]

export default function PeoplePage() {
  const { people, projects, toggleTheme } = useStore()
  const { openPerson }          = useDialog()
  const [viewMode, setViewMode]     = useState<ViewMode>('card')
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('All')
  const [utilFilter, setUtilFilter] = useState<UtilFilter>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = people.filter(p => {
    const deptMatch  = deptFilter === 'All' || getDept(p.role) === deptFilter
    const alloc      = getActiveAlloc(p)
    const utilMatch  = utilFilter === 'All' || getUtilStatus(alloc) === utilFilter
    const q          = searchQuery.toLowerCase()
    const searchMatch = q === '' ||
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.skills.some(s => s.label.toLowerCase().includes(q))
    return deptMatch && utilMatch && searchMatch
  })

  const avgUtil    = people.length > 0
    ? Math.round(people.reduce((s, p) => s + getActiveAlloc(p), 0) / people.length)
    : 0
  const benchCount = people.filter(p => getActiveAlloc(p) === 0).length
  const overCount  = people.filter(p => getActiveAlloc(p) > 100).length

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Sidebar activePage="people" />

      <div className="flex flex-col flex-1 min-w-0">

        {/* Nav bar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', height: 60 }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>People</span>
            <Badge variant="default" size="sm">{people.length} people</Badge>
          </div>

          <div className="flex items-center rounded-lg p-1 gap-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', flexShrink: 0 }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="px-3 py-1 rounded font-medium text-sm transition-colors"
                style={label === 'People'
                  ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }
                  : { color: 'var(--text-secondary)', border: '1px solid transparent' }}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', width: 260 }}
            >
              <Search size={14} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search people, skills…"
                className="bg-transparent flex-1 outline-none text-sm min-w-0"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
            <Avatar initials="KS" size="sm" style={{ cursor: 'pointer' }} onClick={() => toggleTheme()} />
          </div>
        </header>

        {/* HUD strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingLeft: 24,
            paddingRight: 24,
            flexShrink: 0,
            height: 56,
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            All People
          </h1>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Avg Utilisation</span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: avgUtil >= 90 ? 'var(--warning-text)' : 'var(--text-primary)' }}>
              {avgUtil}%
            </span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>On Bench</span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: benchCount > 0 ? 'var(--warning-text)' : 'var(--text-primary)' }}>
              {benchCount}
            </span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Over-allocated</span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: overCount > 0 ? 'var(--error-text)' : 'var(--text-primary)' }}>
              {overCount}
            </span>
          </div>

          <button style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            Expand ▼
          </button>
        </div>

        {/* Filter bar */}
        <div
          className="flex items-center gap-1.5 px-6 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', height: 44 }}
        >
          {DEPT_FILTERS.map(f => (
            <button key={f} onClick={() => setDeptFilter(f)}>
              <Badge variant={deptFilter === f ? 'brand' : 'default'} size="sm">{f}</Badge>
            </button>
          ))}

          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-secondary)' }} />

          {utilFilters.map(f => (
            <button key={f.value} onClick={() => setUtilFilter(utilFilter === f.value ? 'All' : f.value)}>
              <Badge variant={utilFilter === f.value ? f.activeVariant : 'default'} size="sm">
                {f.label}
              </Badge>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {/* Card / Table toggle */}
            <div className="flex items-center rounded p-0.5 gap-0.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setViewMode('card')}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={viewMode === 'card'
                  ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: 'var(--text-tertiary)' }}
              >
                ⊞ Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={viewMode === 'table'
                  ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: 'var(--text-tertiary)' }}
              >
                ☰ Table
              </button>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sort: Name ↓</span>
          </div>
        </div>

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto ${viewMode === 'card' ? 'p-6' : ''}`}>
          {viewMode === 'card' ? (
            filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No people match the selected filters.
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {filtered.map(p => <PersonCard key={p.id} person={p} projects={projects} onOpen={() => openPerson(p.id)} />)}
              </div>
            )
          ) : (
            <div>
              {/* Table header — columns match PersonRow exactly */}
              <div
                className="flex items-center h-8 px-3 gap-4 text-[11px] font-semibold"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-secondary)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <div className="w-[180px] flex-shrink-0">Name</div>
                <div className="w-32 flex-shrink-0">Role</div>
                <div className="w-40 flex-shrink-0">Skills</div>
                <div className="w-[100px] flex-shrink-0">Utilisation</div>
                <div className="flex-1 min-w-0">Project</div>
                <div className="w-24 flex-shrink-0">Available</div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  No people match the selected filters.
                </div>
              ) : (
                filtered.map(p => <PersonRow key={p.id} person={p} projects={projects} onOpen={() => openPerson(p.id)} />)
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
