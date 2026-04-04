export type ProjectStatus = 'Healthy' | 'At risk' | 'Attention needed'
export type ProjectPhase  = 'Discovery' | 'Design' | 'Build' | 'UAT' | 'Live'
export type PhaseProgress = 'Early' | 'Mid' | 'Late'

export interface TeamMember {
  initials: string
  colorIndex?: number
}

export interface Project {
  id: string
  name: string
  client: string
  sector: 'Finance' | 'Energy' | 'Pro Services'
  status: ProjectStatus
  phase: ProjectPhase
  phaseProgress: PhaseProgress
  /** ISO date the project kicks off */
  startDate: string
  /** ISO date the project is due to complete */
  endDate: string
  /** Human-readable due label for existing UI */
  dueDate: string
  allocated: number
  capacity: number
  /** Total project budget in £ */
  budgetTotal: number
  /**
   * Committed spend already incurred (rolled-off resources, invoiced work, etc.)
   * Acts as a floor so removing current resources cannot reset the bar to zero.
   */
  historicalSpend: number
  warningText: string | null
  team: TeamMember[]
}

export const projects: Project[] = [
  // ── Active projects ──────────────────────────────────────────────────────
  {
    id: '1',
    name: 'Digital Banking Redesign',
    client: 'Barclays',
    sector: 'Finance',
    status: 'At risk',
    phase: 'Build',
    phaseProgress: 'Late',
    startDate: '2026-01-12',
    endDate: '2026-09-30',
    dueDate: 'Due 30 Sep',
    allocated: 5,
    capacity: 6,
    budgetTotal: 185000,
    historicalSpend: 28500,
    warningText: 'Burn rate 18% above forecast',
    team: [
      { initials: 'NB', colorIndex: 1 },
      { initials: 'DM', colorIndex: 6 },
      { initials: 'KS', colorIndex: 0 },
      { initials: 'SA', colorIndex: 2 },
      { initials: 'JM', colorIndex: 5 },
    ],
  },
  {
    id: '2',
    name: 'Carbon Tracker Platform',
    client: 'Shell',
    sector: 'Energy',
    status: 'Healthy',
    phase: 'Discovery',
    phaseProgress: 'Mid',
    startDate: '2026-02-09',
    endDate: '2026-08-15',
    dueDate: 'Due 15 Aug',
    allocated: 2,
    capacity: 3,
    budgetTotal: 75000,
    historicalSpend: 9200,
    warningText: null,
    team: [{ initials: 'TC', colorIndex: 2 }, { initials: 'PW', colorIndex: 1 }],
  },
  {
    id: '3',
    name: 'Advisory Portal v2',
    client: 'Deloitte',
    sector: 'Pro Services',
    status: 'Healthy',
    phase: 'Design',
    phaseProgress: 'Mid',
    startDate: '2026-02-16',
    endDate: '2026-06-12',
    dueDate: 'Due 12 Jun',
    allocated: 3,
    capacity: 4,
    budgetTotal: 50000,
    historicalSpend: 7800,
    warningText: null,
    team: [
      { initials: 'AB', colorIndex: 0 },
      { initials: 'TR', colorIndex: 9 },
      { initials: 'SA', colorIndex: 2 },
    ],
  },
  {
    id: '4',
    name: 'Equities Trade Dashboard',
    client: 'Goldman Sachs',
    sector: 'Finance',
    status: 'Attention needed',
    phase: 'Build',
    phaseProgress: 'Late',
    startDate: '2025-11-03',
    endDate: '2026-08-28',
    dueDate: 'Due 28 Aug',
    allocated: 3,
    capacity: 4,
    budgetTotal: 125000,
    historicalSpend: 42000,
    warningText: '14% over budget — escalate now',
    team: [
      { initials: 'PS', colorIndex: 8 },
      { initials: 'OS', colorIndex: 9 },
      { initials: 'RP', colorIndex: 3 },
    ],
  },
  {
    id: '5',
    name: 'Asset Management System',
    client: 'National Grid',
    sector: 'Energy',
    status: 'At risk',
    phase: 'UAT',
    phaseProgress: 'Late',
    startDate: '2025-10-13',
    endDate: '2026-07-03',
    dueDate: 'Due 3 Jul',
    allocated: 3,
    capacity: 4,
    budgetTotal: 100000,
    historicalSpend: 38500,
    warningText: 'UAT delays risking go-live date',
    team: [
      { initials: 'CJ', colorIndex: 5 },
      { initials: 'PS', colorIndex: 8 },
      { initials: 'LF', colorIndex: 1 },
    ],
  },
  {
    id: '6',
    name: 'Client Intelligence Hub',
    client: 'PwC',
    sector: 'Pro Services',
    status: 'Healthy',
    phase: 'Design',
    phaseProgress: 'Mid',
    startDate: '2026-03-02',
    endDate: '2026-09-19',
    dueDate: 'Due 19 Sep',
    allocated: 3,
    capacity: 4,
    budgetTotal: 85000,
    historicalSpend: 6400,
    warningText: null,
    team: [
      { initials: 'SC', colorIndex: 3 },
      { initials: 'ML', colorIndex: 7 },
      { initials: 'HD', colorIndex: 0 },
    ],
  },
  {
    id: '7',
    name: 'Compliance Tooling Suite',
    client: 'HSBC',
    sector: 'Finance',
    status: 'Healthy',
    phase: 'Discovery',
    phaseProgress: 'Mid',
    startDate: '2026-03-09',
    endDate: '2026-11-25',
    dueDate: 'Due 25 Nov',
    allocated: 2,
    capacity: 4,
    budgetTotal: 95000,
    historicalSpend: 4200,
    warningText: null,
    team: [
      { initials: 'DM', colorIndex: 6 },
      { initials: 'EW', colorIndex: 4 },
    ],
  },
  {
    id: '8',
    name: 'Field Operations App',
    client: 'BP',
    sector: 'Energy',
    status: 'At risk',
    phase: 'Build',
    phaseProgress: 'Late',
    startDate: '2026-01-05',
    endDate: '2026-07-11',
    dueDate: 'Due 11 Jul',
    allocated: 3,
    capacity: 3,
    budgetTotal: 100000,
    historicalSpend: 21000,
    warningText: 'Senior dev overloaded — CJ on two projects',
    team: [
      { initials: 'CJ', colorIndex: 5 },
      { initials: 'LF', colorIndex: 1 },
    ],
  },
  {
    id: '9',
    name: 'Regulatory Reporting Suite',
    client: 'Standard Chartered',
    sector: 'Finance',
    status: 'Healthy',
    phase: 'Live',
    phaseProgress: 'Late',
    startDate: '2025-11-17',
    endDate: '2026-04-30',
    dueDate: 'Due 30 Apr',
    allocated: 2,
    capacity: 2,
    budgetTotal: 50000,
    historicalSpend: 16800,
    warningText: null,
    team: [
      { initials: 'FO', colorIndex: 7 },
      { initials: 'BT', colorIndex: 5 },
    ],
  },

  // ── Pipeline — not yet started ────────────────────────────────────────────
  {
    id: '10',
    name: 'Trade Analytics Portal',
    client: 'Morgan Stanley',
    sector: 'Finance',
    status: 'Healthy',
    phase: 'Discovery',
    phaseProgress: 'Early',
    startDate: '2026-05-04',
    endDate: '2026-11-27',
    dueDate: 'Starts 4 May',
    allocated: 0,
    capacity: 5,
    budgetTotal: 110000,
    historicalSpend: 0,
    warningText: null,
    team: [],
  },
  {
    id: '11',
    name: 'Digital Onboarding Platform',
    client: 'Lloyds Bank',
    sector: 'Finance',
    status: 'Healthy',
    phase: 'Discovery',
    phaseProgress: 'Early',
    startDate: '2026-06-08',
    endDate: '2026-12-18',
    dueDate: 'Starts 8 Jun',
    allocated: 0,
    capacity: 6,
    budgetTotal: 125000,
    historicalSpend: 0,
    warningText: null,
    team: [],
  },
]
