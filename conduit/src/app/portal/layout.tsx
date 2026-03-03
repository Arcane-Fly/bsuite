import Link from 'next/link';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Conduit</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/portal/careers" className="text-muted-foreground hover:text-foreground transition-colors">Careers</Link>
            <Link href="/portal/candidate" className="text-muted-foreground hover:text-foreground transition-colors">Candidate Portal</Link>
            <Link href="/portal/employer" className="text-muted-foreground hover:text-foreground transition-colors">Employer Portal</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-border bg-card py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          Powered by Conduit ATS
        </div>
      </footer>
    </div>
  );
}
