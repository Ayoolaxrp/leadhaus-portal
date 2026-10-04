export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-56 rounded-[var(--radius-ctl)] bg-surface-2" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-[var(--radius-ctl)] bg-surface-2" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-[var(--radius-card)] bg-surface" />)}
      </div>
      <div className="mt-6 h-64 rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}
