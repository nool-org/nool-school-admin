'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SVGProps } from 'react';

import { NotificationsBell } from './NotificationsBell';
import { getSchoolLogo } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useAuth } from '@/lib/useAuth';
import type { Feature } from '@/lib/types';

/** Minimal inline line icons - kept dependency-free rather than adding
 * lucide-react for six glyphs. Stroke-based, 16px, matches Strapi's icon
 * weight/size in its nav rail. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  teachers: (
    <Icon>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </Icon>
  ),
  students: (
    <Icon>
      <path d="M4 8h16" />
      <path d="M4 8l8-4 8 4-8 4-8-4Z" />
      <path d="M8 10.5V16c0 1.1 1.8 2 4 2s4-.9 4-2v-5.5" />
    </Icon>
  ),
  classes: (
    <Icon>
      <rect x="3" y="4" width="18" height="14" rx="1.5" />
      <path d="M3 9h18" />
    </Icon>
  ),
  grades: (
    <Icon>
      <rect x="4" y="3" width="16" height="7" rx="1.5" />
      <rect x="4" y="14" width="16" height="7" rx="1.5" />
      <path d="M8 6.5h8M8 17.5h8" />
    </Icon>
  ),
  curriculum: (
    <Icon>
      <path d="M4 5.5A2 2 0 0 1 6 4h13v14H6a2 2 0 0 0-2 2V5.5Z" />
      <path d="M8 8h7" />
    </Icon>
  ),
  datasets: (
    <Icon>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </Icon>
  ),
  analytics: (
    <Icon>
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
    </Icon>
  ),
  reports: (
    <Icon>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M9 12h6M9 16h6" />
      <path d="M9 8h2" />
    </Icon>
  ),
  subscription: (
    <Icon>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </Icon>
  ),
  'question-defaults': (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 12.5l2 2 4-4.5" />
    </Icon>
  ),
  tests: (
    <Icon>
      <path d="M8 3h8l1 4H7l1-4Z" />
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9.5 12.5l2 2 3-3.5" />
    </Icon>
  ),
  homework: (
    <Icon>
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M9 10h6M9 14h6" />
    </Icon>
  ),
  'question-papers': (
    <Icon>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M10 12h5M10 16h5" />
      <circle cx="8.5" cy="12" r="0.6" fill="currentColor" />
      <circle cx="8.5" cy="16" r="0.6" fill="currentColor" />
    </Icon>
  ),
  leaderboard: (
    <Icon>
      <path d="M8 20V10M14 20V4M20 20v-7M2 20h20" />
    </Icon>
  ),
  'audit-log': (
    <Icon>
      <path d="M12 3v9l5 3" />
      <circle cx="12" cy="12" r="9" />
    </Icon>
  ),
  support: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v.01" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.2.7.7 1.2 1.5 1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Icon>
  ),
};

const ICONS_EXTRA: Record<string, React.ReactNode> = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </Icon>
  ),
  'question-bank': (
    <Icon>
      <path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5a2.5 2.5 0 0 0 0 5H20" />
      <path d="M9 8.5c0-1.4 1.1-2.5 2.6-2.5 1.4 0 2.4.9 2.4 2.1 0 1-.6 1.5-1.5 2.1-.8.5-1.3 1-1.3 1.8" />
      <circle cx="11.5" cy="15" r="0.6" fill="currentColor" />
    </Icon>
  ),
  'sign-out': (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  ),
};
Object.assign(ICONS, ICONS_EXTRA);

const TOP_LINKS = [{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' }];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Gates this item on Profile.enabledFeatures - omitted for items with no
   * corresponding Feature (always shown regardless of plan). */
  feature?: Feature;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Roster',
    items: [
      { href: '/teachers', label: 'Teachers', icon: 'teachers' },
      { href: '/students', label: 'Students', icon: 'students' },
      { href: '/grades', label: 'Classes', icon: 'grades' },
      { href: '/classes', label: 'Sections', icon: 'classes' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { href: '/activity/tests', label: 'Voice Tests', icon: 'tests', feature: 'voice_test' },
      { href: '/activity/homework', label: 'Homework', icon: 'homework', feature: 'homework' },
      { href: '/activity/question-papers', label: 'Question Papers', icon: 'question-papers', feature: 'question_paper' },
      { href: '/activity/leaderboard', label: 'Leaderboard', icon: 'leaderboard', feature: 'leaderboard' },
      { href: '/activity/audit-log', label: 'Activity log', icon: 'audit-log' },
    ],
  },
  {
    label: 'School',
    items: [
      { href: '/curriculum', label: 'Subject', icon: 'curriculum' },
      { href: '/datasets', label: 'Datasets', icon: 'datasets' },
      { href: '/question-bank', label: 'Question bank', icon: 'question-bank' },
      { href: '/question-defaults', label: 'Question defaults', icon: 'question-defaults' },
      { href: '/analytics', label: 'Analytics', icon: 'analytics' },
      { href: '/reports', label: 'Reports', icon: 'reports' },
      { href: '/subscription', label: 'Subscription', icon: 'subscription' },
      { href: '/support', label: 'Support', icon: 'support' },
    ],
  },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const logoState = useAsyncData('school-logo', () => getSchoolLogo());
  const logoDataUri = logoState.status === 'success' ? logoState.data.logoDataUri : null;

  // null enabledFeatures = every feature enabled (no plan restriction) -
  // same convention as the Plan.enabled_features field it's derived from.
  const enabledFeatures = profile?.enabledFeatures ?? null;
  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.feature || !enabledFeatures || enabledFeatures.includes(item.feature)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          nool<span>.</span>
        </span>
        <span className="sidebar-brand-label"> school</span>
        {logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- a user-uploaded data: URI, not a static asset next/image can optimize.
          <img src={logoDataUri} alt="School logo" className="sidebar-school-logo" />
        ) : null}
      </div>
      <nav className="sidebar-nav">
        {TOP_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`sidebar-link${pathname === item.href ? ' active' : ''}`}
          >
            {ICONS[item.icon]}
            <span className="sidebar-link-label">{item.label}</span>
          </Link>
        ))}
        {visibleNavGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`sidebar-link${pathname.startsWith(item.href) ? ' active' : ''}`}
              >
                {ICONS[item.icon]}
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <NotificationsBell />
        <Link
          href="/settings"
          title="Settings"
          className={`sidebar-user${pathname.startsWith('/settings') ? ' active' : ''}`}
        >
          <div className="avatar">{initialsFor(profile?.displayName ?? '?')}</div>
          <div className="grow">
            <strong>{profile?.displayName ?? 'School Admin'}</strong>
            <small>{profile?.school ?? ''}</small>
          </div>
          {ICONS.settings}
        </Link>
        <button type="button" className="sidebar-signout" title="Sign out" onClick={() => void signOut()}>
          {ICONS['sign-out']}
          <span className="sidebar-link-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
