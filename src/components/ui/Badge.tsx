import { cn } from '@/lib/cn';

const variants = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  error: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-xs px-2.5 py-1',
};

interface BadgeProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'info', size = 'sm', dot, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
