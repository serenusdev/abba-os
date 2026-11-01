import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-body-md font-label-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary shadow-sm hover:bg-primary-container active:bg-primary",
        default:
          "bg-primary text-on-primary shadow-sm hover:bg-primary-container active:bg-primary",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed active:bg-secondary-container",
        outline:
          "border border-border bg-card text-foreground hover:bg-accent/40 hover:text-primary",
        ghost:
          "text-on-surface-variant hover:bg-accent/40 hover:text-primary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        success:
          "bg-success text-white shadow-sm hover:bg-success/90",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/80",
      },
      size: {
        default: "h-12 px-4 py-2 min-h-[44px]",
        sm: "h-9 px-3 text-label-sm min-h-[36px]",
        lg: "h-[52px] px-6 text-body-md min-h-[48px]",
        icon: "h-12 w-12 min-h-[44px] min-w-[44px] rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
            <span>Memproses...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

