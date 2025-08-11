"use client";

import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useDesktopStore } from "../../lib/desktop-store";
import { 
  DocumentIcon as FileText, 
  TrashIcon as Trash2,
  ArrowDownTrayIcon as Download,
  ArrowUpTrayIcon as Upload,
  MagnifyingGlassIcon as Search,
  XMarkIcon as X,
  DocumentArrowDownIcon as Save
} from "@heroicons/react/24/outline";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "../ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

interface FileExplorerProps {
  className?: string;
}

interface FileItemProps {
  file: any;
  isActive: boolean;
  onOpen: (fileId: string) => void;
  onRename: (fileId: string, currentName: string) => void;
  onDelete: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  onSave: (fileId: string) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'markdown':
      return <FileText className="w-4 h-4 text-blue-400" />;
    case 'text':
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
};

const FileItem = ({ 
  file, 
  isActive, 
  onOpen, 
  onRename, 
  onDelete, 
  onDownload,
  onSave,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel
}: FileItemProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (spanRef.current) {
        const newName = spanRef.current.textContent || '';
        onRenameChange(newName);
        onRenameSubmit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onRenameCancel();
    }
  };
  
  useLayoutEffect(() => {
    if (isRenaming && spanRef.current) {
      const span = spanRef.current;
      // Set initial content for rename
      span.textContent = renameValue;

      // Focus and select text synchronously
      span.focus();
              const range = typeof document !== 'undefined' ? document.createRange() : null;
      const selection = typeof window !== 'undefined' ? window.getSelection() : null;

      // For files, select only the base name (before extension)
      const text = span.textContent || '';
      const dotIdx = text.lastIndexOf('.');

      if (range && selection) {
        if (dotIdx > 0 && span.firstChild) {
          // Select from start to before the extension
          range.setStart(span.firstChild, 0);
          range.setEnd(span.firstChild, dotIdx);
        } else {
          // Select all text for files without extension
          range.selectNodeContents(span);
        }

        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [isRenaming]); // Only run when entering/exiting rename mode

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 group ${
            isActive ? 'bg-muted/50 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: '8px' }}
          onClick={() => onOpen(file.id)}
        >
          {getFileIcon(file.type)}
          <div className="flex-1 ml-2 min-w-0">
            <span 
              ref={spanRef}
              className={`truncate ${isRenaming ? 'bg-blue-600/20 px-1 rounded outline-none' : ''} text-muted-foreground group-hover:text-white`}
              contentEditable={isRenaming}
              suppressContentEditableWarning={true}
              onKeyDown={handleKeyDown}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRename(file.id, file.name);
              }}
            >
              {file.name}
            </span>
          </div>
          {file.unsaved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave(file.id);
              }}
              className="h-5 w-5 p-0 ml-1 opacity-70 hover:opacity-100 text-muted-foreground hover:text-white"
              title="Save changes"
            >
              <Save className="w-3 h-3" />
            </Button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-gray-800 border-gray-700">
        <ContextMenuItem 
          onClick={() => onDownload(file.id)}
          className="text-muted-foreground hover:bg-muted focus:bg-muted"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-gray-700" />
        <ContextMenuItem 
          onClick={() => onDelete(file.id)}
          className="text-red-400 hover:bg-muted focus:bg-muted"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export function FileExplorer({ className }: FileExplorerProps) {
  const {
    files,
    activeFileId,
    createFile,
    renameFile,
    deleteFile,
    openFile,
    uploadFile,
    downloadFile,
    saveFile,
  } = useDesktopStore();

  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<'text' | 'markdown'>('text');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(file => 
    file && file.name && file.content && (
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getFiles = () => {
    return (isSearching ? filteredFiles : files)
      .filter(f => f && f.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleCreateFile = () => {
    setShowNewFileDialog(true);
  };

  const handleConfirmCreateFile = async () => {
    if (newFileName.trim()) {
      try {
        await createFile(newFileName.trim(), newFileType);
        setNewFileName("");
        setNewFileType('text');
        setShowNewFileDialog(false);
      } catch (error) {
        console.error('Failed to create file:', error);
        // Could show a toast notification here
      }
    }
  };

  const startFileRename = (fileId: string, currentName: string) => {
    setRenamingId(fileId);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = async () => {
    if (renamingId && renameValue.trim()) {
      try {
        await renameFile(renamingId, renameValue.trim());
      } catch (error) {
        console.error('Failed to rename:', error);
        // Could show a toast notification here
      }
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFile(id);
    } catch (error) {
      console.error('Failed to delete:', error);
      // Could show a toast notification here
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFile]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearching(value.length > 0);
  };

  const handleSave = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (file) {
        await saveFile(fileId, file.content);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  // Save all files function
  const handleSaveAll = useCallback(() => {
    // Check if this is the first time user is saving
    const hasSeenSaveWarning = localStorage.getItem('save-warning-shown') === 'true';
    
    if (!hasSeenSaveWarning) {
      setShowSaveWarning(true);
      return;
    }
    
    performSaveAll();
  }, []);

  const performSaveAll = useCallback(async () => {
    const unsavedFiles = files.filter(f => f.unsaved);
    if (unsavedFiles.length === 0) return;

    try {
      for (const file of unsavedFiles) {
        await saveFile(file.id, file.content);
      }
      console.log(`Saved ${unsavedFiles.length} file(s) to browser storage`);
    } catch (error) {
      console.error('Failed to save files:', error);
    }
  }, [files, saveFile]);

  const handleConfirmSave = useCallback(() => {
    localStorage.setItem('save-warning-shown', 'true');
    setShowSaveWarning(false);
    performSaveAll();
  }, [performSaveAll]);

  const unsavedFilesCount = files.filter(f => f.unsaved).length;

  return (
    <div className={`flex flex-col h-full bg-card text-foreground ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Explorer
          </h2>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCreateFile()}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="New File"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-6 w-6 p-0 hover:bg-muted"
              title="Upload File"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-7 h-7 text-xs bg-background border-border text-foreground placeholder-muted-foreground"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-muted"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="p-1 space-y-0.5 min-h-full">
              {/* Files */}
              {getFiles().map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  isActive={activeFileId === file.id}
                  onOpen={openFile}
                  onRename={startFileRename}
                  onDelete={handleDelete}
                  onDownload={downloadFile}
                  onSave={handleSave}
                  isRenaming={renamingId === file.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={handleRenameCancel}
                />
              ))}
              
              {/* Empty state */}
              {getFiles().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No files</p>
                  <p className="text-xs mt-1">Click the + button to create a new file</p>
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="bg-popover border-border">
            <ContextMenuItem 
              onClick={() => handleCreateFile()}
              className="text-foreground hover:bg-muted focus:bg-muted"
            >
              <FileText className="w-4 h-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-border" />
            <ContextMenuItem 
              onClick={() => fileInputRef.current?.click()}
              className="text-foreground hover:bg-muted focus:bg-muted"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
        accept=".txt,.md"
      />

      {/* Create File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">File Name</label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter file name"
                className="mt-1 bg-background border-border text-foreground"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">File Type</label>
              <select
                value={newFileType}
                onChange={(e) => setNewFileType(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              >
                <option value="text">Text File (.txt)</option>
                <option value="markdown">Markdown File (.md)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowNewFileDialog(false)}
              className="text-muted-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmCreateFile}
              className="bg-primary hover:bg-primary/90"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Warning Dialog */}
      <Dialog open={showSaveWarning} onOpenChange={setShowSaveWarning}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Save className="w-5 h-5 text-yellow-500" />
              Important: Local Storage Only
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              💾 <strong>Files are saved to browser storage only</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Your files are stored in your browser's localStorage, not on your computer's file system. This means:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Files persist between browser sessions</li>
              <li>• Files may be lost if you clear browser data</li>
              <li>• Files are not saved to your computer's hard drive</li>
              <li>• For permanent storage, copy important content elsewhere</li>
            </ul>
            <p className="text-xs text-muted-foreground border-t pt-2 mt-3">
              💡 This is a demonstration app designed for public GitHub repositories.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowSaveWarning(false)}
              className="text-muted-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              I Understand - Save to Browser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}