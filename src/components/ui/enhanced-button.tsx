import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-background hover:bg-muted hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // THE EDIT specific variants
        surveillance: "bg-surveillance-inactive text-foreground hover:bg-surveillance-active hover:text-background border border-border",
        confessional: "bg-surveillance-confessional text-foreground hover:bg-surveillance-confessional/80 border border-border",
        action: "bg-card border border-border text-card-foreground hover:bg-muted transition-all duration-200",
        critical: "bg-destructive/20 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
        disabled: "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        wide: "h-12 px-8 py-3 text-base"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  used?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, used = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Override variant if button has been used
    const finalVariant = used ? "disabled" : variant
    const finalDisabled = used || disabled

    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, size, className }))}
        ref={ref}
        disabled={finalDisabled}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }