export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 animate-pulse">
      {/* HubSpot config card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
        <div className="h-7 w-52 rounded-lg bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-14 rounded bg-slate-200" />
          <div className="h-6 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 rounded-lg bg-slate-200" />
          <div className="h-10 w-28 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* AI config card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
        <div className="flex items-start justify-between">
          <div className="h-7 w-40 rounded-lg bg-slate-200" />
          <div className="h-8 w-8 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-20 rounded-lg bg-slate-200" />
          <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-28 rounded-lg bg-slate-200" />
          <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="h-10 w-44 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
