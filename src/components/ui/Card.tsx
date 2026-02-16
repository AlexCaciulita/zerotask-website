import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  accentColor?: string; // e.g. 'border-l-blue-500'
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const paddings = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  children,
  className,
  header,
  footer,
  accentColor,
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border',
      'shadow-sm',
      hover && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
      accentColor && `border-l-4 ${accentColor}`,
      className
    )}>
      {header && (
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}
