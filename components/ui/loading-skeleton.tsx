"use client";

interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
  rowHeight?: number;
  className?: string;
}

function SkeletonBar({ width }: { width: string }) {
  return (
    <div
      className="h-4 animate-pulse rounded-md bg-surface-tertiary"
      style={{ width }}
    />
  );
}

export function LoadingSkeleton({ rows = 5, cols = 1, className = "" }: LoadingSkeletonProps) {
  const widths = ["100%", "75%", "60%", "85%", "50%", "90%", "70%", "65%", "80%", "55%"];

  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Cargando...">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1">
              <SkeletonBar width={widths[(rowIdx + colIdx) % widths.length]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <SkeletonBar width="40%" />
      <SkeletonBar width="100%" />
      <SkeletonBar width="75%" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-16 animate-pulse rounded-full bg-surface-tertiary" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-surface-tertiary" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBar width="8rem" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
