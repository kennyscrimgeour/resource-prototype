'use client'

import { useDialog } from '@/lib/useDialog'
import { useStore } from '@/lib/store'
import ProjectDialog from './ProjectDialog'
import PersonDialog from './PersonDialog'

export default function DialogLayer() {
  const { projectId, personId, close } = useDialog()
  const { projects, people }           = useStore()

  const project = projectId ? projects.find(p => p.id === projectId) ?? null : null
  const person  = personId  ? people.find(p => p.id === personId)    ?? null : null

  if (project) return <ProjectDialog project={project} onClose={close} />
  if (person)  return <PersonDialog  person={person}   onClose={close} />
  return null
}
