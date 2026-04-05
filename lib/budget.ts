import type { Project, ProjectPhase } from '@/data/projects'
import type { Person } from '@/data/people'

export const PHASE_ALLOCATIONS: Record<ProjectPhase, number> = {
  Discovery: 0.10,
  Design:    0.20,
  Build:     0.50,
  UAT:       0.15,
  Live:      0.05,
}

const PHASE_ORDER: ProjectPhase[] = ['Discovery', 'Design', 'Build', 'UAT', 'Live']

/** Count Mon–Fri days in the half-open interval [start, end) */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur < end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Phase date boundaries derived from proportional project duration */
export function getPhaseDateRanges(
  project: Project,
): Record<ProjectPhase, { start: Date; end: Date }> {
  const projectStart = new Date(project.startDate)
  const projectEnd   = new Date(project.endDate)
  const totalMs      = projectEnd.getTime() - projectStart.getTime()

  let cumulative = 0
  const ranges = {} as Record<ProjectPhase, { start: Date; end: Date }>
  for (const phase of PHASE_ORDER) {
    const phaseStart = new Date(projectStart.getTime() + totalMs * cumulative)
    cumulative += PHASE_ALLOCATIONS[phase]
    const phaseEnd = new Date(projectStart.getTime() + totalMs * cumulative)
    ranges[phase] = { start: phaseStart, end: phaseEnd }
  }
  return ranges
}

/** Budget (£) allocated to each phase */
export function getPhaseBudgets(project: Project): Record<ProjectPhase, number> {
  const result = {} as Record<ProjectPhase, number>
  for (const phase of PHASE_ORDER) {
    result[phase] = Math.round(project.budgetTotal * PHASE_ALLOCATIONS[phase])
  }
  return result
}

export interface ProjectBudgetResult {
  /** All costs incurred before today (locked, cannot be reduced) */
  actualSpend:    number
  /** Costs from today → endDate based on current allocations */
  projectedSpend: number
  /** actualSpend + projectedSpend (convenience) */
  spent:          number
  budgetUsed:     number  // 0–1 ratio, capped at 1.0
  overBudget:     boolean
  budgetOverrun:  number  // fraction over budget, e.g. 0.14 = 14%
  phaseBudgets:   Record<ProjectPhase, number>
  phaseSpend:     Record<ProjectPhase, number>
}

/**
 * Compute actual spend to date from resource day rates × working days × allocation.
 * Phase spend is attributed by overlapping the assignment window with each phase window.
 */
export function computeProjectBudget(
  project: Project,
  people: Person[],
  today: Date = new Date(),
): ProjectBudgetResult {
  const phaseRanges  = getPhaseDateRanges(project)
  const phaseBudgets = getPhaseBudgets(project)
  const phaseSpend   = Object.fromEntries(
    PHASE_ORDER.map(p => [p, 0]),
  ) as Record<ProjectPhase, number>

  let resourceActual    = 0
  let resourceProjected = 0

  for (const person of people) {
    if (!person.dayRate) continue

    for (const asgn of person.assignments) {
      if (asgn.projectId !== project.id) continue

      const asgnStart = new Date(asgn.startDate)
      const asgnEnd   = new Date(asgn.endDate)
      // Actual window uses the committed (locked) allocation; projected uses the current slider value
      const actualRate     = person.dayRate * ((asgn.committedAllocationPct ?? asgn.allocationPct) / 100)
      const projectedRate  = person.dayRate * (asgn.allocationPct / 100)

      // Actual: [asgnStart, min(asgnEnd, today))
      const actualEnd = asgnEnd < today ? asgnEnd : today
      if (asgnStart < actualEnd) {
        // Phase attribution for phaseSpend (actual window only)
        for (const phase of PHASE_ORDER) {
          const { start: phStart, end: phEnd } = phaseRanges[phase]
          const oStart = asgnStart > phStart ? asgnStart : phStart
          const oEnd   = actualEnd  < phEnd  ? actualEnd  : phEnd
          if (oStart >= oEnd) continue
          const days = businessDaysBetween(oStart, oEnd)
          phaseSpend[phase] += Math.round(actualRate * days)
        }
        resourceActual += Math.round(actualRate * businessDaysBetween(asgnStart, actualEnd))
      }

      // Projected: [max(asgnStart, today), asgnEnd)
      const projStart = asgnStart > today ? asgnStart : today
      if (projStart < asgnEnd) {
        resourceProjected += Math.round(projectedRate * businessDaysBetween(projStart, asgnEnd))
      }
    }
  }

  const actualSpend    = resourceActual    + project.historicalSpend
  const projectedSpend = resourceProjected
  const spent          = actualSpend + projectedSpend
  const budgetUsed     = project.budgetTotal > 0
    ? Math.min(actualSpend / project.budgetTotal, 1)
    : 0
  const overBudget    = spent > project.budgetTotal
  const budgetOverrun = overBudget
    ? (spent - project.budgetTotal) / project.budgetTotal
    : 0

  return { actualSpend, projectedSpend, spent, budgetUsed, overBudget, budgetOverrun, phaseBudgets, phaseSpend }
}
