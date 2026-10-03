"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/src/components/shared/icons";

export const settingsNavigationItems = [
  { href: "/settings", label: "Overview", icon: "dashboard" },
  { href: "/settings/account", label: "Account", icon: "settings" },
  { href: "/settings/general", label: "General", icon: "settings" },
  { href: "/settings/locations", label: "Locations", icon: "pin" },
  { href: "/settings/sections", label: "Wedding Day Sections", icon: "calendar" },
  { href: "/settings/members", label: "Members", icon: "users" },
  { href: "/settings/preferences", label: "Preferences", icon: "settings" },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: IconName }>;

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings navigation" className="overflow-x-auto">
      <div className="flex min-w-max gap-1.5 rounded-[14px] border border-[#E8E8E3] bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:inline-flex">
        {settingsNavigationItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/settings" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2.5 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2 ${active ? "bg-[#EAF0E8] font-semibold text-[#2D5A27]" : "text-[#6B6B63] hover:bg-[#F4F4F1] hover:text-[#1C1C1C]"}`}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
