"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { Button } from "../ui/button";
import { CheckIcon as Check, XMarkIcon as X, CodeBracketIcon as GitBranch, EyeIcon as Eye, EyeSlashIcon as EyeOff } from "@heroicons/react/24/outline";

export interface AIDiffMonacoEditorProps {
  value: string;
  originalValue?: string;
  onChange: (value: string) => void;
  language?: string;
  className?: string;
  isDiffMode?: boolean;
  onAcceptChange?: (range: monaco.Range, newText: string) => void;
  onRejectChange?: (range: monaco.Range) => void;
  onRightClick?: (text: string, selection: monaco.Selection | monaco.ISelection | any) => void;
  onAIContentChange?: (newContent: string, originalContent: string, actionType: string) => void;
  // Props for exposing diff UI state to parent
  onShowDiffModeToggle?: (show: boolean) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onToggleEyeball?: () => void;
}

export interface AIDiffMonacoEditorRef {
  acceptChange: (range: monaco.Range) => void;
  rejectChange: (range: monaco.Range) => void;
  toggleDiffMode: (original?: string) => void;
  handleAIContentChange: (newContent: string, originalContent: string, actionType: string) => void;
  handleAcceptAll: () => void;
  handleRejectAll: () => void;
  handleShowChanges: () => void;
  handleToggleEyeball: () => void;
  getValue: () => string;
  flushPendingChanges: () => void;
}

interface AIChange {
  id: string;
  timestamp: Date;
  originalText: string;
  newText: string;
  action: string;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied: boolean;
  range?: monaco.Range;
}

/**
 * Enhanced AI Diff Monaco Editor with normal/diff mode switching
 */
