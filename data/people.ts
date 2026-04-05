export interface Skill {
  label: string
}

/** A single project engagement for a team member */
export interface Assignment {
  /** Matches Project.id */
  projectId: string
  /** ISO date — when the person joins the project */
  startDate: string
  /** ISO date — when the person rolls off */
  endDate: string
  allocationPct: number
}

export interface Person {
  id: string
  name: string
  initials: string
  colorIndex?: number
  role: string
  skills: Skill[]
  /** 0–100 = normal, >100 = over-allocated (based on current active assignments) */
  utilizationPct: number
  /** All active projects. Empty / omitted = Unallocated */
  projects?: string[]
  /** 'now' | ISO date string e.g. '2026-04-14' */
  availableFrom?: string
  dayRate?: number
  /** Full assignment history — used by the Timeline view */
  assignments: Assignment[]
}

export const people: Person[] = [
  // ── Original 12 ───────────────────────────────────────────────────────────
  {
    id: '1',
    name: 'Alex Barnes',
    initials: 'AB',
    colorIndex: 0,
    role: 'UX Designer',
    skills: [{ label: 'Figma' }, { label: 'UX Research' }, { label: 'Prototyping' }],
    utilizationPct: 80,
    projects: ['Advisory Portal v2'],
    availableFrom: '2026-06-12',
    dayRate: 620,
    assignments: [
      { projectId: '3', startDate: '2026-02-16', endDate: '2026-06-12', allocationPct: 80 },
    ],
  },
  {
    id: '2',
    name: 'Nina Bell',
    initials: 'NB',
    colorIndex: 1,
    role: 'Business Analyst',
    skills: [{ label: 'Requirements' }, { label: 'Stakeholder Mgmt' }, { label: 'Jira' }],
    utilizationPct: 75,
    projects: ['Digital Banking Redesign'],
    availableFrom: '2026-09-30',
    dayRate: 590,
    assignments: [
      { projectId: '1', startDate: '2026-01-12', endDate: '2026-09-30', allocationPct: 75 },
    ],
  },
  {
    id: '3',
    name: 'Tom Chen',
    initials: 'TC',
    colorIndex: 2,
    role: 'Developer',
    skills: [{ label: 'React' }, { label: 'TypeScript' }, { label: 'Node.js' }],
    utilizationPct: 90,
    projects: ['Carbon Tracker Platform'],
    availableFrom: '2026-08-15',
    dayRate: 700,
    assignments: [
      { projectId: '2', startDate: '2026-02-09', endDate: '2026-08-15', allocationPct: 90 },
    ],
  },
  {
    id: '4',
    name: 'Sarah Clark',
    initials: 'SC',
    colorIndex: 3,
    role: 'Designer',
    skills: [{ label: 'Figma' }, { label: 'Brand' }, { label: 'Illustration' }],
    utilizationPct: 70,
    projects: ['Client Intelligence Hub'],
    availableFrom: '2026-09-19',
    dayRate: 570,
    assignments: [
      { projectId: '6', startDate: '2026-03-02', endDate: '2026-09-19', allocationPct: 70 },
    ],
  },
  {
    id: '5',
    name: 'Lucy Hughes',
    initials: 'LH',
    colorIndex: 4,
    role: 'UX Researcher',
    skills: [{ label: 'User Testing' }, { label: 'Interviews' }, { label: 'Figma' }],
    utilizationPct: 65,
    projects: ['Equities Trade Dashboard'],
    availableFrom: 'now',
    dayRate: 580,
    assignments: [
      // Discovery + Design phases of Equities; rolling off Apr as build phase takes over
      { projectId: '4', startDate: '2025-11-03', endDate: '2026-04-10', allocationPct: 65 },
    ],
  },
  {
    id: '6',
    name: 'Chris Jordan',
    initials: 'CJ',
    colorIndex: 5,
    role: 'Senior Developer',
    skills: [{ label: 'Node.js' }, { label: 'AWS' }, { label: 'PostgreSQL' }, { label: 'Python' }],
    utilizationPct: 120,
    projects: ['Asset Management System', 'Field Operations App'],
    dayRate: 780,
    assignments: [
      { projectId: '5', startDate: '2025-10-13', endDate: '2026-07-03', allocationPct: 60 },
      { projectId: '8', startDate: '2026-01-05', endDate: '2026-07-11', allocationPct: 60 },
    ],
  },
  {
    id: '7',
    name: 'Dev Mehta',
    initials: 'DM',
    colorIndex: 6,
    role: 'Technical Lead',
    skills: [{ label: 'Architecture' }, { label: 'React' }, { label: 'Node.js' }, { label: 'TypeScript' }],
    utilizationPct: 100,
    projects: ['Digital Banking Redesign', 'Compliance Tooling Suite'],
    dayRate: 900,
    assignments: [
      { projectId: '1', startDate: '2026-01-12', endDate: '2026-09-30', allocationPct: 50 },
      { projectId: '7', startDate: '2026-03-09', endDate: '2026-11-25', allocationPct: 50 },
    ],
  },
  {
    id: '8',
    name: "Felix O'Brien",
    initials: 'FO',
    colorIndex: 7,
    role: 'Fullstack Dev',
    skills: [{ label: 'React' }, { label: 'GraphQL' }, { label: 'CSS' }, { label: 'TypeScript' }],
    utilizationPct: 85,
    projects: ['Regulatory Reporting Suite'],
    availableFrom: '2026-04-30',
    dayRate: 680,
    assignments: [
      { projectId: '9', startDate: '2025-11-17', endDate: '2026-04-30', allocationPct: 85 },
    ],
  },
  {
    id: '9',
    name: 'Mia Roberts',
    initials: 'MR',
    colorIndex: 8,
    role: 'Product Manager',
    skills: [{ label: 'Roadmapping' }, { label: 'Jira' }, { label: 'Stakeholder Mgmt' }],
    utilizationPct: 0,
    projects: [],
    availableFrom: 'now',
    dayRate: 750,
    assignments: [
      // Digital Banking — Design phase
      { projectId: '1', startDate: '2026-02-07', endDate: '2026-03-31', allocationPct: 80 },
      // Regulatory Reporting — full Discovery → Build run
      { projectId: '9', startDate: '2025-11-17', endDate: '2026-03-28', allocationPct: 100 },
    ],
  },
  {
    id: '10',
    name: 'Theo Ryan',
    initials: 'TR',
    colorIndex: 9,
    role: 'Senior Designer',
    skills: [{ label: 'Figma' }, { label: 'UX Research' }, { label: 'Design Systems' }],
    utilizationPct: 75,
    projects: ['Advisory Portal v2'],
    availableFrom: '2026-06-12',
    dayRate: 650,
    assignments: [
      { projectId: '3', startDate: '2026-02-16', endDate: '2026-06-12', allocationPct: 75 },
    ],
  },
  {
    id: '11',
    name: 'Kenny Scrimgeour',
    initials: 'KS',
    colorIndex: 0,
    role: 'UX Designer',
    skills: [{ label: 'Figma' }, { label: 'Prototyping' }, { label: 'User Testing' }],
    utilizationPct: 80,
    projects: ['Digital Banking Redesign'],
    availableFrom: '2026-09-30',
    dayRate: 640,
    assignments: [
      { projectId: '1', startDate: '2026-01-12', endDate: '2026-09-30', allocationPct: 80 },
    ],
  },
  {
    id: '12',
    name: 'Phil Wright',
    initials: 'PW',
    colorIndex: 1,
    role: 'Senior Developer',
    skills: [{ label: 'Python' }, { label: 'AWS' }, { label: 'PostgreSQL' }, { label: 'Django' }],
    utilizationPct: 90,
    projects: ['Carbon Tracker Platform'],
    availableFrom: '2026-08-15',
    dayRate: 760,
    assignments: [
      { projectId: '2', startDate: '2026-02-09', endDate: '2026-08-15', allocationPct: 90 },
    ],
  },

  // ── New 12 — doubles the workforce ────────────────────────────────────────
  {
    id: '13',
    name: 'Sophie Adams',
    initials: 'SA',
    colorIndex: 2,
    role: 'Senior PM',
    skills: [{ label: 'Roadmapping' }, { label: 'Stakeholder Mgmt' }, { label: 'Agile' }],
    utilizationPct: 100,
    projects: ['Digital Banking Redesign', 'Advisory Portal v2'],
    availableFrom: '2026-09-30',
    dayRate: 800,
    assignments: [
      { projectId: '1', startDate: '2026-01-12', endDate: '2026-09-30', allocationPct: 50 },
      { projectId: '3', startDate: '2026-02-16', endDate: '2026-06-12', allocationPct: 50 },
    ],
  },
  {
    id: '14',
    name: 'Raj Patel',
    initials: 'RP',
    colorIndex: 3,
    role: 'Senior Engineer',
    skills: [{ label: 'Java' }, { label: 'Kubernetes' }, { label: 'AWS' }, { label: 'TypeScript' }],
    utilizationPct: 80,
    projects: ['Equities Trade Dashboard'],
    availableFrom: '2026-08-28',
    dayRate: 800,
    assignments: [
      { projectId: '4', startDate: '2026-03-02', endDate: '2026-08-28', allocationPct: 80 },
      // Joining Digital Banking build phase from May
      { projectId: '1', startDate: '2026-05-04', endDate: '2026-09-30', allocationPct: 80 },
    ],
  },
  {
    id: '15',
    name: 'Emily Watson',
    initials: 'EW',
    colorIndex: 4,
    role: 'UX Researcher',
    skills: [{ label: 'User Testing' }, { label: 'Interviews' }, { label: 'Research Ops' }],
    utilizationPct: 60,
    projects: ['Compliance Tooling Suite'],
    availableFrom: '2026-05-16',
    dayRate: 560,
    assignments: [
      // Carbon Tracker discovery phase
      { projectId: '2', startDate: '2026-02-09', endDate: '2026-03-27', allocationPct: 60 },
      // Compliance Tooling discovery phase
      { projectId: '7', startDate: '2026-03-09', endDate: '2026-05-15', allocationPct: 60 },
    ],
  },
  {
    id: '16',
    name: 'Jake Morrison',
    initials: 'JM',
    colorIndex: 5,
    role: 'Frontend Developer',
    skills: [{ label: 'React' }, { label: 'TypeScript' }, { label: 'CSS' }, { label: 'Next.js' }],
    utilizationPct: 80,
    projects: ['Digital Banking Redesign'],
    availableFrom: '2026-09-30',
    dayRate: 700,
    assignments: [
      // Joins Digital Banking at build phase
      { projectId: '1', startDate: '2026-04-06', endDate: '2026-09-30', allocationPct: 80 },
    ],
  },
  {
    id: '17',
    name: 'Claire Hughes',
    initials: 'CH',
    colorIndex: 6,
    role: 'Senior Designer',
    skills: [{ label: 'Figma' }, { label: 'Design Systems' }, { label: 'Motion' }],
    utilizationPct: 70,
    projects: ['Advisory Portal v2'],
    availableFrom: '2026-05-16',
    dayRate: 690,
    assignments: [
      // Advisory Portal design phase only
      { projectId: '3', startDate: '2026-02-16', endDate: '2026-05-15', allocationPct: 70 },
    ],
  },
  {
    id: '18',
    name: 'Marcus Lee',
    initials: 'ML',
    colorIndex: 7,
    role: 'Data Analyst',
    skills: [{ label: 'SQL' }, { label: 'Tableau' }, { label: 'Python' }, { label: 'Looker' }],
    utilizationPct: 80,
    projects: ['Client Intelligence Hub'],
    availableFrom: '2026-09-19',
    dayRate: 610,
    assignments: [
      { projectId: '6', startDate: '2026-03-02', endDate: '2026-09-19', allocationPct: 80 },
    ],
  },
  {
    id: '19',
    name: 'Priya Singh',
    initials: 'PS',
    colorIndex: 8,
    role: 'Product Manager',
    skills: [{ label: 'Roadmapping' }, { label: 'Jira' }, { label: 'Finance Domain' }],
    utilizationPct: 100,
    projects: ['Equities Trade Dashboard', 'Asset Management System'],
    availableFrom: '2026-08-28',
    dayRate: 790,
    assignments: [
      { projectId: '4', startDate: '2025-11-03', endDate: '2026-08-28', allocationPct: 50 },
      { projectId: '5', startDate: '2025-10-13', endDate: '2026-07-03', allocationPct: 50 },
    ],
  },
  {
    id: '20',
    name: 'Oliver Stone',
    initials: 'OS',
    colorIndex: 9,
    role: 'Backend Engineer',
    skills: [{ label: 'Python' }, { label: 'Django' }, { label: 'PostgreSQL' }, { label: 'Redis' }],
    utilizationPct: 80,
    projects: ['Equities Trade Dashboard'],
    availableFrom: '2026-08-28',
    dayRate: 730,
    assignments: [
      // Field Operations — early build
      { projectId: '8', startDate: '2026-01-05', endDate: '2026-04-03', allocationPct: 80 },
      // Equities build phase
      { projectId: '4', startDate: '2026-02-02', endDate: '2026-08-28', allocationPct: 80 },
    ],
  },
  {
    id: '21',
    name: 'Hannah Davies',
    initials: 'HD',
    colorIndex: 0,
    role: 'Designer',
    skills: [{ label: 'Figma' }, { label: 'Illustration' }, { label: 'UI Design' }],
    utilizationPct: 75,
    projects: ['Client Intelligence Hub'],
    availableFrom: '2026-06-16',
    dayRate: 540,
    assignments: [
      // Client Intelligence Hub design phase
      { projectId: '6', startDate: '2026-03-02', endDate: '2026-06-15', allocationPct: 75 },
    ],
  },
  {
    id: '22',
    name: 'Liam Foster',
    initials: 'LF',
    colorIndex: 1,
    role: 'Technical Lead',
    skills: [{ label: 'Architecture' }, { label: 'AWS' }, { label: 'Node.js' }, { label: 'DevOps' }],
    utilizationPct: 120,
    projects: ['Asset Management System', 'Field Operations App'],
    dayRate: 860,
    assignments: [
      { projectId: '5', startDate: '2026-01-05', endDate: '2026-07-03', allocationPct: 60 },
      { projectId: '8', startDate: '2026-03-02', endDate: '2026-07-11', allocationPct: 60 },
    ],
  },
  {
    id: '23',
    name: 'Zoe Carter',
    initials: 'ZC',
    colorIndex: 2,
    role: 'Senior Developer',
    skills: [{ label: 'React' }, { label: 'TypeScript' }, { label: 'GraphQL' }, { label: 'Testing' }],
    utilizationPct: 0,
    projects: [],
    availableFrom: 'now',
    dayRate: 740,
    assignments: [
      // Joins Compliance Tooling build phase from July
      { projectId: '7', startDate: '2026-07-06', endDate: '2026-11-25', allocationPct: 80 },
    ],
  },
  {
    id: '24',
    name: 'Ben Taylor',
    initials: 'BT',
    colorIndex: 3,
    role: 'Business Analyst',
    skills: [{ label: 'Requirements' }, { label: 'Process Mapping' }, { label: 'SQL' }],
    utilizationPct: 50,
    projects: ['Regulatory Reporting Suite'],
    availableFrom: '2026-04-13',
    dayRate: 560,
    assignments: [
      // Regulatory Reporting — ending Apr 30
      { projectId: '9', startDate: '2025-11-17', endDate: '2026-04-12', allocationPct: 50 },
      // Moves to Client Intelligence Hub
      { projectId: '6', startDate: '2026-04-13', endDate: '2026-09-19', allocationPct: 50 },
    ],
  },

  // ── Historical contributors (Discovery / Design phase consultants) ─────────
  {
    id: '25',
    name: 'Rachel Okafor',
    initials: 'RO',
    colorIndex: 4,
    role: 'Strategy Consultant',
    skills: [{ label: 'Discovery' }, { label: 'Stakeholder Mgmt' }, { label: 'Workshops' }],
    utilizationPct: 0,
    projects: [],
    availableFrom: 'now',
    dayRate: 650,
    assignments: [
      // Asset Management — Discovery
      { projectId: '5', startDate: '2025-10-13', endDate: '2025-11-08', allocationPct: 100 },
      // Equities Trade — Discovery
      { projectId: '4', startDate: '2025-11-03', endDate: '2025-12-03', allocationPct: 100 },
      // Digital Banking — Discovery
      { projectId: '1', startDate: '2026-01-12', endDate: '2026-02-07', allocationPct: 100 },
    ],
  },
  {
    id: '26',
    name: 'James Hargreaves',
    initials: 'JH',
    colorIndex: 6,
    role: 'Lead Researcher',
    skills: [{ label: 'UX Research' }, { label: 'Prototyping' }, { label: 'User Testing' }],
    utilizationPct: 0,
    projects: [],
    availableFrom: 'now',
    dayRate: 590,
    assignments: [
      // Asset Management — Design phase
      { projectId: '5', startDate: '2025-11-08', endDate: '2025-12-31', allocationPct: 80 },
      // Equities Trade — Design phase
      { projectId: '4', startDate: '2025-12-03', endDate: '2026-02-01', allocationPct: 80 },
    ],
  },
]
