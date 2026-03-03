'use client';

/**
 * AppSwitcher — Cross-app navigation dropdown for Conduit.
 *
 * Next.js version using NEXT_PUBLIC_* env vars.
 * Session is shared via business_suite_auth cookie on *.crm7.app domain.
 */

import {
  Calculator,
  ChevronDown,
  Grid3X3,
  UserSearch,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AppEntry {
  key: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  url: string;
  description: string;
}

const isDev = process.env.NODE_ENV === 'development';

const APPS: AppEntry[] = [
  {
    key: 'bsu',
    name: 'Business Suite',
    shortName: 'BSU',
    icon: Grid3X3,
    url: process.env.NEXT_PUBLIC_BSU_URL || (isDev ? 'http://localhost:3000' : 'https://suite.crm7.app'),
    description: 'Portal & dashboard',
  },
  {
    key: 'crm7',
    name: 'CRM7 Professional',
    shortName: 'CRM7',
    icon: Users,
    url: process.env.NEXT_PUBLIC_CRM7_URL || (isDev ? 'http://localhost:5173' : 'https://crm.crm7.app'),
    description: 'CRM with AI insights',
  },
  {
    key: 'conduit',
    name: 'Conduit ATS',
    shortName: 'Conduit',
    icon: UserSearch,
    url: process.env.NEXT_PUBLIC_CONDUIT_URL || (isDev ? 'http://localhost:5680' : 'https://conduit.crm7.app'),
    description: 'Recruitment & talent',
  },
  {
    key: 'r8',
    name: 'R8 Calculator',
    shortName: 'R8',
    icon: Calculator,
    url: process.env.NEXT_PUBLIC_R8_URL || (isDev ? 'http://localhost:5173' : 'https://r8.crm7.app'),
    description: 'Wage calculator',
  },
];

interface AppSwitcherProps {
  currentApp: 'bsu' | 'crm7' | 'conduit' | 'r8';
}

export function AppSwitcher({ currentApp }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = APPS.find((a) => a.key === currentApp) ?? APPS[0];
  const Icon = current.icon;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#2563eb]/20">
          <Icon className="h-3.5 w-3.5 text-[#2563eb]" />
        </div>
        <span className="hidden text-white sm:inline">{current.shortName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#00cec9]/20 bg-[#0a0e1a] p-1.5 shadow-xl shadow-black/30">
          <p className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Switch App
          </p>
          {APPS.map((app) => {
            const AppIcon = app.icon;
            const isActive = app.key === currentApp;
            return (
              <a
                key={app.key}
                href={app.url}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#2563eb]/15 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    isActive ? 'bg-[#2563eb]/25' : 'bg-white/5'
                  }`}
                >
                  <AppIcon
                    className={`h-4 w-4 ${isActive ? 'text-[#2563eb]' : 'text-gray-400'}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{app.name}</div>
                  <div className="truncate text-xs text-gray-500">{app.description}</div>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" title="Current app" />
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
