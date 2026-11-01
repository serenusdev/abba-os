import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-label-md text-label-md text-on-surface"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-12 w-full rounded-xl border border-input-border bg-card px-3.5 py-2 text-[16px] text-on-surface placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-error focus-visible:ring-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-[12px] font-label-sm text-error flex items-center gap-1">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-[12px] font-body-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
