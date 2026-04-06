'use client'

import { useDialogNav } from '@/lib/dialogNav'
import { useStore }     from '@/lib/store'
import ProjectDialog    from './ProjectDialog'
import PersonDialog     from './PersonDialog'

export default function DialogLayer() {
  const { current, canGoBack, push, pop, close } = useDialogNav()
  const { projects, people, pendingChangeCount }  = useStore()

  if (!current) return null

  const totalDirty = pendingChangeCount()

  if (current.type === 'project') {
    const project = projects.find(p => p.id === current.id)
    if (!project) return null
    return (
      <ProjectDialog
        project={project}
        onClose={close}
        canGoBack={canGoBack}
        onBack={pop}
        onNavigateToPerson={(id) => push({ type: 'person', id })}
        globalDirtyCount={totalDirty}
      />
    )
  }

  if (current.type === 'person') {
    const person = people.find(p => p.id === current.id)
    if (!person) return null
    return (
      <PersonDialog
        person={person}
        onClose={close}
        canGoBack={canGoBack}
        onBack={pop}
        onNavigateToProject={(id) => push({ type: 'project', id })}
        globalDirtyCount={totalDirty}
      />
    )
  }

  return null
}
