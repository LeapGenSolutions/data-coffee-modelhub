import React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  size?: 'sm' | 'default' | 'lg';
  color?: string;
}

export function Avatar({
  initials,
  size = 'default',
  color = '#3B4A6B',
  className,
  ...props
}: AvatarProps) {
  const sizes: Record<string, string> = {
    sm: 'w-[24px] h-[24px] text-[10px]',
    default: 'w-[30px] h-[30px] text-[12px]',
    lg: 'w-[32px] h-[32px] text-[13px]',
  };

  return (
    <div
      className={cn(
        'rounded-full text-white font-bold',
        'flex items-center justify-center shrink-0',
        'select-none shadow-sm',
        'border border-white/10',
        sizes[size],
        className
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -25)})` }}
      title={initials}
      {...props}
    >
      {initials}
    </div>
  );
}

/** Shift hex colour brightness by `amount` (negative = darker). */
function adjustBrightness(hex: string, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const num = parseInt(hex.replace('#', ''), 16);
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
