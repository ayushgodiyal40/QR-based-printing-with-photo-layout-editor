export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-neutral-900 rounded-xl mb-2" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-neutral-900/60 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-slate-200 dark:bg-neutral-900 rounded-xl" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-neutral-900 rounded-xl" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-950 rounded-2xl p-5 border border-gray-100 dark:border-neutral-900 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-neutral-900 mb-3" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-neutral-900 rounded-lg mb-2" />
            <div className="h-4 w-28 bg-slate-100 dark:bg-neutral-900/60 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-900 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-neutral-900 rounded-lg mb-4" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 w-full bg-slate-100 dark:bg-neutral-900/50 rounded-xl flex items-center px-4 gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-neutral-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-slate-200 dark:bg-neutral-800 rounded" />
              <div className="h-3 w-56 bg-slate-100 dark:bg-neutral-900 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-neutral-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
