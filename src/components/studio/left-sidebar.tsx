"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { 
  Cog6ToothIcon as Settings, 
  QuestionMarkCircleIcon as HelpCircle,
  ArrowRightOnRectangleIcon as LogOut,
  CodeBracketSquareIcon as Code2,
  SparklesIcon as Sparkles
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { FileExplorer } from "./file-explorer";

interface LeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  showFileExplorer?: boolean;
  onBackToMain?: () => void;
  onEnterStudio?: () => void;
}

// Navigation items for studio modes
const navigationItems = [
  {
    id: "studio",
    label: "Studio",
    icon: Code2,
    href: "/studio",
    active: true,
    description: "Prompt editor and inference"
  },
  {
    id: "edit-block-test",
    label: "Edit Block Test",
    icon: Sparkles,
    href: "/studio/edit-block-test",
    active: false,
    description: "Test structured edit blocks"
  }
];

export function LeftSidebar({ isCollapsed, onToggle, showFileExplorer = false, onBackToMain, onEnterStudio }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState("studio");
  const router = useRouter();

  const handleNavigation = (item: typeof navigationItems[0]) => {
    setActiveItem(item.id);
    
    // If clicking on Studio and we have a callback to enter studio mode, use it
    if (item.id === 'studio' && onEnterStudio && !showFileExplorer) {
      onEnterStudio();
      return;
    }
    
    router.push(item.href);
  };

  if (isCollapsed) {
    return (
      <div className="w-16 border-r border-border bg-background flex flex-col shadow-lg">
        {/* Logo and Toggle */}
        <div className="p-2 space-y-2">
          <div className="flex justify-center">
            <img 
              src="/promptly_icon_only_white.svg" 
              alt="Promptly" 
              className="h-8 w-8"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={onToggle}
          >
            →
          </Button>
        </div>

        <Separator />

        {/* Navigation Icons */}
        <div className="flex-1 p-2 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem;
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className="h-10 w-10 p-0 relative"
                onClick={() => handleNavigation(item)}
                title={item.label}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // File Explorer mode for Studio
  if (showFileExplorer) {
    return (
      <div className="w-64 border-r border-border bg-background flex flex-col shadow-lg">
        {/* Header with back button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onBackToMain}
            >
              ←
            </Button>
            <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center">
              <Code2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <h3 className="font-semibold">Studio</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggle}
          >
            ←
          </Button>
        </div>

        {/* File Explorer */}
        <FileExplorer className="flex-1" />
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-background flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2">
            <img 
              src="/promptly_text_only_white.svg" 
              alt="Promptly" 
              className="h-6 w-auto"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggle}
        >
          ←
        </Button>
      </div>

      {/* Main Content Area - Navigation only */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Section */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h4>
          </div>
          
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeItem;
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start h-auto p-3"
                onClick={() => handleNavigation(item)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Settings and Actions - Bottom Panel */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => router.push("/studio/settings")}
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>

        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="w-4 h-4 mr-3" />
          Help & Support
        </Button>
        <Separator />

      </div>
    </div>
  );
} 