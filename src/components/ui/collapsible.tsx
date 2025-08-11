"use client"

import * as React from "react"

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface CollapsibleContextType {
  open: boolean;
  toggle: () => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextType | null>(null);

const Collapsible = ({ open: controlledOpen, onOpenChange, children }: CollapsibleProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const toggle = React.useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!open);
    } else {
      setInternalOpen(!open);
    }
  }, [isControlled, open, onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ open, toggle }}>
      {children}
    </CollapsibleContext.Provider>
  );
};

const CollapsibleTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, onClick, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleTrigger must be used within a Collapsible');
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    context.toggle();
    onClick?.(e);
  };

  return (
    <div ref={ref} onClick={handleClick} {...props}>
      {children}
    </div>
  );
});

CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleContent must be used within a Collapsible');
  }

  if (!context.open) {
    return null;
  }

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
});

CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent }