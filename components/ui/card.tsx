import React from 'react';
import { cn } from '../../lib/utils';

/* ─── Card ────────────────────────────────────────────────────── */

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-hub-panel/80 backdrop-blur-sm',
        'border border-hub-border/80',
        'rounded-2xl p-5',
        'shadow-sm',
        'transition-all duration-200',
        'hover:border-hub-border',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

/* ─── CardHeader ──────────────────────────────────────────────── */

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5 mb-4',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

/* ─── CardTitle ───────────────────────────────────────────────── */

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-bold text-base text-hub-text leading-tight tracking-tight',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

/* ─── CardDescription ─────────────────────────────────────────── */

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-xs text-hub-text-muted leading-relaxed',
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

/* ─── CardContent ─────────────────────────────────────────────── */

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('pt-0', className)}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

/* ─── CardFooter ──────────────────────────────────────────────── */

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 pt-4 mt-4',
        'border-t border-hub-border/40',
        'text-xs text-hub-text-muted',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
