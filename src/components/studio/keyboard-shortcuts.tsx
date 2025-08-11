"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useDesktopStore } from "../../lib/desktop-store";
import { 
  ComputerDesktopIcon as Keyboard, 
  CommandLineIcon as Command, 
  XMarkIcon as X,
  DocumentArrowDownIcon as Save,
  DocumentIcon as FileText,
  PlusIcon as Plus
} from "@heroicons/react/24/outline";

export function KeyboardShortcuts() {
  const { createFile } = useDesktopStore();
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Alt + K to open shortcuts
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Ctrl/Cmd + Alt + N for new file
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'n') {
        e.preventDefault();
        createFile('untitled.md', 'markdown');
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [createFile]);

  const shortcuts = [
    {
      key: "Ctrl/Cmd + Alt + K",
      description: "Show keyboard shortcuts",
      icon: <Keyboard className="w-4 h-4" />
    },
    {
      key: "Ctrl/Cmd + Alt + N",
      description: "New prompt file",
      icon: <FileText className="w-4 h-4" />
    },
    {
      key: "Ctrl/Cmd + Alt + S",
      description: "Save file",
      icon: <Save className="w-4 h-4" />
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          title="Keyboard shortcuts (Ctrl/Cmd + Alt + K)"
        >
          <Keyboard className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  {shortcut.icon}
                </div>
                <span className="text-sm text-gray-300">
                  {shortcut.description}
                </span>
              </div>
                             <div className="flex items-center gap-1">
                 {shortcut.key.includes('Ctrl/Cmd') ? (
                   <>
                     <kbd className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                       {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                     </kbd>
                     {shortcut.key.includes('Alt') && (
                       <kbd className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                         Alt
                       </kbd>
                     )}
                     {shortcut.key.includes('Shift') && (
                       <kbd className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                         Shift
                       </kbd>
                     )}
                     <kbd className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                       {shortcut.key.includes('Tab') ? 'Tab' : 
                        shortcut.key.includes('K') ? 'K' :
                        shortcut.key.includes('N') ? 'N' :
                        shortcut.key.includes('S') ? 'S' :
                        shortcut.key.includes('B') ? 'B' : ''}
                     </kbd>
                   </>
                 ) : (
                   <kbd className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                     {shortcut.key}
                   </kbd>
                 )}
               </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-400 mt-4 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-600 rounded">Esc</kbd> to close
        </div>
      </DialogContent>
    </Dialog>
  );
} 