"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { AIEditChunk } from '../../lib/ai-editor-types';
import { Button } from '../ui/button';
import { CheckIcon as Check, XMarkIcon as X, EyeIcon as Eye, EyeSlashIcon as EyeOff } from '@heroicons/react/24/outline';
import { parseEditBlock, applyEditsToMonaco, EditInstruction, extractEditBlock } from '../../lib/editParser';

interface AIMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  onGenerateCustomSuggestion?: (prompt: string) => Promise<string>;
  onQuickActionApplied?: (originalText: string, newText: string, selection: any) => void;
  onRightClick?: (text: string, selection: any) => void;
  onAIEditResponse?: (editResponse: string) => void;
}

interface PendingChange {
  id: string;
  startLine: number;
  endLine: number;
  originalText: string;
  newText: string;
  confidence: number;
  reasoning: string;
}

export const AIMonacoEditor = forwardRef<any, AIMonacoEditorProps>(({ 
  value, 
  onChange, 
  language = 'plaintext', 
  readOnly = false,
  className,
  onGenerateCustomSuggestion,
  onQuickActionApplied,
  onRightClick,
  onAIEditResponse
}, ref) => {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [showDiff, setShowDiff] = useState(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flush any pending debounced changes immediately
  const flushPendingChanges = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      
      // Get current editor value and call onChange immediately
      if (editorRef.current) {
        const currentValue = editorRef.current.getValue();
        onChange(currentValue);
      }
    }
  }, [onChange]);

  // Expose editor ref and flush method to parent component
  useImperativeHandle(ref, () => ({
    ...(editorRef.current || {}),
    flushPendingChanges, // Add flush method to the exposed interface
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (newValue: string) => editorRef.current?.setValue(newValue),
  }), [editorRef.current, flushPendingChanges]);

  // Debounced onChange handler
  const debouncedOnChange = useCallback((newValue: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 100); // 100ms debounce for typing
  }, [onChange]);

  // Load Monaco Editor dynamically
  useEffect(() => {
    const loadMonaco = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const monacoModule = await import('monaco-editor');
        setMonaco(monacoModule);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
      }
    };

    loadMonaco();
  }, []);

  // Initialize editor when Monaco is loaded
  useEffect(() => {
    if (!monaco || !containerRef.current || !isLoaded) return;

    // Define custom theme to match our app's color scheme
    monaco.editor.defineTheme('promptly-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#141414', // --card color (8% lightness)
        'editor.foreground': '#d1d1d1', // --foreground color
        'editorLineNumber.foreground': '#999999', // --muted-foreground
        'editorIndentGuide.background': '#333333', // --border
        'editor.selectionBackground': '#404040', // Subtle selection
        'editor.lineHighlightBackground': '#1a1a1a', // --muted
        'editorCursor.foreground': '#d1d1d1', // --foreground
        'editorWhitespace.foreground': '#666666',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0044',
        'editor.rangeHighlightBackground': '#ffffff0b',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888'
      }
    });

    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      readOnly,
      theme: 'promptly-dark',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineHeight: 24,
      padding: { top: 16, bottom: 16 },
      contextmenu: true,
      // Completely disable all suggestion features to prevent model disposal issues
      quickSuggestions: false,
      parameterHints: { enabled: false },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: 'off',
      quickSuggestionsDelay: 10000,
      // Disable inline completions to prevent model disposal errors
      inlineSuggest: { enabled: false },
      suggest: { 
        showMethods: false,
        showFunctions: false,
        showConstructors: false,
        showFields: false,
        showVariables: false,
        showClasses: false,
        showStructs: false,
        showInterfaces: false,
        showModules: false,
        showProperties: false,
        showEvents: false,
        showOperators: false,
        showUnits: false,
        showValues: false,
        showConstants: false,
        showEnums: false,
        showEnumMembers: false,
        showKeywords: false,
        showText: false,
        showColors: false,
        showFiles: false,
        showReferences: false,
        showFolders: false,
        showTypeParameters: false,
        showSnippets: false,
        showUsers: false,
        showIssues: false
      },
      // Disable hover provider to prevent model access issues
      hover: { enabled: false },
      // Disable code lens
      codeLens: false,
      // Disable folding
      folding: false,
      // Disable format on paste/type
      formatOnType: false,
      formatOnPaste: false,
      // Add stability options
      renderWhitespace: 'none',
      renderControlCharacters: false,
      renderLineHighlight: 'none',
      // Prevent focus issues
      autoIndent: 'none',
      formatOnSave: false
    });

    editorRef.current = editor;

    // Handle content changes with proper model validation and debouncing
    const disposable = editor.onDidChangeModelContent(() => {
      try {
        // Check if model is still valid before accessing
        const model = editor.getModel();
        if (model && !model.isDisposed()) {
          const newValue = editor.getValue();
          // Only trigger change if value actually changed
          if (newValue !== value) {
            debouncedOnChange(newValue);
          }
        }
      } catch (error) {
        console.warn('Error accessing model content:', error);
      }
    });

    // Handle right-click context menu with proper model validation
    const contextMenuDisposable = editor.onContextMenu((e: any) => {
      try {
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (selection && !selection.isEmpty() && onRightClick && model && !model.isDisposed()) {
          const selectedText = model.getValueInRange(selection) || '';
          onRightClick(selectedText, selection);
        }
      } catch (error) {
        console.warn('Error handling context menu:', error);
      }
    });

    // Focus the editor to prevent focus loss issues
    setTimeout(() => {
      if (editor) {
        try {
          // Some Monaco builds don’t expose isDisposed; focus directly
          editor.focus();
        } catch (_err) {
          /* no-op */
        }
      }
    }, 100);

    return () => {
      try {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        disposable.dispose();
        contextMenuDisposable.dispose();
        try {
          editor.dispose();
        } catch (_err) {
          /* ignore if already disposed */
        }
      } catch (error) {
        console.warn('Error disposing editor:', error);
      }
    };
  }, [monaco, isLoaded, value, language, readOnly, onChange, onRightClick]);

  // Update editor value when prop changes with proper validation
  useEffect(() => {
    if (editorRef.current && monaco) {
      try {
        const model = editorRef.current.getModel();
        if (model && !model.isDisposed()) {
          const currentValue = editorRef.current.getValue();
          if (currentValue !== value) {
            // Preserve cursor position when updating value
            const position = editorRef.current.getPosition();
            editorRef.current.setValue(value);
            if (position) {
              editorRef.current.setPosition(position);
            }
          }
        }
      } catch (error) {
        console.warn('Error updating editor value:', error);
      }
    }
  }, [value, monaco]);

  const handleGenerateAISuggestion = async (selectedText: string, selection: any) => {
    if (!onGenerateCustomSuggestion) return;

    try {
      const suggestion = await onGenerateCustomSuggestion(selectedText);
      
      const change: PendingChange = {
        id: `change-${Date.now()}`,
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber,
        originalText: selectedText,
        newText: suggestion,
        confidence: 0.85,
        reasoning: 'AI-generated suggestion based on selected text'
      };

      setPendingChanges(prev => [...prev, change]);
      
      if (showDiff) {
        createDiffVisualization(change);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestion:', error);
    }
  };

  const handleQuickActionApplied = (originalText: string, newText: string, selection: any) => {
    if (onQuickActionApplied) {
      onQuickActionApplied(originalText, newText, selection);
    }
  };


  const createDiffVisualization = (change: PendingChange) => {
    if (!editorRef.current || !monaco) return;

    // Create diff view zone
    const diffElement = createDiffViewZone(change.newText, change.id);
    
    // Add view zone
    editorRef.current.changeViewZones((changeAccessor: any) => {
      changeAccessor.addZone({
        afterLineNumber: change.endLine,
        heightInLines: Math.max(2, change.newText.split('\n').length + 1),
        domNode: diffElement
      });
    });

    // Add decorations for original text
    editorRef.current.deltaDecorations([], [{
      range: new monaco.Range(change.startLine, 1, change.endLine, Number.MAX_SAFE_INTEGER),
      options: {
        className: 'ai-change-original',
        isWholeLine: true,
        linesDecorationsClassName: 'ai-change-line-decoration'
      }
    }]);
  };

  const createDiffViewZone = (newText: string, changeId: string): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'ai-diff-zone border border-border rounded p-3 m-2';
    container.style.backgroundColor = 'hsl(0 0% 8%)'; // --card color
    
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-2 p-3 -m-3 mb-3 rounded-t border-b border-border';
    header.style.backgroundColor = 'hsl(0 0% 4%)'; // --background color (darker)
    
    const label = document.createElement('span');
    label.className = 'text-sm font-medium text-muted-foreground';
    label.textContent = 'AI Suggestion';
    
    const actions = createActionButtons(pendingChanges.find(c => c.id === changeId)!);
    
    header.appendChild(label);
    header.appendChild(actions);
    
    const content = document.createElement('pre');
    content.className = 'text-sm bg-muted p-2 rounded whitespace-pre-wrap font-mono';
    content.textContent = newText;
    
    container.appendChild(header);
    container.appendChild(content);
    
    return container;
  };

  const createActionButtons = (change: PendingChange): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'flex gap-2';
    
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'bg-success hover:bg-success/90 text-success-foreground h-6 px-2 text-xs rounded flex items-center gap-1';
    acceptBtn.innerHTML = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Accept';
    acceptBtn.onclick = () => handleAcceptChange(change.id);
    
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'bg-destructive hover:bg-destructive/90 text-destructive-foreground h-6 px-2 text-xs rounded flex items-center gap-1';
    rejectBtn.innerHTML = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>Reject';
    rejectBtn.onclick = () => handleRejectChange(change.id);
    
    container.appendChild(acceptBtn);
    container.appendChild(rejectBtn);
    
    return container;
  };

  const handleAcceptChange = (changeId: string) => {
    const change = pendingChanges.find(c => c.id === changeId);
    if (!change || !editorRef.current || !monaco) return;

    // Apply the change to the editor
    const range = new monaco.Range(change.startLine, 1, change.endLine, Number.MAX_SAFE_INTEGER);
    editorRef.current.executeEdits('ai-suggestion', [{
      range,
      text: change.newText
    }]);

    // Remove from pending changes
    setPendingChanges(prev => prev.filter(c => c.id !== changeId));
    
    // Clear decorations and view zones
    clearDiffVisualizations();
    
    // Trigger callback
    if (onQuickActionApplied) {
      onQuickActionApplied(change.originalText, change.newText, range);
    }
  };

  const handleRejectChange = (changeId: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== changeId));
    clearDiffVisualizations();
  };

  const clearDiffVisualizations = () => {
    if (!editorRef.current) return;
    
    try {
      const model = editorRef.current.getModel();
      if (model && !model.isDisposed()) {
        // Clear decorations
        editorRef.current.deltaDecorations(model.getAllDecorations() || [], []);
        
        // Clear view zones
        editorRef.current.changeViewZones((changeAccessor: any) => {
          // Remove all view zones (this is a simplified approach)
        });
      }
    } catch (error) {
      console.warn('Error clearing diff visualizations:', error);
    }
  };

  const toggleDiffVisibility = () => {
    setShowDiff(!showDiff);
  };

  const handleAcceptAll = () => {
    pendingChanges.forEach(change => handleAcceptChange(change.id));
  };

  const handleRejectAll = () => {
    setPendingChanges([]);
    clearDiffVisualizations();
  };

  // Handle AI edit responses using the edit parser
  const handleAIEditResponse = useCallback((editResponse: string) => {
    if (!editorRef.current || !monaco) return;

    try {
      // Parse the edit response
      const edits = parseEditBlock(editResponse);
      
      if (edits.length === 0) {
        console.warn('No valid edits found in AI response');
        return;
      }

      // Apply the edits to the Monaco editor
      applyEditsToMonaco(editorRef.current, edits);

      // Trigger the callback if provided
      if (onAIEditResponse) {
        onAIEditResponse(editResponse);
      }

      // Update the editor value through the onChange callback
      const newValue = editorRef.current.getValue();
      if (newValue !== value) {
        onChange(newValue);
      }

    } catch (error) {
      console.error('Error applying AI edits:', error);
    }
  }, [editorRef, monaco, onAIEditResponse, onChange, value]);

  // Expose the handleAIEditResponse method through a ref
  const handleAIEditResponseRef = useRef(handleAIEditResponse);
  
  // Update the ref when the function changes
  useEffect(() => {
    handleAIEditResponseRef.current = handleAIEditResponse;
  }, [handleAIEditResponse]);

  // Expose the method globally for demo purposes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).applyAIEdits = (editResponse: string) => {
        handleAIEditResponseRef.current(editResponse);
      };
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className={`w-full h-full bg-muted animate-pulse rounded flex items-center justify-center ${className}`}>
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Diff Controls */}
      {pendingChanges.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDiffVisibility}
            className="bg-background border-border hover:bg-accent h-6 px-2 text-xs"
          >
            {showDiff ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptAll}
            className="bg-success hover:bg-success/90 text-success-foreground h-6 px-2 text-xs"
          >
            Accept All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectAll}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-6 px-2 text-xs"
          >
            Reject All
          </Button>
        </div>
      )}
      
      {/* Monaco Editor Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}); 