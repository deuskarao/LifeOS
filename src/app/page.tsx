'use client'

import { useSession } from 'next-auth/react'
import { Suspense } from 'react'
import { AppShell } from '@/components/lifeos/app-shell'
import { LoginView } from '@/components/lifeos/login-view'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <LoginView />
      </Suspense>
    )
  }

  return <AppShell />
}
