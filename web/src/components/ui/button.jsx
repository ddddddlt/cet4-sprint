import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 active:scale-[.985] active:opacity-90 [@media(hover:none)]:active:scale-[.99]',
  {
    variants: {
      variant: {
        default: 'border border-white/10 bg-white/[.06] text-foreground hover:border-white/20 hover:bg-white/[.10]',
        primary: 'border border-transparent bg-primary text-primary-foreground shadow-[0_0_28px_rgba(111,92,255,.22)] hover:bg-primary/90',
        destructive: 'border border-[rgba(240,113,106,.35)] bg-[rgba(240,113,106,.12)] text-danger hover:bg-[rgba(240,113,106,.18)]',
        outline: 'border border-white/10 bg-transparent text-foreground hover:border-white/20 hover:bg-white/[.06]',
        secondary: 'border border-transparent bg-white/[.06] text-foreground hover:bg-white/[.10]',
        ghost: 'border border-transparent text-muted-foreground hover:bg-white/[.06] hover:text-foreground',
        link: 'min-h-0 border-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-sm',
        icon: 'h-11 w-11 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, ...props }, ref) => {
  const classes = cn(buttonVariants({ variant, size, className }))
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(classes, children.props.className),
      ref,
    })
  }
  return <button ref={ref} type="button" className={classes} {...props}>{children}</button>
})
Button.displayName = 'Button'

export { Button, buttonVariants }
