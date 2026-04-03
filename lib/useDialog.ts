'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useDialog() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const projectId = searchParams.get('project')
  const personId  = searchParams.get('person')

  const openProject = useCallback((id: string) => {
    router.push(`${pathname}?project=${id}`)
  }, [router, pathname])

  const openPerson = useCallback((id: string) => {
    router.push(`${pathname}?person=${id}`)
  }, [router, pathname])

  const close = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  return { projectId, personId, openProject, openPerson, close }
}
