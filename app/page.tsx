'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import BudgetBar from '@/components/ui/BudgetBar'
import ProjectCard from '@/components/ProjectCard'
import { useStore } from '@/lib/store'
import { useDialog } from '@/lib/useDialog'
import { computeProjectBudget } from '@/lib/budget'
import { Search, Bell } from 'lucide-react'
import type { ProjectStatus } from '@/data/projects'

type SectorFilter = 'All' | 'Finance' | 'Energy' | 'Pro Services'
type StatusFilter = 'All' | ProjectStatus

export default function ProjectsView() {
  const { projects, people, toggleTheme } = useStore()
  const { openProject, openPerson } = useDialog()

  function handleOpenPerson(initials: string) {
    const person = people.find(p => p.initials === initials)
    if (person) openPerson(person.id)
  }
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')

  const filtered = projects.filter(p => {
    const sectorMatch = sectorFilter === 'All' || p.sector === sectorFilter
    const statusMatch = statusFilter === 'All' || p.status === statusFilter
    return sectorMatch && statusMatch
  })

  const sectorFilters: SectorFilter[] = ['All', 'Finance', 'Energy', 'Pro Services']
  const statusFilters: { label: string; value: StatusFilter; activeVariant: 'success' | 'warning' | 'error' }[] = [
    { label: 'Healthy',          value: 'Healthy',          activeVariant: 'success' },
    { label: 'At risk',          value: 'At risk',          activeVariant: 'warning' },
    { label: 'Attention needed', value: 'Attention needed', activeVariant: 'error'   },
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'radial-gradient(ellipse at top center, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)' }}>
      <Sidebar activePage="projects" />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Nav bar */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', height: 60 }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Projects</span>
            <Badge variant="default" size="sm">{projects.length} projects</Badge>
          </div>

          <div className="flex items-center rounded-lg p-1 gap-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', flexShrink: 0 }}>
            {[
              { label: 'People',   href: '/people'   },
              { label: 'Projects', href: '/'         },
              { label: 'Timeline', href: '/timeline' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="px-3 py-1 rounded font-medium text-sm transition-colors"
                style={label === 'Projects'
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
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', width: 260, minWidth: 0 }}
            >
              <Search size={14} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="whitespace-nowrap truncate">Search projects, people, skills… ⌘K</span>
            </div>
            <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
            <Avatar initials="KS" size="sm" style={{ cursor: 'pointer' }} onClick={() => toggleTheme()} />
          </div>
        </header>

        {/* Page header — title + HUD metrics inline left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 20,
            paddingLeft: 24,
            paddingRight: 24,
            flexShrink: 0,
            height: 56,
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>All Projects</h1>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Utilisation</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-text)', whiteSpace: 'nowrap' }}>91%</span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Bench</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>1</span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-primary)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, width: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Aggregated Budget</span>
              <Badge variant="success" size="sm">Healthy</Badge>
            </div>
            <BudgetBar actualSpend={54000} projectedSpend={18000} budgetTotal={100000} height={6} />
          </div>

          <button style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
            Expand ▼
          </button>
        </div>

        {/* Filter bar */}
        <div
          className="flex items-center gap-1.5 px-6 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)', height: 44 }}
        >
          {sectorFilters.map(f => (
            <button key={f} onClick={() => setSectorFilter(f)}>
              <Badge variant={sectorFilter === f ? 'brand' : 'default'} size="sm">{f}</Badge>
            </button>
          ))}

          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-secondary)' }} />

          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(statusFilter === f.value ? 'All' : f.value)}>
              <Badge variant={statusFilter === f.value ? f.activeVariant : 'default'} size="sm">
                {f.label}
              </Badge>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Sort: Last updated <span>↓</span>
          </div>
        </div>

        {/* Project grid */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} budget={computeProjectBudget(p, people)} onOpen={() => openProject(p.id)} onOpenPerson={handleOpenPerson} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No projects match the selected filters.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
