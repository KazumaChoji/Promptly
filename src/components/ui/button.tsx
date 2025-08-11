import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-neuro text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        // Primary neumorphic button with gradient background
        default: [
          "neuro-base text-foreground",
          "bg-neuro-gradient hover:neuro-elevated active:neuro-pressed",
          "hover:text-primary-foreground hover:bg-primary/90",
          "active:scale-[0.98] active:shadow-neuro-inset-sm",
          "before:absolute before:inset-0 before:bg-primary/10 before:opacity-0 before:transition-opacity before:duration-200",
          "hover:before:opacity-100"
        ],
        
        // Primary colored button
        primary: [
          "bg-primary text-primary-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-primary/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:shadow-glow-primary",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:translate-x-[-100%] before:transition-transform before:duration-700",
          "hover:before:translate-x-[100%]"
        ],
        
        // Secondary button with soft blue accent
        secondary: [
          "bg-secondary text-secondary-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-secondary/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:shadow-glow-secondary"
        ],
        
        // Accent button with purple theme
        accent: [
          "bg-accent text-accent-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-accent/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:shadow-glow-accent"
        ],
        
        // Success button
        success: [
          "bg-success text-success-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-success/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:ring-success/20"
        ],
        
        // Warning button
        warning: [
          "bg-warning text-warning-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-warning/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:ring-warning/20"
        ],
        
        // Destructive button
        destructive: [
          "bg-destructive text-destructive-foreground shadow-neuro",
          "hover:shadow-neuro-lg hover:scale-[1.02] hover:bg-destructive/90",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:ring-destructive/20"
        ],
        
        // Ghost button - subtle neumorphic effect
        ghost: [
          "text-foreground bg-transparent",
          "hover:neuro-sm hover:bg-neuro-gradient hover:scale-[1.02]",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "focus:neuro-sm focus:bg-muted/50"
        ],
        
        // Outline button with inset styling
        outline: [
          "border border-border bg-background text-foreground shadow-neuro-inset-sm",
          "hover:shadow-neuro hover:scale-[1.02] hover:bg-muted/50",
          "active:shadow-neuro-inset active:scale-[0.98]",
          "focus:ring-2 focus:ring-primary/20"
        ],
        
        // Link style button
        link: [
          "text-primary underline-offset-4 hover:underline",
          "hover:scale-[1.02] active:scale-[0.98]",
          "transition-all duration-200"
        ],
        
        // Floating action button style
        floating: [
          "shadow-neuro-xl bg-primary text-primary-foreground rounded-full",
          "hover:shadow-neuro-xl hover:scale-110 hover:rotate-3",
          "active:scale-95 active:rotate-0",
          "transition-all duration-300 ease-spring",
          "animate-neuro-float"
        ],
        
        // Pressed/Active state button
        pressed: [
          "shadow-neuro-inset bg-muted text-muted-foreground",
          "hover:shadow-neuro-inset-lg hover:bg-muted/80",
          "active:shadow-neuro-inset-lg active:scale-[0.96]"
        ]
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 rounded-neuro-sm px-2 text-xs",
        sm: "h-8 rounded-neuro-sm px-3 text-xs",
        lg: "h-12 rounded-neuro-lg px-8 text-base",
        xl: "h-14 rounded-neuro-xl px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-neuro-sm",
        "icon-lg": "h-12 w-12 rounded-neuro-lg",
        "icon-xl": "h-14 w-14 rounded-neuro-xl",
      },
      elevation: {
        flat: "shadow-none",
        low: "shadow-neuro-sm",
        medium: "shadow-neuro",
        high: "shadow-neuro-lg",
        floating: "shadow-neuro-xl",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      elevation: "medium",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    elevation,
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // When using asChild, we need to wrap all content in a single element
    // to avoid React.Children.only error from @radix-ui/react-slot
    const content = (
      <>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <div className={cn(
          "flex items-center gap-2 transition-opacity duration-200",
          loading && "opacity-0"
        )}>
          {leftIcon && (
            <span className="flex-shrink-0">
              {leftIcon}
            </span>
          )}
          
          {children}
          
          {rightIcon && (
            <span className="flex-shrink-0">
              {rightIcon}
            </span>
          )}
        </div>
        
        {/* Shimmer effect for primary buttons */}
        {variant === "primary" && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-neuro-shimmer" />
          </div>
        )}
      </>
    );
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, elevation, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? <div className="relative w-full h-full">{content}</div> : content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
