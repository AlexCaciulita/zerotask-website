import clsx from 'clsx';

const variants = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  error: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

export default function Badge({
  variant = 'info',
  children,
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}
