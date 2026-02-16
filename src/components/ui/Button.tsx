import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm',
  secondary: 'bg-surface-secondary text-text-primary border border-border hover:bg-surface-tertiary active:bg-surface-tertiary',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:bg-surface-tertiary',
  destructive: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'active:scale-[0.98]',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, type ButtonProps };
