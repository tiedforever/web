import Link from "next/link";

import { Icon, type IconName } from "./icons";
import { EmptyState, Card } from "./ui";
import { PageHeader } from "./page-header";

type PlaceholderPageProps = {
  title: string;
  description: string;
  futureDescription: string;
  icon: IconName;
};

export function PlaceholderPage({
  title,
  description,
  futureDescription,
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        description={description}
        title={title}
      />
      <Card className="px-5 py-16 sm:px-8 sm:py-20">
        <EmptyState
          eyebrow="Private alpha"
          description={futureDescription}
          icon={<Icon name={icon} size={22} />}
          title={`${title} is not available yet`}
        />
        <div className="mt-6 text-center">
          <Link
            className="inline-flex rounded-[10px] border border-[#E8E8E3] bg-[#F4F4F1] px-4 py-2 text-[13px] font-medium text-[#1C1C1C] transition hover:bg-[#EAEAE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
