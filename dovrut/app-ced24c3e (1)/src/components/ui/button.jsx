import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-accent-primary text-white shadow-accent-glow hover:brightness-105",
        destructive:
          "rounded-full bg-danger text-white shadow-sm hover:brightness-105",
        outline:
          "rounded-full border border-border-strong bg-surface-1 text-text-primary shadow-sm hover:bg-accent-primary/10 hover:text-accent-primary",
        secondary:
          "rounded-full bg-surface-2 text-text-secondary shadow-sm hover:bg-accent-primary/10 hover:text-accent-primary",
        ghost: "rounded-full hover:bg-accent-primary/10 hover:text-accent-primary",
        link: "text-accent-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-11 rounded-full px-8",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
