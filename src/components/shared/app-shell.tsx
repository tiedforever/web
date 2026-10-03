"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";

import { Icon, type IconName } from "./icons";
import { DelayedLoadingProvider } from "./delayed-loading";
import { PageTransition } from "./page-transition";
import { WorkspaceProvider } from "./workspace-context";
import {
  WeddingSwitcher,
  type WeddingSwitcherOption,
} from "./wedding-switcher";

export type AppShellContext = {
  wedding: {
    id: string;
    weddingName: string;
    partnerNames: string;
    weddingDate: string;
    weddingDateIso: string;
    timezone: string;
    locationSummary: string | null;
    countdown: string;
  } | null;
  onboardingSkipped: boolean;
  role: "OWNER" | "EDITOR" | "VIEWER" | null;
  availableWeddings: WeddingSwitcherOption[];
  user: {
    firstName: string;
    userName: string;
    userEmail: string;
    userInitials: string;
    profileImageUrl: string | null;
  };
};

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", group: "main", disabled: false },
  { href: "/checklist", label: "Checklist", icon: "checklist", group: "main", disabled: false },
  { href: "/guests", label: "Guests", icon: "users", group: "planning", disabled: false },
  { href: "/invitations", label: "Guest invitations", icon: "file", group: "planning", disabled: true },
  { href: "/rsvps", label: "RSVPs", icon: "heart", group: "planning", disabled: true },
  { href: "/seating", label: "Seating Plan", icon: "grid", group: "planning", disabled: true },
  { href: "/suppliers", label: "Suppliers", icon: "venue", group: "planning", disabled: true },
  { href: "/budget", label: "Budget", icon: "dollar", group: "planning", disabled: true },
  { href: "/timeline", label: "Timeline", icon: "calendar", group: "planning", disabled: true },
  { href: "/registry", label: "Gift Registry", icon: "gift", group: "planning", disabled: true },
  { href: "/documents", label: "Documents", icon: "file", group: "planning", disabled: true },
  { href: "/notes", label: "Notes", icon: "note", group: "planning", disabled: true },
  { href: "/settings", label: "Settings", icon: "settings", group: "settings", disabled: false },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: IconName;
  group: "main" | "planning" | "settings";
  disabled?: boolean;
}>;

type AppShellProps = {
  children: ReactNode;
  context: AppShellContext | null;
};

