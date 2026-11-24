export default function AdminToolsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading tools">
      <div className="h-8 w-48 rounded-xl bg-slate-200/80" />
      <div className="h-4 w-72 rounded-lg bg-slate-100" />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="h-10 rounded-xl bg-slate-100" />
        <div className="h-10 rounded-xl bg-slate-100" />
        <div className="h-10 rounded-xl bg-slate-100" />
        <div className="h-32 rounded-xl bg-slate-50" />
      </div>
    </div>
  );
}
