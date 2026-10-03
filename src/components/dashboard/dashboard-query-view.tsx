"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { dashboardQueryOptions } from "@/src/client/query-options";
import { AnimatedNumber } from "@/src/components/shared/animated-number";
import { useDelayedLoadingVisible } from "@/src/components/shared/delayed-loading";
import { Icon, type IconName } from "@/src/components/shared/icons";
import { DashboardLoadingSkeleton } from "@/src/components/dashboard/dashboard-loading-skeleton";
import { shouldShowQuerySkeleton } from "@/src/components/shared/loading-skeleton";
import { PageHeader } from "@/src/components/shared/page-header";
import { Badge, Card, EmptyState } from "@/src/components/shared/ui";
import type { DashboardPresentationData } from "@/src/types/dashboard";

type DashboardQueryViewProps = {
  presentation: DashboardPresentationData;
  weddingId: string;
};

export function DashboardQueryView({
  presentation,
  weddingId,
}: DashboardQueryViewProps) {
  const query = useQuery(dashboardQueryOptions(weddingId));
  const summary = query.data;
  const routeLoadingVisible = useDelayedLoadingVisible();
  const showSkeleton = shouldShowQuerySkeleton({
    hasData: summary !== undefined,
    isPending: query.isPending,
    routeLoadingVisible,
  });

  if (!summary) {
    if (query.isError) {
      return <DashboardError onRetry={() => void query.refetch()} />;
    }
    if (showSkeleton) {
      return <DashboardLoadingSkeleton />;
    }
    return null;
  }

  const completedCount = summary.completedTaskCount;
  const completionPercentage = summary.taskCount
    ? Math.round((completedCount / summary.taskCount) * 100)
    : 0;
  const daysToWedding = Math.max(0, getDaysToWedding(presentation.weddingDate));

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <PageHeader
        description={
          <>
            <AnimatedNumber value={daysToWedding} /> days until your wedding day — everything is
            looking beautiful.
          </>
        }
        title={`Good morning, ${presentation.userFirstName} ☀️`}
      />

      {query.isError ? (
        <div aria-live="polite" className="flex items-center justify-between gap-4 rounded-xl border border-[#E7C9C5] bg-[#FFF5F3] px-4 py-3 text-sm text-[#5C211B]">
          <span>Live dashboard refresh failed. Showing the last available data.</span>
          <button
            className="shrink-0 font-semibold underline underline-offset-2"
            onClick={() => void query.refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#183321] via-[#234528] to-[#3C3820] text-white shadow-[0_8px_24px_rgba(24,51,33,0.16)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#C4973A]/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DDEBD9]">
              {presentation.weddingName}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-semibold tracking-[-0.07em] sm:text-6xl">
                <AnimatedNumber value={daysToWedding} />
              </span>
              <span className="text-base font-medium text-[#DDEBD9]">days to go</span>
            </div>
            <p className="mt-3 text-sm font-medium text-white">{presentation.partnerNames}</p>
            <p className="mt-1 text-xs text-[#DDEBD9]">
              {formatDate(presentation.weddingDate, presentation.timezone)}
              {presentation.locationSummary ? ` · ${presentation.locationSummary}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6 lg:min-w-[390px] lg:border-t-0 lg:pt-0">
            <HeroMetric label="Overall progress" suffix="%" value={completionPercentage} />
            <HeroMetric label="Guests" value={summary.guestCount} />
            <HeroMetric label="Households" value={summary.householdCount} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          description={`${completedCount} of ${summary.taskCount} tasks done`}
          icon="checklist"
          label="Planning progress"
          suffix="%"
          value={completionPercentage}
        />
        <MetricCard
          description="People on the guest list"
          icon="users"
          label="Total guests"
          value={summary.guestCount}
        />
        <MetricCard
          description="Shared guest addresses"
          icon="pin"
          label="Households"
          value={summary.householdCount}
        />
        <MetricCard
          description="Guests without a household"
          icon="users"
          label="Unassigned guests"
          value={summary.unassignedGuestCount}
        />
        <MetricCard
          description={formatDate(presentation.weddingDate, presentation.timezone)}
          icon="calendar"
          label="Days to wedding"
          value={daysToWedding}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <PanelHeading
            description="The next dated items from your live checklist."
            icon="calendar"
            title="Upcoming tasks"
          />

          {summary.upcomingTasks.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {summary.upcomingTasks.map((task) => (
                <li
                  className="flex items-center gap-3 rounded-[10px] border border-[#F0EFEA] bg-[#FAFAF8] px-3 py-3"
                  key={task.id}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#DADFD6] bg-white text-[#2D5A27]">
                    <span className="h-3.5 w-3.5 rounded-[4px] border border-[#B8C8B5]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#1C1C1C]">
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#8A8A82]">
                      Due {formatDate(task.dueDate, presentation.timezone)}
                    </span>
                  </span>
                  <Badge tone={task.priority === "URGENT" || task.priority === "HIGH" ? "danger" : "warning"}>
                    {formatLabel(task.priority)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[#E4E0D4] px-5 py-8">
              <EmptyState
                description="Add due dates to active checklist tasks and they will appear here."
                icon={<Icon name="calendar" size={20} />}
                title="No upcoming tasks"
              />
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <PanelHeading
            description="Jump into the parts of your wedding that need attention."
            icon="sparkles"
            title="Quick actions"
          />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <QuickAction href="/guests" icon="users" label="Add a guest" />
            <QuickAction href="/guests/households" icon="pin" label="Add a household" />
            <QuickAction href="/checklist" icon="checklist" label="Open checklist" />
            <QuickAction href="/settings/general" icon="settings" label="Open settings" />
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <PanelHeading
            description="The current wedding details used across your workspace."
            icon="sparkles"
            title="Wedding at a glance"
          />
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <GlanceItem
              label="Wedding date"
              value={formatDate(presentation.weddingDate, presentation.timezone)}
            />
            <GlanceItem label="Partners" value={presentation.partnerNames} />
            <GlanceItem
              label="Ceremony & reception"
              value={presentation.locationSummary ?? "Not added yet"}
            />
            <GlanceItem
              label="Checklist"
              value={<AnimatedNumber suffix="% complete" value={completionPercentage} />}
            />
          </dl>
        </Card>
        <Card className="p-5 sm:p-6">
          <PanelHeading
            description="Keep the next small step visible and the bigger day will follow."
            icon="checklist"
            title="Checklist progress"
          />
          <p className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#1C1C1C]">
            <AnimatedNumber suffix="%" value={completionPercentage} />
          </p>
          <p className="mt-1 text-sm text-[#7A7A6E]">
            <AnimatedNumber value={completedCount} /> of <AnimatedNumber value={summary.taskCount} /> tasks
            completed
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F4F4F1]">
            <div className="h-full rounded-full bg-[#2D5A27]" style={{ width: `${completionPercentage}%` }} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-8">
      <PageHeader
        description="A calm overview of the wedding planning workspace."
        title="Dashboard"
      />
      <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
        <p className="text-sm font-semibold">Dashboard unavailable</p>
        <p className="mt-2 text-sm leading-6">
          Unable to load the dashboard right now. Please try again.
        </p>
        <button
          className="mt-4 rounded-lg bg-[#2D5A27] px-3 py-2 text-sm font-semibold text-white"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </Card>
    </div>
  );
}

function HeroMetric({
  detail,
  label,
  suffix,
  value,
}: {
  detail?: string;
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="px-4 first:pl-0 last:pr-0 sm:px-6">
      <p className="text-center text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
        <AnimatedNumber suffix={suffix} value={value} />
      </p>
      <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-[0.1em] text-[#DDEBD9]">
        {label}
      </p>
      {detail ? <p className="mt-1 text-center text-[10px] text-[#B7CDB4]">{detail}</p> : null}
    </div>
  );
}

function MetricCard({
  description,
  icon,
  label,
  suffix,
  value,
}: {
  description: string;
  icon: IconName;
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-[#8A8A82]">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1C1C1C] sm:text-2xl">
            <AnimatedNumber suffix={suffix} value={value} />
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF0E8] text-[#2D5A27]">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="mt-2 truncate text-[10px] text-[#8A8A82]">{description}</p>
    </Card>
  );
}

function PanelHeading({
  description,
  icon,
  title,
}: {
  description: string;
  icon: IconName;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-[#1C1C1C]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#8A8A82]">{description}</p>
      </div>
      <Icon name={icon} size={19} />
    </div>
  );
}

function GlanceItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#F0EFEA] bg-[#FAFAF8] px-4 py-3">
      <dt className="text-[11px] text-[#8A8A82]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#1C1C1C]">{value}</dd>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-[10px] border border-[#E8E8E3] bg-white px-3.5 py-3 text-sm font-medium text-[#3F413A] transition-colors hover:border-[#C9D8C6] hover:bg-[#F7FAF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
      href={href}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF0E8] text-[#2D5A27]">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Icon name="chevron-right" size={15} />
    </Link>
  );
}

function formatDate(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(date));
}

function formatLabel(value: string) {
  return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

function getDaysToWedding(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
