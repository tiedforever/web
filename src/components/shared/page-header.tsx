import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
  primaryAction,
  secondaryAction,
  actions,
}: PageHeaderProps) {
  const renderedActions = actions ?? (
    <>
      {secondaryAction}
      {primaryAction}
    </>
  );

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-3 text-xs text-[#8A8A82]">{breadcrumb}</div>
        ) : null}
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1C1C1C]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-[13.5px] leading-6 text-[#7A7A6E]">
            {description}
          </div>
        ) : null}
      </div>
      {renderedActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{renderedActions}</div>
      ) : null}
    </header>
  );
}
