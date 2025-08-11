import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-neuro text-sm transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default neumorphic input with inset appearance
        default: [
          "neuro-input",
          "focus:shadow-neuro-inset focus:ring-2 focus:ring-primary/20",
          "hover:shadow-neuro-inset-lg"
        ],
        
        // Elevated input that appears raised
        elevated: [
          "bg-background border border-border shadow-neuro-sm px-4 py-3",
          "hover:shadow-neuro focus:shadow-neuro-lg focus:border-primary/50",
          "focus:ring-2 focus:ring-primary/20"
        ],
        
        // Outline variant with subtle neumorphic border
        outline: [
          "bg-background border-2 border-border px-4 py-3",
          "hover:border-primary/30 hover:shadow-neuro-sm",
          "focus:border-primary focus:shadow-neuro focus:ring-2 focus:ring-primary/20"
        ],
        
        // Glass morphism variant
        glass: [
          "bg-background/60 backdrop-blur-lg border border-border/50 px-4 py-3",
          "hover:bg-background/80 hover:border-border",
          "focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        ],
        
        // Floating label variant
        floating: [
          "neuro-input peer",
          "focus:shadow-neuro-inset focus:ring-2 focus:ring-primary/20",
          "placeholder-transparent"
        ],
        
        // Search variant with enhanced styling
        search: [
          "neuro-input pl-10 pr-4",
          "focus:shadow-neuro-inset focus:ring-2 focus:ring-primary/20",
          "hover:shadow-neuro-inset-lg"
        ]
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-neuro-sm",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 py-3 text-base rounded-neuro-lg",
        xl: "h-14 px-8 py-4 text-lg rounded-neuro-xl"
      },
      state: {
        default: "",
        error: "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
        success: "border-success/50 focus:border-success focus:ring-success/20",
        warning: "border-warning/50 focus:border-warning focus:ring-warning/20"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default"
    }
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    variant, 
    size, 
    state,
    leftIcon,
    rightIcon,
    label,
    error,
    success,
    loading,
    disabled,
    ...props 
  }, ref) => {
    const inputId = React.useId();
    const isFloating = variant === "floating";
    const hasError = error || state === "error";
    const hasSuccess = success || state === "success";
    const hasWarning = state === "warning";
    
    // Determine the actual state based on props
    const actualState = hasError ? "error" : hasSuccess ? "success" : hasWarning ? "warning" : "default";
    
    const inputElement = (
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Right Icon */}
        {rightIcon && !loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {rightIcon}
          </div>
        )}
        
        <input
          id={isFloating ? inputId : undefined}
          type={type}
          className={cn(
            inputVariants({ variant, size, state: actualState }),
            leftIcon && "pl-10",
            (rightIcon || loading) && "pr-10",
            className
          )}
          ref={ref}
          disabled={disabled || loading}
          {...props}
        />
        
        {/* Floating Label */}
        {isFloating && label && (
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 pointer-events-none",
              "peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-primary",
              "peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-75"
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
    
    // If not floating, wrap with label and messages
    if (!isFloating) {
      return (
        <div className="space-y-2">
          {label && (
            <label 
              htmlFor={inputId}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
          )}
          
          {inputElement}
          
          {/* Error Message */}
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-destructive/20 flex items-center justify-center">
                !
              </span>
              {error}
            </p>
          )}
          
          {/* Success Message */}
          {success && (
            <p className="text-xs text-success flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-success/20 flex items-center justify-center">
                ✓
              </span>
              {success}
            </p>
          )}
        </div>
      );
    }
    
    return inputElement;
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
