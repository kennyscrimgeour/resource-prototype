'use client'

import { useDialogNav } from '@/lib/dialogNav'

export function useDialog() {
  const { current, open, close } = useDialogNav()

  const projectId = current?.type === 'project' ? current.id : null
  const personId  = current?.type === 'person'  ? current.id : null

  function openProject(id: string) { open({ type: 'project', id }) }
  function openPerson(id: string)  { open({ type: 'person',  id }) }

  return { projectId, personId, openProject, openPerson, close }
}
