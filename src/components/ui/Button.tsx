import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/ui";

const VARIANTS = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 disabled:hover:bg-neutral-900 shadow-sm",
  brand: "bg-brand-600 text-white hover:bg-brand-700 disabled:hover:bg-brand-600 shadow-sm",
  secondary:
    "bg-white text-neutral-800 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-[13px] rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-[15px] rounded-xl gap-2",
} as const;

type Shared = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
};

function classes({ variant = "primary", size = "md", className }: Shared) {
  return cx(
    "inline-flex items-center justify-center font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: Shared & ComponentProps<"button">) {
  return (
    <button className={classes({ variant, size, className, children })} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={classes({ variant, size, className, children })} {...props}>
      {children}
    </Link>
  );
}
