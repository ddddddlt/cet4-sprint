import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium leading-6',
  {
    variants: {
      variant: {
        default: 'border-[rgba(111,92,255,.30)] bg-[var(--accent-soft)] text-primary',
        secondary: 'border-white/10 bg-white/[.06] text-muted-foreground',
        outline: 'border-white/10 bg-transparent text-muted-foreground',
        muted: 'border-transparent bg-white/[.05] text-[var(--faint)]',
      },
    },
    defaultVariants: { variant: 'secondary' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
