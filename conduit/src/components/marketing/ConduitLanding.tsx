import {
    ArrowRight,
    BarChart3,
    Briefcase,
    Check,
    ExternalLink,
    FileCheck,
    Shield,
    Users,
    Zap,
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Users,
    title: 'Candidate Pipeline',
    description:
      'Visual kanban board to track candidates from sourcing through placement. Never lose sight of where anyone is.',
  },
  {
    icon: Briefcase,
    title: 'Job Distribution',
    description:
      'Post positions to multiple boards simultaneously. Manage listings from a single interface.',
  },
  {
    icon: FileCheck,
    title: 'Onboarding Workflows',
    description:
      'Automated onboarding checklists for new hires. Document collection, compliance steps, and task tracking.',
  },
  {
    icon: Shield,
    title: 'GTO Compliance',
    description:
      'Built for Group Training Organisations. AVETMISS-ready reporting and apprenticeship tracking.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description:
      'Time-to-hire, pipeline velocity, source effectiveness — all the metrics you need to optimise recruitment.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Scout',
    description:
      'Intelligent candidate matching, resume parsing, and job-description generation powered by AI.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    popular: false,
    features: [
      'Up to 5 active jobs',
      'Candidate pipeline',
      'Basic reporting',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/mo',
    popular: true,
    features: [
      'Unlimited jobs',
      'AI Scout assistant',
      'Job distribution',
      'Advanced analytics',
      'Onboarding workflows',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/mo',
    popular: false,
    features: [
      'Everything in Professional',
      'GTO compliance suite',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Unlimited users',
    ],
  },
]

export default function ConduitLanding() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#fefefe]">
      {/* Skip navigation — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2563eb] focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-[#495057]/30" role="banner">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-br from-[#2563eb] to-[#00cec9] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-semibold text-[#fefefe]">Conduit</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/portal/careers"
              className="hidden sm:inline-flex text-sm text-[#adb5bd] hover:text-[#fefefe] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] rounded px-2 py-1"
            >
              Careers Portal
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-[#adb5bd] hover:text-[#fefefe] transition-colors font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] rounded"
            >
              Login
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-[#2563eb] text-white rounded-lg font-medium hover:bg-[#1d4ed8] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cec9]"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content">
        {/* Hero Section */}
        <section
          className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              <span className="bg-linear-to-r from-[#2563eb] via-[#00cec9] to-[#2563eb] bg-clip-text text-transparent">
                Source. Hire.
              </span>
              <br />
              Onboard. Track.
            </h1>
            <p className="text-lg sm:text-xl text-[#adb5bd] max-w-2xl mx-auto mb-10">
              The end-to-end recruitment and onboarding platform built for GTOs,
              apprenticeship providers, and growing teams.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#2563eb] text-white rounded-lg font-semibold hover:bg-[#1d4ed8] transition-colors text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cec9]"
              >
                Start Free
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/portal/careers"
                className="inline-flex items-center gap-2 px-8 py-3 border border-[#495057] text-[#fefefe] rounded-lg font-semibold hover:border-[#00cec9] hover:text-[#00cec9] transition-colors text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cec9]"
              >
                View Open Positions
                <ExternalLink className="w-5 h-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section
          className="border-y border-[#495057]/30 py-12 px-4 sm:px-6 lg:px-8"
          aria-label="Platform statistics"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#00cec9]">
                500+
              </div>
              <div className="text-[#adb5bd] mt-1">Candidates Placed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#00cec9]">
                50+
              </div>
              <div className="text-[#adb5bd] mt-1">Partner Employers</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#00cec9]">
                72hrs
              </div>
              <div className="text-[#adb5bd] mt-1">Avg. Time to Shortlist</div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section
          className="py-20 px-4 sm:px-6 lg:px-8"
          aria-labelledby="features-heading"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2
                id="features-heading"
                className="text-3xl sm:text-4xl font-bold mb-4"
              >
                Everything You Need to Recruit
              </h2>
              <p className="text-[#adb5bd] text-lg max-w-2xl mx-auto">
                From sourcing to onboarding — Conduit handles the entire candidate
                lifecycle.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-[#1a1f2e] border border-[#495057]/30 rounded-xl p-6 hover:border-[#00cec9]/50 transition-colors"
                >
                  <feature.icon
                    className="w-10 h-10 text-[#00cec9] mb-4"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-[#adb5bd] text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#495057]/30"
          aria-labelledby="pricing-heading"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2
                id="pricing-heading"
                className="text-3xl sm:text-4xl font-bold mb-4"
              >
                Simple, Transparent Pricing
              </h2>
              <p className="text-[#adb5bd] text-lg max-w-2xl mx-auto">
                Start free and scale as your team grows.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-[#1a1f2e] rounded-xl p-8 flex flex-col ${
                    plan.popular
                      ? 'border-2 border-[#2563eb] relative'
                      : 'border border-[#495057]/30'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#2563eb] text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-[#adb5bd]">{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1" role="list">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="text-[#adb5bd] text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/login"
                    className={`w-full py-3 rounded-lg font-semibold text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cec9] block ${
                      plan.popular
                        ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                        : 'border border-[#495057] text-[#fefefe] hover:border-[#00cec9] hover:text-[#00cec9]'
                    }`}
                  >
                    {plan.price === 'Free' ? 'Start Free' : 'Get Started'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#495057]/30"
          aria-labelledby="cta-heading"
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2
              id="cta-heading"
              className="text-3xl sm:text-4xl font-bold mb-4"
            >
              Ready to streamline your hiring?
            </h2>
            <p className="text-[#adb5bd] text-lg mb-8">
              Join GTOs and employers already using Conduit to source, hire, and
              onboard faster.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#2563eb] text-white rounded-lg font-semibold hover:bg-[#1d4ed8] transition-colors text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cec9]"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t border-[#495057]/30 py-12 px-4 sm:px-6 lg:px-8"
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-linear-to-br from-[#2563eb] to-[#00cec9] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="text-lg font-semibold">Conduit</span>
            </div>
            <p className="text-[#adb5bd] text-sm mb-2">
              End-to-end recruitment and onboarding for apprenticeship providers
              and growing teams.
            </p>
            <a
              href="https://braden.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
            >
              A product of Braden Group
            </a>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/portal/careers"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  Open Positions
                </Link>
              </li>
              <li>
                <Link
                  href="/portal/candidate"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  Candidate Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/portal/employer"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  Employer Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Suite */}
          <div>
            <h4 className="font-semibold mb-4">Business Suite</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://suite.crm7.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  Business Suite Portal
                </a>
              </li>
              <li>
                <a
                  href="https://crm.crm7.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  CRM7
                </a>
              </li>
              <li>
                <a
                  href="https://r8.crm7.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#adb5bd] text-sm hover:text-[#00cec9] transition-colors"
                >
                  R8 Calculator
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-[#495057]/30 text-center text-[#adb5bd] text-sm">
          &copy; {new Date().getFullYear()} Conduit by Braden Group. All rights
          reserved.
        </div>
      </footer>
    </div>
  )
}
