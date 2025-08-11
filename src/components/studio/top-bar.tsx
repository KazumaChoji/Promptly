"use client";

import { Cog6ToothIcon as Settings, ArrowLeftIcon as ArrowLeft } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import { useDesktopStore } from "../../lib/desktop-store";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Promptly Logo Component
const PromptlyLogo = ({ className }: { className?: string }) => (
  <svg
    className={className + " block"} // avoid inline baseline cropping
    viewBox="-15 0 90 60"            // widened to include negative x
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <path
      d="M0,0 L60,30 L0,60 L10,35 L40,30 L10,25 Z"
      fill="currentColor"
      transform="translate(30, 30) rotate(-45) translate(-30, -30) scale(1)"
    />
  </svg>
);

export function TopBar() {
  const { 
    files, 
    activeFileId
  } = useDesktopStore();
  
  const activeFile = files.find(f => f.id === activeFileId);
  const pathname = usePathname();
  
  // Show back button when not on the main editor page
  const showBackButton = pathname !== "/studio";

  return (
    <div className="flex items-center justify-between h-16 px-6 bg-card">
      {/* Left side - App branding and back button */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <PromptlyLogo className="w-5 h-5 text-muted-foreground ml-2" />
          <span className="font-semibold text-muted-foreground">Promptly Studio</span>
        </div>
        
        {showBackButton && (
          <Link href="/studio">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-4 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
          </Link>
        )}
      </div>

      {/* Right side - Settings and shortcuts */}
      <div className="flex items-center gap-2">
        <KeyboardShortcuts />
        <Link href="/studio/settings">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
} 