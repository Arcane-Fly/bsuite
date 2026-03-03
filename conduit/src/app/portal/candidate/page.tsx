import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Portal — Conduit',
  description: 'Track your applications, upload documents, and manage your onboarding checklist.',
};

export default function CandidatePortalPage() {
  const features = [
    {
      title: 'Application Status',
      description: 'Track the progress of your submitted applications in real time.',
      icon: 'ClipboardList',
    },
    {
      title: 'Documents',
      description: 'Upload and manage required documents such as IDs, qualifications, and references.',
      icon: 'FileText',
    },
    {
      title: 'Onboarding Checklist',
      description: 'Complete your onboarding tasks step by step before your start date.',
      icon: 'CheckSquare',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidate Portal</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your applications and onboarding from one place.
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
