import Link from "next/link";

import { Icon } from "./icons";
import { Card, EmptyState } from "./ui";

export function WeddingRequiredState({
  feature = "This feature",
}: {
  feature?: string;
}) {
  return (
    <div className="flex min-h-[420px] items-center">
      <Card className="w-full px-6 py-14 sm:px-8 sm:py-16">
        <EmptyState
          description={`${feature} becomes available after you create or join a wedding workspace.`}
          icon={<Icon name="sparkles" size={22} />}
          title="Create your wedding to get started"
        />
        <div className="mt-6 text-center">
          <Link
            className="inline-flex items-center justify-center rounded-[10px] bg-[#2D5A27] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#245020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
            href="/onboarding"
          >
            Create wedding
          </Link>
        </div>
      </Card>
    </div>
  );
}
