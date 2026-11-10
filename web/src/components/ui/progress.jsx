import * as React from 'react'
import { cn } from '../../lib/utils'

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value)}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-white/[.07]', className)}
    {...props}
  >
    <div
      className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(111,92,255,.45)] transition-[width] duration-[350ms] ease-[cubic-bezier(.23,1,.32,1)]"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
))
Progress.displayName = 'Progress'

export { Progress }
