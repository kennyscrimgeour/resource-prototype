'use client'

import { useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { useStore } from '@/lib/store'
import { useDialog } from '@/lib/useDialog'
import { Search, ChevronDown, Users, FolderKanban, CalendarRange, Settings } from 'lucide-react'
import type { Person } from '@/data/people'
import type { Project } from '@/data/projects'

type PeopleChip   = 'All' | 'Allocated' | 'Overloaded' | 'On Bench'
type ProjectsChip = 'All' | 'Healthy' | 'At risk' | 'Over budget'

// ── Colours (always-dark sidebar, not affected by app theme) ──────────────────
const S = {
  bg:          '#09090b',
  bgSecondary: '#18181b',
  border:      '#27272a',
  textPrimary: '#fafafa',
  textMuted:   '#a1a1aa',
  textTertiary:'#52525b',
  brandActive: '#67e8f9',   // active nav tab highlight
  dotAllocated:'#22d3ee',   // brand-primary
  dotBench:    '#fbbf24',   // warning
  dotOverload: '#f87171',   // error
  tabHealthy:  '#00d492',   // success
  tabAtRisk:   '#fbbf24',   // warning
  tabError:    '#f87171',   // error
  redName:     '#fca5a5',   // error-soft  — over-budget project name
  redClient:   '#f87171',   // error-muted — over-budget client
}

type ActivePage = 'people' | 'projects' | 'timeline'

interface SidebarProps {
  activePage?: ActivePage
}

const NAV: { label: string; href: string; key: ActivePage; Icon: React.ElementType }[] = [
  { label: 'People',   href: '/people',   key: 'people',   Icon: Users          },
  { label: 'Projects', href: '/',         key: 'projects', Icon: FolderKanban   },
  { label: 'Timeline', href: '/timeline', key: 'timeline', Icon: CalendarRange  },
]

function personDotColor(p: Person): string {
  if (!p.projects || p.projects.length === 0) return S.dotBench
  if (p.utilizationPct > 100)                 return S.dotOverload
  return S.dotAllocated
}

function projectTabColor(p: Project): string {
  if (p.status === 'Healthy')          return S.tabHealthy
  if (p.status === 'At risk')          return S.tabAtRisk
  return S.tabError
}

function Divider() {
  return (
    <div className="py-1.5 px-1">
      <div style={{ height: 1, backgroundColor: S.border }} />
    </div>
  )
}

export default function Sidebar({ activePage = 'projects' }: SidebarProps) {
  const { people, projects }       = useStore()
  const { openProject, openPerson } = useDialog()
  const [peopleChip,   setPeopleChip]   = useState<PeopleChip>('All')
  const [projectsChip, setProjectsChip] = useState<ProjectsChip>('All')

  const filteredPeople = people.filter(p => {
    if (peopleChip === 'On Bench')   return !p.projects || p.projects.length === 0
    if (peopleChip === 'Overloaded') return p.utilizationPct > 100
    if (peopleChip === 'Allocated')  return !!p.projects?.length && p.utilizationPct <= 100
    return true
  })

  const filteredProjects = projects.filter(p => {
    if (projectsChip === 'Over budget') return p.status === 'Attention needed'
    if (projectsChip === 'At risk')     return p.status === 'At risk'
    if (projectsChip === 'Healthy')     return p.status === 'Healthy'
    return true
  })

  return (
    <aside
      className="flex flex-col w-[220px] h-full flex-shrink-0"
      style={{ backgroundColor: S.bg, borderRight: `1px solid ${S.border}` }}
    >
      {/* Workspace header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 56, backgroundColor: S.bgSecondary, borderBottom: `1px solid ${S.border}` }}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: S.textPrimary }}>Momentum Agency</p>
          <p className="text-[11px]" style={{ color: S.textMuted }}>London Digital</p>
        </div>
        <ChevronDown size={14} style={{ color: S.textTertiary, flexShrink: 0 }} />
      </div>

      {/* Fixed: Search + Nav — never scrolls */}
      <div className="flex-shrink-0 flex flex-col gap-0.5 px-2 pt-3 pb-2" style={{ borderBottom: `1px solid ${S.border}` }}>
        {/* Search */}
        <div
          className="flex items-center gap-2 px-[10px] text-xs rounded-md mb-1"
          style={{ height: 32, backgroundColor: S.bg, border: `1px solid ${S.border}`, color: S.textMuted }}
        >
          <Search size={12} style={{ flexShrink: 0 }} />
          Search ⌘K
        </div>

        {/* Nav: People | Projects | Timeline */}
        {NAV.map(({ label, href, key, Icon }) => {
          const isActive = activePage === key
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-2 px-[10px] rounded-md text-xs"
              style={{
                height: 32,
                backgroundColor: isActive ? S.brandActive : 'transparent',
                color: isActive ? S.bgSecondary : S.textMuted,
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
              }}
            >
              <Icon size={14} style={{ flexShrink: 0, color: isActive ? S.bgSecondary : S.textTertiary }} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Scrollable body — only the People + Projects lists */}
      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">

        {/* ── PEOPLE ──────────────────────────────────────────────────── */}
        <p className="text-[10px] font-bold px-2 py-1" style={{ color: S.textMuted }}>PEOPLE</p>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1 px-1 pb-1">
          {([
            { label: 'Allocated' as PeopleChip,  activeColor: S.dotAllocated },
            { label: 'Overloaded' as PeopleChip, activeColor: S.dotOverload  },
            { label: 'On Bench' as PeopleChip,   activeColor: S.dotBench     },
          ]).map(({ label, activeColor }) => {
            const isActive = peopleChip === label
            return (
              <button
                key={label}
                onClick={() => setPeopleChip(isActive ? 'All' : label)}
                className="px-1.5 rounded text-[10px] font-medium"
                style={{
                  height: 20,
                  backgroundColor: S.bgSecondary,
                  border: `1px solid ${isActive ? activeColor : S.border}`,
                  color: isActive ? activeColor : S.textMuted,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* People list */}
        {filteredPeople.length === 0 && (
          <p className="text-[10px] px-2 py-1" style={{ color: S.textTertiary }}>No people match</p>
        )}
        {filteredPeople.map(p => (
          <button
            key={p.id}
            onClick={() => openPerson(p.id)}
            className="flex items-center gap-1.5 px-1 min-w-0 flex-shrink-0 w-full text-left rounded-md"
            style={{ height: 28, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = S.bgSecondary)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span
              className="flex-shrink-0"
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: personDotColor(p) }}
            />
            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: S.textPrimary }}>
              {p.name}
            </span>
            <span className="text-[11px] truncate" style={{ color: S.textMuted }}>
              {p.role}
            </span>
          </button>
        ))}

        <Divider />

        {/* ── PROJECTS ────────────────────────────────────────────────── */}
        <p className="text-[10px] font-bold px-2 py-1" style={{ color: S.textMuted }}>PROJECTS</p>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1 px-1 pb-1">
          {([
            { label: 'Healthy' as ProjectsChip,     activeColor: S.tabHealthy },
            { label: 'At risk' as ProjectsChip,     activeColor: S.tabAtRisk  },
            { label: 'Over budget' as ProjectsChip, activeColor: S.tabError   },
          ]).map(({ label, activeColor }) => {
            const isActive = projectsChip === label
            return (
              <button
                key={label}
                onClick={() => setProjectsChip(isActive ? 'All' : label)}
                className="px-1.5 rounded text-[10px] font-medium"
                style={{
                  height: 20,
                  backgroundColor: S.bgSecondary,
                  border: `1px solid ${isActive ? activeColor : S.border}`,
                  color: isActive ? activeColor : S.textMuted,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Projects list */}
        {filteredProjects.length === 0 && (
          <p className="text-[10px] px-2 py-1" style={{ color: S.textTertiary }}>No projects match</p>
        )}
        {filteredProjects.map(proj => {
          const isOverBudget = proj.status === 'Attention needed'
          const tabColor = projectTabColor(proj)
          const nameColor = isOverBudget ? S.redName : S.textPrimary
          const clientColor = isOverBudget ? S.redClient : S.textMuted

          return (
            <button
              key={proj.id}
              onClick={() => openProject(proj.id)}
              className="flex items-center gap-1.5 px-1 min-w-0 flex-shrink-0 w-full text-left rounded-md"
              style={{ height: 28, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = S.bgSecondary)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span
                className="flex-shrink-0"
                style={{ width: 4, height: 12, borderRadius: 3, backgroundColor: tabColor }}
              />
              <span
                className="text-[11px] font-semibold truncate"
                style={{ color: nameColor, maxWidth: 100 }}
              >
                {proj.name}
              </span>
              <span className="text-[11px] truncate" style={{ color: clientColor }}>
                {proj.client}
              </span>
            </button>
          )
        })}
      </div>

      {/* User bar */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{ height: 56, borderTop: `1px solid ${S.border}` }}
      >
        <div className="flex items-center gap-3">
          <Avatar initials="KS" size="sm" colorIndex={6} />
          <div>
            <p className="text-[11px] font-medium" style={{ color: S.textPrimary }}>Kenny Scrimgeour</p>
            <p className="text-[10px]" style={{ color: S.textMuted }}>Resource Manager</p>
          </div>
        </div>
        <Settings size={15} style={{ color: S.textTertiary, flexShrink: 0 }} />
      </div>
    </aside>
  )
}
