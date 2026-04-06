'use client'

import { Suspense, ReactNode } from 'react'
import { StoreProvider } from '@/lib/store'
import { DialogNavProvider } from '@/lib/dialogNav'
import DialogLayer from '@/components/dialogs/DialogLayer'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <DialogNavProvider>
        <Suspense>
          {children}
          <DialogLayer />
        </Suspense>
      </DialogNavProvider>
    </StoreProvider>
  )
}
