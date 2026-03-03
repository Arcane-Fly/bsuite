import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Portal — Conduit',
  description: 'Manage job listings, review candidates, and schedule interviews.',
};

export default function EmployerPortalPage() {
  const features = [
    {
      title: 'Job Listings',
      description: 'Create and manage job postings visible to candidates across the platform.',
    },
    {
      title: 'Candidates',
      description: 'Review candidate applications, shortlist talent, and track hiring pipelines.',
    },
    {
      title: 'Interviews',
      description: 'Schedule and manage interviews with integrated calendar and notifications.',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employer Portal</h1>
        <p className="mt-2 text-muted-foreground">
          Post positions, review candidates, and manage your hiring pipeline.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          This portal is coming soon. Features below are in active development.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-border bg-card p-6 space-y-2"
          >
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