export const AIDiffMonacoEditor = forwardRef<AIDiffMonacoEditorRef, AIDiffMonacoEditorProps>(({
  value,
  originalValue,
  onChange,
  language = "plaintext",
  className,
  isDiffMode = false,
  onAcceptChange,
  onRejectChange,
  onRightClick,
  onAIContentChange,
  onShowDiffModeToggle,
  onAcceptAll,
  onRejectAll,
  onToggleEyeball
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const originalModelRef = useRef<monaco.editor.ITextModel | null>(null);
  const modifiedModelRef = useRef<monaco.editor.ITextModel | null>(null);
  
  // State for change tracking and diff mode management
  const [aiChanges, setAiChanges] = useState<AIChange[]>([]);
  const [hasDetectedChanges, setHasDetectedChanges] = useState(false);
  const [showDiffModeToggle, setShowDiffModeToggle] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedChangeRange, setSelectedChangeRange] = useState<monaco.Range | null>(null);

  // Handle AI content changes - automatically detect changes and enter diff mode
  const handleAIContentChange = useCallback((newContent: string, originalContent: string, actionType: string) => {
    if (newContent === originalContent) return;
    
    // Create a new AI change record
    const newChange: AIChange = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      originalText: originalContent,
      newText: newContent,
      action: actionType,
      confidence: 0.85,
      reasoning: `AI ${actionType} action applied`,
      status: 'pending',
      applied: false
    };
    
    setAiChanges(prev => [...prev, newChange]);
    setHasDetectedChanges(true);
    setShowDiffModeToggle(true);
    
    // Trigger callback if provided
    if (onAIContentChange) {
      onAIContentChange(newContent, originalContent, actionType);
    }
  }, [onAIContentChange]);

  // Context menu actions for individual changes
  const handleContextMenuAccept = useCallback(() => {
    if (selectedChangeRange && isDiffMode) {
      if (onAcceptChange) {
        onAcceptChange(selectedChangeRange, value);
      }
    }
    setContextMenuPosition(null);
    setSelectedChangeRange(null);
  }, [selectedChangeRange, isDiffMode, onAcceptChange, value]);

  const handleContextMenuReject = useCallback(() => {
    if (selectedChangeRange && isDiffMode) {
      if (onRejectChange) {
        onRejectChange(selectedChangeRange);
      }
    }
    setContextMenuPosition(null);
    setSelectedChangeRange(null);
  }, [selectedChangeRange, isDiffMode, onRejectChange]);


  // Initialize editor based on mode
  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose existing instances first
    if (editorRef.current) {
      editorRef.current.dispose();
      editorRef.current = null;
    }
    if (diffEditorRef.current) {
      diffEditorRef.current.dispose();
      diffEditorRef.current = null;
    }
    if (originalModelRef.current && !originalModelRef.current.isDisposed()) {
      originalModelRef.current.dispose();
      originalModelRef.current = null;
    }
    if (modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
      modifiedModelRef.current.dispose();
      modifiedModelRef.current = null;
    }

    if (isDiffMode && originalValue && originalValue !== value) {
      // Create diff editor with two models
      originalModelRef.current = monaco.editor.createModel(originalValue, language);
      modifiedModelRef.current = monaco.editor.createModel(value, language);

      diffEditorRef.current = monaco.editor.createDiffEditor(containerRef.current, {
        theme: "vs-dark",
        minimap: { enabled: false },
        automaticLayout: true,
        wordWrap: "on",
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        renderSideBySide: true, // Side-by-side diff view
        originalEditable: false,
        readOnly: false
      });

      diffEditorRef.current.setModel({
        original: originalModelRef.current,
        modified: modifiedModelRef.current
      });

      // Handle changes to the modified editor
      const contentChangeDisposable = modifiedModelRef.current.onDidChangeContent(() => {
        if (modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
          const newValue = modifiedModelRef.current.getValue();
          onChange(newValue);
        }
      });

      // Handle context menu on diff editor's modified editor
      const modifiedEditor = diffEditorRef.current.getModifiedEditor();
      const contextMenuDisposable = modifiedEditor.onContextMenu((e) => {
        const position = e.target.position;
        if (position) {
          const range = new monaco.Range(position.lineNumber, 1, position.lineNumber, Number.MAX_SAFE_INTEGER);
          setSelectedChangeRange(range);
          setContextMenuPosition({ x: e.event.posx, y: e.event.posy });
        }
      });

      return () => {
        contentChangeDisposable?.dispose();
        contextMenuDisposable?.dispose();
      };
    } else {
      // Create regular editor for normal mode
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme: "vs-dark",
        minimap: { enabled: false },
        automaticLayout: true,
        wordWrap: "on",
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 }
      });

      const contentChangeDisposable = editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current && !editorRef.current.getModel()?.isDisposed()) {
          onChange(editorRef.current.getValue());
        }
      });

      const contextMenuDisposable = editorRef.current.onContextMenu((e) => {
        if (onRightClick && editorRef.current && !editorRef.current.getModel()?.isDisposed()) {
          const selection = editorRef.current.getSelection();
          if (selection && !selection.isEmpty()) {
            const text = editorRef.current.getModel()?.getValueInRange(selection) || "";
            onRightClick(text, selection);
          }
        }
      });

      return () => {
        contentChangeDisposable?.dispose();
        contextMenuDisposable?.dispose();
      };
    }
  }, [isDiffMode, originalValue, language, onChange, onRightClick]);

  // Keep value in sync for normal mode
  useEffect(() => {
    if (!isDiffMode && editorRef.current && !editorRef.current.getModel()?.isDisposed()) {
      if (editorRef.current.getValue() !== value) {
        editorRef.current.setValue(value);
      }
    } else if (isDiffMode && modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
      if (modifiedModelRef.current.getValue() !== value) {
        modifiedModelRef.current.setValue(value);
      }
    }
  }, [value, isDiffMode]);

  // Visual indicators for changes detected
  useEffect(() => {
    const shouldShow = hasDetectedChanges && !isDiffMode;
    setShowDiffModeToggle(shouldShow);
    if (onShowDiffModeToggle) {
      onShowDiffModeToggle(shouldShow);
    }
  }, [hasDetectedChanges, isDiffMode, onShowDiffModeToggle]);

  // Expose accept/reject all functions to parent
  const handleAcceptAll = useCallback(() => {
    if (onAIContentChange) {
      onAIContentChange(value, value, 'diff-resolved');
    }
    if (onAcceptAll) {
      onAcceptAll();
    }
  }, [value, onAIContentChange, onAcceptAll]);

  const handleRejectAll = useCallback(() => {
    if (originalValue && onAIContentChange) {
      onChange(originalValue);
      onAIContentChange(originalValue, originalValue, 'diff-resolved');
    }
    if (onRejectAll) {
      onRejectAll();
    }
  }, [originalValue, onChange, onAIContentChange, onRejectAll]);

  const handleShowChanges = useCallback(() => {
    if (onAIContentChange && value !== originalValue) {
      onAIContentChange(value, originalValue || '', 'toggle-diff');
    }
  }, [onAIContentChange, value, originalValue]);

  const handleToggleEyeball = useCallback(() => {
    setShowDiffModeToggle(false);
    if (onToggleEyeball) {
      onToggleEyeball();
    }
  }, [onToggleEyeball]);

  // Update the ref to expose these functions
  useImperativeHandle(ref, () => ({
    acceptChange: (range: monaco.Range) => {
      if (onAcceptChange) {
        onAcceptChange(range, value);
      }
    },
    rejectChange: (range: monaco.Range) => {
      if (onRejectChange) {
        onRejectChange(range);
      }
    },
    toggleDiffMode: (original?: string) => {
      // Toggle between diff and normal mode
    },
    handleAIContentChange,
    // Expose the new handlers
    handleAcceptAll,
    handleRejectAll,
    handleShowChanges,
    handleToggleEyeball,
    // Get current value from the appropriate editor
    getValue: () => {
      try {
        if (isDiffMode && modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
          return modifiedModelRef.current.getValue();
        } else if (!isDiffMode && editorRef.current && !editorRef.current.getModel()?.isDisposed()) {
          return editorRef.current.getValue();
        }
      } catch (err) {
        console.warn('Error getting editor value:', err);
      }
      return value; // Fallback to prop value
    },
    // Flush any pending changes (for this editor, changes are immediate so just return current value)
    flushPendingChanges: () => {
      // The AIDiffMonacoEditor doesn't debounce changes, they're sent immediately
      // But we can ensure the latest value is propagated
      try {
        let currentValue = value;
        if (isDiffMode && modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
          currentValue = modifiedModelRef.current.getValue();
        } else if (!isDiffMode && editorRef.current && !editorRef.current.getModel()?.isDisposed()) {
          currentValue = editorRef.current.getValue();
        }
        
        if (currentValue !== value) {
          onChange(currentValue);
        }
      } catch (err) {
        console.warn('Error flushing pending changes:', err);
      }
    }
  }), [onAcceptChange, onRejectChange, value, handleAIContentChange, handleAcceptAll, handleRejectAll, handleShowChanges, handleToggleEyeball, isDiffMode, onChange]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Context Menu for Individual Changes */}
      {contextMenuPosition && isDiffMode && (
        <div
          className="absolute z-20 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            onClick={handleContextMenuAccept}
          >
            <Check className="w-4 h-4 text-green-500" />
            Accept Change
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            onClick={handleContextMenuReject}
          >
            <X className="w-4 h-4 text-red-500" />
            Reject Change
          </button>
        </div>
      )}

      {/* Close context menu when clicking elsewhere */}
      {contextMenuPosition && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setContextMenuPosition(null)}
        />
      )}

      {/* Monaco Editor Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}); 