import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[rgba(111,92,255,.55)] disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
