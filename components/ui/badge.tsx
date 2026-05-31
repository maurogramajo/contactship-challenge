"use client";

import type { ReactNode } from "react";

export type BadgeVariant = "hubspot" | "contactship" | "tag" | "success" | "warning" | "error" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  hubspot: "bg-amber-50 text-amber-700 border-amber-200",
  contactship: "bg-primary-light text-primary border-primary-subtle",
  tag: "bg-surface-tertiary text-text-secondary border-border-light",
  success: "bg-success-light text-success-foreground border-success/20",
  warning: "bg-warning-light text-warning-foreground border-warning/20",
  error: "bg-error-light text-error-foreground border-error/20",
  info: "bg-info-light text-info-foreground border-info/20",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "tag", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
