import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[#2D5A27] text-white hover:bg-[#245020]",
  secondary:
    "border border-[#E8E8E3] bg-[#F4F4F1] text-[#1C1C1C] hover:bg-[#EAEAE7]",
  ghost: "text-[#6B6B63] hover:bg-[#F4F4F1]",
  outline:
    "border border-[#2D5A27] bg-transparent text-[#2D5A27] hover:bg-[#EAF0E8]",
};

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-[#E8E8E3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

type BadgeTone = "default" | "success" | "warning" | "danger" | "gold";

const badgeTones: Record<BadgeTone, string> = {
  default: "bg-[#F4F4F1] text-[#6B6B63]",
  success: "bg-[#EAF0E8] text-[#4A7C57]",
  warning: "bg-[#FEF9EC] text-[#B07C1A]",
  danger: "bg-[#FEF2F2] text-[#C0392B]",
  gold: "bg-[#F9F2E8] text-[#9A6E30]",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-[3px] text-[11.5px] font-semibold tracking-[0.01em] ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
  height = "h-1.5",
}: {
  value: number;
  max?: number;
  className?: string;
  height?: string;
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      aria-label={`${Math.round(percentage)}% complete`}
      className={`overflow-hidden rounded-full bg-[#F4F4F1] ${height} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percentage)}
    >
      <div
        className="h-full rounded-full bg-[#2D5A27] transition-[width] duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-[13.5px] text-[#1C1C1C] outline-none placeholder:text-[#8A8A82] focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8] ${className}`}
    />
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-[13px] text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8] ${className}`}
    />
  );
}

export function EmptyState({
  eyebrow = "Workspace status",
  title,
  description,
  icon,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      {icon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF0E8] text-[#2D5A27]">
          {icon}
        </div>
      ) : null}
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#B07C1A]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#1C1C1C]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7A7A6E]">
        {description}
      </p>
    </div>
  );
}
