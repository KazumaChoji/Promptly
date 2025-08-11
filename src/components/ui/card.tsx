import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-neuro text-card-foreground transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        // Default neumorphic card
        default: [
          "neuro-card",
          "hover:shadow-neuro-lg hover:scale-[1.01]",
          "group-hover:shadow-neuro-xl"
        ],
        
        // Elevated card that appears to float
        elevated: [
          "neuro-card shadow-neuro-lg",
          "hover:shadow-neuro-xl hover:scale-[1.02] hover:-translate-y-1",
          "transition-all duration-300 ease-spring"
        ],
        
        // Inset card that appears pressed into the surface
        inset: [
          "neuro-inset p-6 bg-muted/30",
          "hover:shadow-neuro-inset-lg hover:bg-muted/40",
          "transition-all duration-200"
        ],
        
        // Floating card with backdrop blur
        floating: [
          "neuro-floating backdrop-blur-sm",
          "hover:shadow-neuro-xl hover:scale-[1.02] hover:-translate-y-2",
          "transition-all duration-300 ease-spring",
          "animate-neuro-float"
        ],
        
        // Interactive card with press animations
        interactive: [
          "neuro-card cursor-pointer",
          "hover:shadow-neuro-lg hover:scale-[1.02]",
          "active:shadow-neuro-inset-sm active:scale-[0.98]",
          "transition-all duration-200"
        ],
        
        // Outline card with border
        outline: [
          "border border-border bg-background shadow-neuro-sm p-6",
          "hover:shadow-neuro hover:border-primary/20",
          "transition-all duration-200"
        ],
        
        // Glass morphism variant
        glass: [
          "bg-background/60 backdrop-blur-lg border border-border/50 shadow-neuro p-6",
          "hover:bg-background/80 hover:shadow-neuro-lg",
          "transition-all duration-300"
        ],
        
        // Status variants
        success: [
          "neuro-status-success p-6",
          "hover:shadow-neuro-lg hover:scale-[1.01]",
          "border-l-4 border-l-success"
        ],
        
        warning: [
          "neuro-status-warning p-6",
          "hover:shadow-neuro-lg hover:scale-[1.01]",
          "border-l-4 border-l-warning"
        ],
        
        error: [
          "neuro-status-error p-6",
          "hover:shadow-neuro-lg hover:scale-[1.01]",
          "border-l-4 border-l-destructive"
        ]
      },
      size: {
        sm: "p-4 rounded-neuro-sm",
        default: "p-6 rounded-neuro",
        lg: "p-8 rounded-neuro-lg",
        xl: "p-10 rounded-neuro-xl"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5 pb-4",
  {
    variants: {
      variant: {
        default: "",
        centered: "text-center items-center",
        spaced: "flex-row items-center justify-between space-y-0"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const cardTitleVariants = cva(
  "text-lg font-semibold leading-none tracking-tight",
  {
    variants: {
      variant: {
        default: "text-foreground",
        embossed: "neuro-text-embossed text-foreground",
        primary: "text-primary",
        gradient: "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
      },
      size: {
        sm: "text-base",
        default: "text-lg",
        lg: "text-xl",
        xl: "text-2xl"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, variant, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(cardHeaderVariants({ variant }), className)} 
      {...props} 
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, variant, size, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(cardTitleVariants({ variant, size }), className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("pt-0", className)} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 gap-3", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants,
  cardHeaderVariants,
  cardTitleVariants
};
