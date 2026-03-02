'use client'

import { AIAssistant } from '@/components/ai/AIAssistant'
import { AppSwitcher } from '@/components/AppSwitcher'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { NAV_CONFIG } from '@/config/navigation'
import { isActivePath } from '@/lib/nav-utils'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setMobileOpen(false)
    }
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Link
          href={NAV_CONFIG.app.homeHref}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-lg font-bold text-sidebar-primary-foreground">
              {NAV_CONFIG.app.shortName.charAt(0)}
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            {NAV_CONFIG.app.name}
          </span>
        </Link>
        <div className="ml-auto">
          <AppSwitcher currentApp="conduit" />
        </div>
      </div>

      {/* Sections */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {NAV_CONFIG.sections.map((section) => (
          <div key={section.label} className="mb-5">
            {/* Section header */}
            <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.label}
            </h3>

            {/* Section items */}
            {section.groups?.map((group, gi) => (
              <div key={gi} className="space-y-0.5">
                {group.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-in-out',
                        active
                          ? 'border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      {item.icon && (
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors duration-150',
                            active
                              ? 'text-sidebar-primary'
                              : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                          )}
                          aria-hidden="true"
                        />
                      )}
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ))}

            {/* Sections with a direct href but no groups */}
            {!section.groups && section.href && (
              <div className="space-y-0.5">
                <Link
                  href={section.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-in-out',
                    isActivePath(pathname, section.href)
                      ? 'border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <section.icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors duration-150',
                      isActivePath(pathname, section.href)
                        ? 'text-sidebar-primary'
                        : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                    )}
                    aria-hidden="true"
                  />
                  {section.label}
                </Link>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer -- Sign out */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all duration-150 ease-in-out hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside
          className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
          role="complementary"
        >
          {sidebarContent}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out panel — CSS transition instead of tw-animate-css */}
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar shadow-xl transition-transform duration-300 translate-x-0">
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-md p-1 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link
              href={NAV_CONFIG.app.homeHref}
              className="flex items-center gap-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">
                  {NAV_CONFIG.app.shortName.charAt(0)}
                </span>
              </div>
              <span className="text-base font-semibold tracking-tight">
                {NAV_CONFIG.app.name}
              </span>
            </Link>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto" role="main">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Breadcrumbs />
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Scout AI Assistant — available on all dashboard pages */}
      <AIAssistant />
    </>
  )
}
