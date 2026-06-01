export default function SyncPendingLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <section className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="h-9 w-64 rounded-lg bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-full max-w-2xl rounded bg-slate-200" />
          <div className="h-4 w-full max-w-xl rounded bg-slate-200" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_1fr_1.6fr] gap-4 bg-slate-50 px-4 py-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-3 rounded bg-slate-200"
                />
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_1fr_1.6fr] gap-4 px-4 py-4"
                >
                  <div className="h-4 w-11/12 rounded bg-slate-200" />
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                  <div className="h-4 w-10 rounded bg-slate-200" />
                  <div className="h-4 w-5/6 rounded bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-slate-200" />
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
