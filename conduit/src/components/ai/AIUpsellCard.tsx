'use client';

/**
 * AIUpsellCard — Upgrade prompt when Scout quota is exceeded.
 *
 * Displays tier upgrade information with benefits and CTA.
 * Uses Conduit's CSS variable system (Tailwind v4 OKLch).
 */

import { cn } from '@/lib/utils';
import type { UserTier } from '@/stores/aiStore';
import { Check, Rocket, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type UpsellReason = 'quota_exceeded' | 'feature_unavailable' | 'rate_limit';

interface TierUpgrade {
  icon: LucideIcon;
  name: string;
  description: string;
  benefits: string[];
  price: string;
  ctaText: string;
}

interface AIUpsellCardProps {
  reason: UpsellReason;
  currentTier: UserTier;
  targetTier: UserTier;
  onUpgrade?: () => void;
  className?: string;
}

const TIER_UPGRADES: Record<string, TierUpgrade> = {
  'essentials-professional': {
    icon: Sparkles,
    name: 'Professional',
    description: 'Unlock advanced AI recruitment capabilities',
    benefits: [
      '500 AI queries per month',
      'Candidate-job matching with scoring',
      'Advanced pipeline analytics',
      'AI-drafted communications',
    ],
    price: '$15/user/month',
    ctaText: 'Upgrade to Professional',
  },
  'professional-enterprise': {
    icon: Rocket,
    name: 'Enterprise',
    description: 'Unlimited AI power for your recruitment team',
    benefits: [
      'Unlimited AI queries',
      'Multi-channel outreach automation',
      'Custom compliance workflows',
      'Priority support and onboarding',
    ],
    price: 'Custom pricing',
    ctaText: 'Contact Sales',
  },
};

function getReasonMessage(reason: UpsellReason): string {
  switch (reason) {
    case 'quota_exceeded':
      return "You've reached your monthly AI query limit. Upgrade to continue using Scout.";
    case 'feature_unavailable':
      return 'This feature is not available on your current plan. Upgrade to unlock it.';
    case 'rate_limit':
      return "You're making requests too quickly. Upgrade for higher rate limits.";
  }
}

export function AIUpsellCard({
  reason,
  currentTier,
  targetTier,
  onUpgrade,
  className,
}: AIUpsellCardProps) {
  const upgradeKey = `${currentTier}-${targetTier}`;
  const upgrade = TIER_UPGRADES[upgradeKey];

  if (!upgrade) return null;

  const Icon = upgrade.icon;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/30 bg-primary/5 p-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            Upgrade to {upgrade.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {upgrade.description}
          </p>
        </div>
      </div>

      {/* Reason */}
      <p className="mt-3 text-sm text-muted-foreground">
        {getReasonMessage(reason)}
      </p>

      {/* Benefits */}
      <div className="mt-3 space-y-2">
        {upgrade.benefits.map((benefit, i) => (
          <div key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm text-foreground">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Price */}
      <p className="mt-3 text-lg font-semibold text-foreground">
        {upgrade.price}
      </p>

      {/* CTA */}
      <button
        onClick={onUpgrade}
        className={cn(
          'mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium',
          'bg-primary text-primary-foreground',
          'transition-colors hover:bg-primary/90',
        )}
      >
        {upgrade.ctaText}
      </button>
    </div>
  );
}