export function AppShell({ children, context }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const wasMobileOpenRef = useRef(false);

  useEffect(() => {
    if (mobileOpen) {
      wasMobileOpenRef.current = true;
      const frame = requestAnimationFrame(() => {
        mobileSidebarRef.current
          ?.querySelector<HTMLElement>(
            'button:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      });

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        setMobileOpen(false);
      };

      document.addEventListener("keydown", handleEscape);
      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener("keydown", handleEscape);
      };
    }

    if (!wasMobileOpenRef.current) return;
    wasMobileOpenRef.current = false;
    const frame = requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());

    return () => cancelAnimationFrame(frame);
  }, [mobileOpen]);

  return (
    <WorkspaceProvider value={context}>
      <div className="flex min-h-screen bg-[#FAFAF8] text-[#1C1C1C] md:h-screen md:overflow-hidden">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[#1C1C1C]/25 md:hidden"
          onClick={() => setMobileOpen(false)}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <aside
        aria-label="Application navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r border-[#E4E0D4] bg-[#F5F3EC] transition-transform duration-200 md:static md:translate-x-0 ${mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"} md:visible`}
        id="mobile-navigation"
        ref={mobileSidebarRef}
      >
        <div className="flex items-center justify-between border-b border-[#E4E0D4] px-5 pb-5 pt-6">
          <Link
            className="flex items-center gap-2.5 rounded-lg"
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2D5A27] to-[#C4973A] text-white shadow-sm">
              <Icon name="sparkles" size={17} />
            </span>
            <span>
              <span className="block font-serif text-[19px] leading-none text-[#1C1C1C]">
                Tied Forever
              </span>
              <span className="mt-1 block text-[10px] font-medium tracking-[0.06em] text-[#7A7A6E]">
                WEDDING PLANNER
              </span>
            </span>
          </Link>

          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[#6B6B63] hover:bg-[#EAEAE3] md:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <NavigationLinks
            onNavigate={() => setMobileOpen(false)}
            pathname={pathname}
          />
        </nav>

        <div className="shrink-0 border-t border-[#E4E0D4] px-3 py-3">
          <NavigationLinks
            groups={["settings"]}
            onNavigate={() => setMobileOpen(false)}
            pathname={pathname}
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col" inert={mobileOpen || undefined}>
        <header className="sticky top-0 z-30 flex min-w-0 h-[60px] shrink-0 items-center gap-3 border-b border-[#E4E0D4] bg-white/95 px-4 backdrop-blur sm:gap-5 sm:px-6 md:px-8">
          <button
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="rounded-lg p-2 text-[#6B6B63] hover:bg-[#F3F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] md:hidden"
            onClick={() => setMobileOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <Icon name="menu" size={20} />
          </button>

          <WeddingSwitcher
            activeWeddingId={context?.wedding?.id ?? null}
            compact
            options={context?.availableWeddings ?? []}
          />

          <button
            aria-label="Search unavailable in private alpha"
            className="hidden h-10 max-w-[400px] min-w-0 flex-1 cursor-not-allowed items-center gap-2 rounded-[10px] border border-[#E4E0D4] bg-[#F7F6F2] px-3.5 text-left text-[13px] text-[#8A8A82] lg:flex"
            disabled
            title="Search is unavailable in the private alpha"
            type="button"
          >
            <Icon name="search" size={15} />
            <span>Search your wedding workspace</span>
            <span className="ml-auto rounded bg-[#E4E0D4] px-1.5 py-0.5 text-[10px] text-[#7A7A6E]">
              ⌘K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              aria-label="Search unavailable in private alpha"
              className="cursor-not-allowed rounded-lg p-2 text-[#6B6B63] opacity-60 hover:bg-[#F3F1EA] disabled:cursor-not-allowed lg:hidden"
              disabled
              title="Search is unavailable in the private alpha"
              type="button"
            >
              <Icon name="search" size={18} />
            </button>
            <button
              aria-label="Notifications unavailable in private alpha"
              className="cursor-not-allowed rounded-lg p-2 text-[#6B6B63] opacity-60 hover:bg-[#F3F1EA] disabled:cursor-not-allowed"
              disabled
              title="Notifications are unavailable in the private alpha"
              type="button"
            >
              <Icon name="bell" size={18} />
            </button>
            <div
              className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-left hover:bg-[#F3F1EA]"
              title={context?.user.userEmail ?? "Account"}
            >
              <UserButton />
              <span className="hidden max-w-36 truncate text-[13px] font-medium text-[#1C1C1C] lg:inline">
                {context?.user.userName ?? "Wedding team"}
              </span>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <DelayedLoadingProvider>
              <PageTransition weddingId={context?.wedding?.id ?? null}>
                {children}
              </PageTransition>
            </DelayedLoadingProvider>
          </div>
        </main>
      </div>
      </div>
    </WorkspaceProvider>
  );
}

function NavigationLinks({
  groups = ["main", "planning"],
  onNavigate,
  pathname,
}: {
  groups?: readonly ("main" | "planning" | "settings")[];
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <div className="space-y-1">
      {navigationItems
        .filter((item) => groups.includes(item.group))
        .map((item) => {
          const active = isActivePath(pathname, item.href);

          if (item.disabled) {
            return (
              <span
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] text-[#A5A39A]"
                key={item.href}
                title="This area is not available in the private alpha"
              >
                <Icon name={item.icon} size={17} />
                <span className="min-w-0 flex-1">{item.label}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#B8B5A9]">
                  Alpha
                </span>
              </span>
            );
          }

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F3EC] ${active ? "bg-[#EAF0E8] font-semibold text-[#2D5A27]" : "text-[#6B6B63] hover:bg-[#ECEBE5] hover:text-[#1C1C1C]"}`}
              href={item.href}
              key={item.href}
              onClick={onNavigate}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
