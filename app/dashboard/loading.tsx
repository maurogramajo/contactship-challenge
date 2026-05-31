export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-24 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-24 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}
