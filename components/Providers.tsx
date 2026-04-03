'use client'

import { Suspense, ReactNode } from 'react'
import { StoreProvider } from '@/lib/store'
import DialogLayer from '@/components/dialogs/DialogLayer'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Suspense>
        {children}
        <DialogLayer />
      </Suspense>
    </StoreProvider>
  )
}
