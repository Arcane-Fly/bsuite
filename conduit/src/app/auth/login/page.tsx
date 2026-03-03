'use client'

import { useEffect } from 'react'

const BSU_LOGIN_URL = 'https://suite.crm7.app/login'

/**
 * Legacy login page — redirects to BSU login with return_to context.
 * Auth is centralized at BSU (suite.crm7.app). Middleware also catches
 * unauthenticated users, but this handles direct /auth/login navigation.
 */
export default function LoginPage() {
  useEffect(() => {
    const url = new URL(BSU_LOGIN_URL)
    url.searchParams.set('return_to', 'conduit')
    url.searchParams.set('return_path', '/candidates')
    window.location.href = url.toString()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  )
}
