import { cn } from '@/lib/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse', className)}
      {...props}
    />
  );
}

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <Skeleton className={cn('h-3 rounded-full', width)} />;
}

function SkeletonCircle({ size = 'w-10 h-10' }: { size?: string }) {
  return <Skeleton className={cn('rounded-full', size)} />;
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <SkeletonLine width="w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4 rounded" />
        <SkeletonLine width="w-full" />
      </div>
    </div>
  );
}

function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-3">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? 'w-1/3' : 'w-1/6'} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonLine, SkeletonCircle, SkeletonCard, SkeletonTableRow };
