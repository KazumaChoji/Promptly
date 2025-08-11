"use client";

import dynamicImport from 'next/dynamic';

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "../../components/studio/top-bar";
import { EditorPane } from "../../components/studio/editor-pane";
import { FileExplorer } from "../../components/studio/file-explorer";
import { Toaster } from "../../components/ui/toaster";

// React resizable panels will be imported dynamically to avoid SSR issues
import { useDesktopStore } from "../../lib/desktop-store";
import { BoltIcon as Zap, CommandLineIcon as Bot, FolderIcon as FolderOpen, FolderIcon as FolderClosed } from "@heroicons/react/24/outline";

// Dynamically import components to avoid SSR issues
const Dock = dynamicImport(() => import("../../components/ui/floating-dock"), {
  ssr: false,
  loading: () => <div className="hidden" />
});

const PanelGroup = dynamicImport(() => import("react-resizable-panels").then(mod => ({ default: mod.PanelGroup })), {
  ssr: false,
  loading: () => <div className="flex-1 flex" />
});

const Panel = dynamicImport(() => import("react-resizable-panels").then(mod => ({ default: mod.Panel })), {
  ssr: false,
  loading: () => <div />
});

const PanelResizeHandle = dynamicImport(() => import("react-resizable-panels").then(mod => ({ default: mod.PanelResizeHandle })), {
  ssr: false,
  loading: () => <div className="w-1 bg-transparent" />
});

export default function StudioPage() {
  const router = useRouter();
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  
  const {
    isLoading,
    initialize,
    files,
    activeFileId,
    createFile
  } = useDesktopStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Simple loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        <div className="bg-card">
          <TopBar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Allow empty file explorer - no automatic file creation

  const activeFile = files.find(f => f.id === activeFileId);

  // Ensure AI sidebar only opens when explicitly triggered
  const handleToggleAISidebar = () => {
    setShowAISidebar(!showAISidebar);
  };

  // Toggle file explorer visibility
  const handleToggleFileExplorer = () => {
    setShowFileExplorer(!showFileExplorer);
  };

  const dockItems = [
    {
      label: showFileExplorer ? "Hide Files" : "Show Files",
      icon: showFileExplorer ? 
        <FolderOpen className="w-5 h-5 text-muted-foreground" /> : 
        <FolderClosed className="w-5 h-5 text-muted-foreground" />,
      onClick: handleToggleFileExplorer,
    },
    {
      label: "Inference",
      icon: <Zap className="w-5 h-5 text-muted-foreground" />,
      onClick: () => router.push(`/studio/inference${activeFile ? `?fileId=${activeFile.id}` : ''}`),
    },
    {
      label: "AI Help",
      icon: <Bot className="w-5 h-5 text-muted-foreground" />,
      onClick: handleToggleAISidebar,
    },
  ];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* TopBar */}
      <div className="bg-card">
        <TopBar />
      </div>
      
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-50">
        <Dock 
          items={dockItems}
          distance={150}
          panelHeight={50}
          baseItemSize={35}
          dockHeight={150}
          magnification={55}
          spring={{ mass: 0.08, stiffness: 180, damping: 15 }}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* File Explorer Panel - Conditionally rendered */}
          {showFileExplorer && (
            <>
              <Panel 
                defaultSize={25} 
                minSize={15} 
                maxSize={40}
                className="bg-card"
              >
                <FileExplorer className="h-full" />
              </Panel>
              
              {/* Resize Handle */}
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-border/20 active:bg-border/40 transition-colors cursor-col-resize" />
            </>
          )}
          
          {/* Main Editor Panel */}
          <Panel defaultSize={showFileExplorer ? 75 : 100} minSize={50}>
            <EditorPane 
              showAISidebar={showAISidebar}
              onToggleAISidebar={handleToggleAISidebar}
            />
          </Panel>
        </PanelGroup>
      </div>
      
      <Toaster />
    </div>
  );
} 