"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// Monaco Editor will be imported dynamically to avoid SSR issues
import { useDesktopStore } from "../../lib/desktop-store";
import { Button } from "../ui/button";
import { 
  DocumentArrowDownIcon as Save, 
  DocumentIcon as FileText, 
  ExclamationTriangleIcon as AlertCircle, 
  ArrowTopRightOnSquareIcon as ExternalLink, 
  SparklesIcon as Sparkles, 
  CommandLineIcon as Bot, 
  CodeBracketIcon as GitBranch, 
  CheckIcon as Check, 
  XMarkIcon as X, 
  EyeIcon as Eye 
} from "@heroicons/react/24/outline";
import { MonacoEditor } from "./monaco-editor";
import { AIMonacoEditor } from "./ai-monaco-editor";
import { SimpleAIMonacoEditor } from "./simple-ai-monaco-editor";
import { AIDiffEditor } from "./ai-diff-editor";
// New Monaco diff editor (AI enhanced)
import { AIDiffMonacoEditor, AIDiffMonacoEditorRef } from "./ai-diff-monaco-editor";
import { AISidebar } from "./ai-sidebar";
import { AIQuickActionsPanel } from "./ai-quick-actions-panel";
import { AIChangeTracker } from "./ai-change-tracker";
import { AIInlineDiff } from "./ai-inline-diff";
import { aiEditorService } from "../../lib/ai-editor-service";
import { aiPromptEditorService, AIPromptEditorResponse, applyQuickActionWithOpenAI } from "../../lib/ai-prompt-editor-service";
import { useToast } from "../ui/use-toast";
import { UserSettingsService } from "../../lib/user-settings";

// Import AIChange interface
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
}

interface EditorPaneProps {
  showAISidebar?: boolean;
  onToggleAISidebar?: () => void;
}

export function EditorPane({ showAISidebar = false, onToggleAISidebar }: EditorPaneProps) {
  const {
    files,
    activeFileId,
    setContent,
    saveFile,
    getActiveFileContent,
  } = useDesktopStore();

  const { toast } = useToast();
  const [editorValue, setEditorValue] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // AI Sidebar state - use props if provided, otherwise use local state
  const [localShowAISidebar, setLocalShowAISidebar] = useState(false);
  const actualShowAISidebar = showAISidebar !== undefined ? showAISidebar : localShowAISidebar;
  const actualOnToggleAISidebar = onToggleAISidebar || (() => setLocalShowAISidebar(!localShowAISidebar));
  const [selectedText, setSelectedText] = useState('');
  const [isGeneratingNLP, setIsGeneratingNLP] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState<AIPromptEditorResponse | null>(null);
  
  // Quick Actions Panel state
  const [showQuickActionsPanel, setShowQuickActionsPanel] = useState(false);
  
  // Change Tracker state
  const [showChangeTracker, setShowChangeTracker] = useState(false);
  const [aiChanges, setAiChanges] = useState<AIChange[]>([]);
  
  // Inline Diff state
  const [showInlineDiff, setShowInlineDiff] = useState(false);
  const [currentDiffChange, setCurrentDiffChange] = useState<AIChange | null>(null);

  // Diff mode state
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [originalContentForDiff, setOriginalContentForDiff] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [showDiffModeToggle, setShowDiffModeToggle] = useState(false);

  // Monaco diff editor ref
  const diffEditorRef = useRef<AIDiffMonacoEditorRef>(null);

  // Monaco editor ref for AI sidebar integration
  const monacoEditorRef = useRef<any>(null);
  
  // Track the debounce timeout for content updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeFile = files.find(file => file.id === activeFileId);

  // Load user settings for auto-save
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await UserSettingsService.getUserSettings();
        // Default to false since autoSave is not in the settings interface yet
        setAutoSaveEnabled(false);
      } catch (error) {
        console.error('Failed to load auto-save setting:', error);
      }
    };
    loadSettings();
  }, []);

  // Load content when active file changes
  useEffect(() => {
    if (activeFile) {
      setEditorValue(activeFile.content);
      setOriginalContent(activeFile.content);
      setLastSavedContent(activeFile.content);
      setHasUnsavedChanges(false);
    }
  }, [activeFile]);

  // Check for changes whenever editor value changes
  useEffect(() => {
    if (activeFile) {
      const hasChanges = editorValue !== originalContent;
      setHasUnsavedChanges(hasChanges);
      console.log('Change detection:', {
        editorValue: editorValue.length,
        originalContent: originalContent.length,
        hasChanges
      });
    }
  }, [editorValue, originalContent, activeFile]);

  // Handle editor content changes with debouncing
  const handleEditorChange = useCallback((value: string) => {
    setEditorValue(value);
    
    // Don't immediately update the store - this causes re-renders and focus loss
    // The store will be updated when the user saves or when we debounce the changes
  }, []);

  // Debounced content update to avoid excessive re-renders
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (editorValue !== originalContent) {
        setContent(editorValue);
      }
    }, 1000); // Increased debounce to 1000ms to reduce frequency

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [editorValue, originalContent, setContent]);

  // Auto-save functionality (only when enabled)
  useEffect(() => {
    if (!autoSaveEnabled || !hasUnsavedChanges || !activeFile) return;

    const autoSaveTimeout = setTimeout(async () => {
      try {
        console.log('Auto-saving file:', activeFile.id);
        await saveFile(activeFile.id, editorValue);
        setHasUnsavedChanges(false);
        setOriginalContent(editorValue);
        setLastSavedContent(editorValue);
        console.log('Auto-save completed');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(autoSaveTimeout);
  }, [editorValue, hasUnsavedChanges, activeFile, autoSaveEnabled, saveFile]);

  // Prevent focus loss on state updates
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refocus editor when tab becomes visible
        const editorElement = document.querySelector('.monaco-editor');
        if (editorElement) {
          (editorElement as HTMLElement).focus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save the current file
  const handleSave = useCallback(async () => {
    if (!activeFile || isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Flush any pending debounced content changes first
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      if (diffEditorRef.current && diffEditorRef.current.flushPendingChanges) {
        diffEditorRef.current.flushPendingChanges();
      }
      
      // Get the most current content directly from the editor
      let currentContent = editorValue;
      if (diffEditorRef.current && diffEditorRef.current.getValue) {
        try {
          currentContent = diffEditorRef.current.getValue();
        } catch (err) {
          console.warn('Could not get current value from diff editor, using editorValue:', err);
        }
      }
      
      // Update the content immediately if it differs from our state
      if (currentContent !== editorValue) {
        setEditorValue(currentContent);
        setContent(currentContent);
      }
      
      console.log('Saving file:', activeFile.id, 'with content length:', currentContent.length);
      
      await saveFile(activeFile.id, currentContent);
      setHasUnsavedChanges(false);
      setOriginalContent(currentContent); // Update original content after successful save
      setLastSavedContent(currentContent); // Track the last saved content for diff comparison
      
      console.log('File saved successfully');
      toast({
        title: "File saved",
        description: `${activeFile.name} has been saved successfully.`,
      });
    } catch (error) {
      console.error('Save failed:', error);
      
      // Log additional debug info
      console.log('Debug info:', {
        activeFileId: activeFile.id,
        contentLength: editorValue.length,
        hasUnsavedChanges,
        isSaving
      });
      
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save file",
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, editorValue, isSaving, saveFile, toast, setContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // AI handlers
  const [currentSelection, setCurrentSelection] = useState<{ startLine: number; endLine: number; startColumn: number; endColumn: number } | null>(null);
  
  const handleTextSelection = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  const handleRightClick = useCallback((text: string, selection?: any) => {
    setSelectedText(text);
    if (selection) {
      setCurrentSelection({
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber,
        startColumn: selection.startColumn,
        endColumn: selection.endColumn
      });
    } else {
      setCurrentSelection(null);
    }
    if (text.trim()) {
      setShowQuickActionsPanel(true);
    }
  }, []);

  const handleNLPSubmit = useCallback(async (instruction: string) => {
    setIsGeneratingNLP(true);
    try {
      const response = await aiPromptEditorService.generateActions({
        highlightedText: selectedText,
        customPrompt: instruction,
        fullPromptContent: editorValue,
        contextBefore: '',
        contextAfter: ''
      });
      
      setSuggestionsData(response);
    } catch (error) {
      console.error('Failed to generate NLP suggestions:', error);
    } finally {
      setIsGeneratingNLP(false);
    }
  }, [selectedText, editorValue]);

  const handleApplyAction = useCallback((action: any) => {
    const originalValue = editorValue;
    let newValue = editorValue;
    
    if (action.type === 'replace') {
      newValue = editorValue.replace(action.originalText, action.newText);
      handleEditorChange(newValue);
    } else if (action.type === 'insert') {
      newValue = editorValue + '\n' + action.newText;
      handleEditorChange(newValue);
    } else if (action.type === 'enhance' || action.type === 'rewrite') {
      newValue = editorValue.replace(action.originalText, action.newText);
      handleEditorChange(newValue);
    }
    
    // Track change and potentially trigger diff mode
    if (diffEditorRef.current && newValue !== originalValue) {
      diffEditorRef.current.handleAIContentChange(newValue, originalValue, action.type || 'AI Action');
    }
  }, [editorValue, handleEditorChange]);

  const handleApplySuggestion = useCallback((suggestion: string) => {
    const originalValue = editorValue;
    let newValue = editorValue;
    
    if (selectedText) {
      newValue = editorValue.replace(selectedText, suggestion);
      handleEditorChange(newValue);
    } else {
      newValue = editorValue + '\n\n// ' + suggestion;
      handleEditorChange(newValue);
    }
    
    // Track change and potentially trigger diff mode
    if (diffEditorRef.current && newValue !== originalValue) {
      diffEditorRef.current.handleAIContentChange(newValue, originalValue, 'AI Suggestion');
    }
  }, [selectedText, editorValue, handleEditorChange]);

  // Change tracking handlers
  const handleAcceptChange = useCallback(async (changeId: string) => {
    setAiChanges(prev => prev.map(change => 
      change.id === changeId 
        ? { ...change, status: 'accepted' as const, applied: true }
        : change
    ));

    // If in diff mode, accept the change visually in the diff editor
    if (isDiffMode && diffEditorRef.current) {
      const change = aiChanges.find(c => c.id === changeId);
      if (change) {
        // TODO: Replace with accurate range detection
        const monaco = await import('monaco-editor');
        diffEditorRef.current.acceptChange(new monaco.Range(1, 1, 1, 1));
      }
    }
  }, [isDiffMode, aiChanges]);

  const handleRejectChange = useCallback(async (changeId: string) => {
    const change = aiChanges.find(c => c.id === changeId);

    // If in diff mode, reject visually
    if (change && isDiffMode && diffEditorRef.current) {
      const monaco = await import('monaco-editor');
      diffEditorRef.current.rejectChange(new monaco.Range(1, 1, 1, 1));
    }

    setAiChanges(prev => prev.map(change => 
      change.id === changeId 
        ? { ...change, status: 'rejected' as const }
        : change
    ));
  }, [isDiffMode, aiChanges]);

  const handleRevertChange = useCallback((changeId: string) => {
    const change = aiChanges.find(c => c.id === changeId);
    if (change) {
      // Revert the text change
      const newValue = editorValue.replace(change.newText, change.originalText);
      handleEditorChange(newValue);
      
      // Remove the change from tracking
      setAiChanges(prev => prev.filter(c => c.id !== changeId));
      
      toast({
        title: 'Change reverted',
        description: 'The AI change has been reverted.'
      });
    }
  }, [aiChanges, editorValue, handleEditorChange, toast]);

  const handleApplyAllChanges = useCallback(() => {
    const pendingChanges = aiChanges.filter(c => c.status === 'pending');
    if (pendingChanges.length === 0) return;
    
    setAiChanges(prev => prev.map(change => 
      change.status === 'pending' 
        ? { ...change, status: 'accepted' as const, applied: true }
        : change
    ));
    
    toast({
      title: 'All changes applied',
      description: `${pendingChanges.length} AI changes have been applied.`
    });
  }, [aiChanges, toast]);

  const handleRevertAllChanges = useCallback(() => {
    const appliedChanges = aiChanges.filter(c => c.status === 'accepted' && c.applied);
    if (appliedChanges.length === 0) return;
    
    // Revert all applied changes
    let newValue = editorValue;
    appliedChanges.forEach(change => {
      newValue = newValue.replace(change.newText, change.originalText);
    });
    handleEditorChange(newValue);
    
    // Remove all applied changes from tracking
    setAiChanges(prev => prev.filter(c => !(c.status === 'accepted' && c.applied)));
    
    toast({
      title: 'All changes reverted',
      description: `${appliedChanges.length} AI changes have been reverted.`
    });
  }, [aiChanges, editorValue, handleEditorChange, toast]);

  // Inline Diff handlers
  const handleToggleDiff = useCallback((changeId: string) => {
    const change = aiChanges.find(c => c.id === changeId);
    if (change) {
      setCurrentDiffChange(change);
      setShowInlineDiff(true);
    }
  }, [aiChanges]);

  const handleHighlightChange = useCallback((changeId: string) => {
    const change = aiChanges.find(c => c.id === changeId);
    if (change) {
      // TODO: Implement highlighting in the editor
      toast({
        title: 'Highlight Change',
        description: 'Change highlighting will be implemented soon.'
      });
    }
  }, [aiChanges, toast]);

  const handleInlineDiffAccept = useCallback(() => {
    if (currentDiffChange) {
      handleAcceptChange(currentDiffChange.id);
      setShowInlineDiff(false);
      setCurrentDiffChange(null);
      toast({
        title: 'Change accepted',
        description: 'The change has been accepted via inline diff.'
      });
    }
  }, [currentDiffChange, handleAcceptChange, toast]);

  const handleInlineDiffReject = useCallback(() => {
    if (currentDiffChange) {
      handleRejectChange(currentDiffChange.id);
      setShowInlineDiff(false);
      setCurrentDiffChange(null);
      toast({
        title: 'Change rejected',
        description: 'The change has been rejected via inline diff.'
      });
    }
  }, [currentDiffChange, handleRejectChange, toast]);

  const handleInlineDiffClose = useCallback(() => {
    setShowInlineDiff(false);
    setCurrentDiffChange(null);
  }, []);

  // Quick Action apply handler
  const handleQuickActionApply = useCallback(async (modifiedText: string) => {
    if (!selectedText) return;

    let newValue = editorValue;

    // Prefer model-level edit if we still have the original selection
    if (monacoEditorRef.current && currentSelection) {
      try {
        const monaco = await import('monaco-editor');
        const { startLine, endLine, startColumn, endColumn } = currentSelection;
        const range = new monaco.Range(startLine, startColumn, endLine, endColumn);
        monacoEditorRef.current.executeEdits('quick-action', [
          { range, text: modifiedText, forceMoveMarkers: true }
        ]);

        newValue = monacoEditorRef.current.getValue();
        handleEditorChange(newValue);
      } catch (err) {
        console.warn('Monaco edit failed, falling back to string replace', err);
      }
    } else {
      newValue = editorValue.replace(selectedText, modifiedText);
      handleEditorChange(newValue);
    }

    // Track change and trigger AI diff mode
    if (diffEditorRef.current) {
      diffEditorRef.current.handleAIContentChange(newValue, editorValue, 'Quick Action');
    }

    // Also track change for AI history / diff viewer
    const newChange: AIChange = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      originalText: selectedText,
      newText: modifiedText,
      action: 'Quick Action',
      confidence: 0.85,
      reasoning: 'Applied quick action',
      status: 'pending',
      applied: false
    };

    setAiChanges(prev => [...prev, newChange]);

  }, [selectedText, editorValue, handleEditorChange, monacoEditorRef, currentSelection]);

  // Enter / Exit diff mode handlers
  const handleEnterDiffMode = useCallback((original: string) => {
    setOriginalContentForDiff(original);
    setIsDiffMode(true);
    if (diffEditorRef.current) {
      diffEditorRef.current.toggleDiffMode(original);
    }
  }, []);

  const handleExitDiffMode = useCallback(() => {
    setIsDiffMode(false);
    setOriginalContentForDiff("");
    if (diffEditorRef.current) {
      diffEditorRef.current.toggleDiffMode();
    }
  }, []);

  // Direct diff editor callbacks
  const handleDiffAcceptChange = useCallback(async (range: any, newText: string) => {
    const monaco = await import('monaco-editor');
    console.log('Accepted change at range:', range, 'with text:', newText);
    const newChange: AIChange = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      originalText: '', // TODO: capture original text
      newText,
      action: 'Manual Accept',
      confidence: 1.0,
      reasoning: 'Manually accepted via diff editor',
      status: 'accepted',
      applied: true
    };
    setAiChanges(prev => [...prev, newChange]);
  }, []);

  const handleDiffRejectChange = useCallback(async (range: any) => {
    const monaco = await import('monaco-editor');
    console.log('Rejected change at range:', range);
    // Potential tracking can be added here
  }, []);

  // Editor stats removed with status bar

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No file selected</h3>
            <p className="text-sm text-muted-foreground">Select a file from the explorer to start editing</p>
            <Button
              onClick={() => useDesktopStore.getState().createFile('untitled.md', 'markdown')}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              Create New File
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">

      
      {/* Header with diff mode toggle */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          
          {/* Show/Exit Diff button */}
          <Button
            variant={isDiffMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (isDiffMode) {
                handleExitDiffMode();
              } else {
                // Use lastSavedContent if no unsaved changes, otherwise use originalContent
                const compareAgainst = !hasUnsavedChanges ? lastSavedContent : originalContent;
                if (compareAgainst !== editorValue) {
                  handleEnterDiffMode(compareAgainst);
                }
              }
            }}
            disabled={!hasUnsavedChanges && !isDiffMode && editorValue === lastSavedContent}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            {isDiffMode ? "Exit Diff" : "Show Diff"}
          </Button>
          
          {/* Diff mode controls */}
          {isDiffMode && (
            <>
              <div className="text-sm text-muted-foreground mr-2">
                Diff Mode - Right-click on lines to accept/reject
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => diffEditorRef.current?.handleAcceptAll()}
                className="bg-green-500/90 hover:bg-green-600 text-white border-green-500 text-xs px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                Accept All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => diffEditorRef.current?.handleRejectAll()}
                className="bg-red-500/90 hover:bg-red-600 text-white border-red-500 text-xs px-2"
              >
                <X className="w-3 h-3 mr-1" />
                Reject All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => diffEditorRef.current?.handleToggleEyeball()}
                className="bg-background/90 hover:bg-accent border-border"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

      </div>

      {/* AI-Enhanced Monaco Diff Editor */}
      <div className="flex-1 relative">
        <AIDiffMonacoEditor
          ref={diffEditorRef}
          value={editorValue}
          onChange={handleEditorChange}
          language={activeFile.type}
          className="absolute inset-0"
          originalValue={isDiffMode ? originalContentForDiff : undefined}
          isDiffMode={isDiffMode}
          onAcceptChange={handleDiffAcceptChange}
          onRejectChange={handleDiffRejectChange}
          onRightClick={handleRightClick}
          onAIContentChange={(newContent, originalContent, actionType) => {
            // Handle different action types
            if (actionType === 'diff-resolved') {
              // Diff was resolved via accept/reject - exit diff mode
              setIsDiffMode(false);
              setOriginalContentForDiff('');
              // Don't update originalContent here - let it track the actual editing baseline
              // Only update if this represents a real save/commit
            } else if (!isDiffMode && newContent !== originalContent) {
              // Automatically enter diff mode when AI changes are detected
              setOriginalContentForDiff(originalContent);
              setIsDiffMode(true);
            }
          }}
          onShowDiffModeToggle={setShowDiffModeToggle}
          onAcceptAll={() => {
            // Additional handling for accept all if needed
          }}
          onRejectAll={() => {
            // Additional handling for reject all if needed
          }}
          onToggleEyeball={() => {
            setShowDiffModeToggle(false);
          }}
        />
      </div>
      
      {/* Status Bar - Removed */}
      
      {/* AI Sidebar */}
      <AISidebar
        isOpen={actualShowAISidebar}
        onToggle={actualOnToggleAISidebar}
        onClose={() => actualOnToggleAISidebar()}
        activeFileContent={editorValue}
        onUpdateFileContent={handleEditorChange}
        monacoEditorRef={monacoEditorRef}
        diffEditorRef={diffEditorRef}
        onNLPSubmit={handleNLPSubmit}
        isGeneratingNLP={isGeneratingNLP}
        suggestionsData={suggestionsData}
        onApplyAction={handleApplyAction}
        onApplySuggestion={handleApplySuggestion}
        onCloseSuggestions={() => setSuggestionsData(null)}
      />

      {/* Quick Actions Panel */}
      <AIQuickActionsPanel
        isOpen={showQuickActionsPanel}
        onClose={() => setShowQuickActionsPanel(false)}
        selectedText={selectedText}
        fullPromptContent={editorValue}
        onApplyAction={handleQuickActionApply}
        currentSelection={currentSelection || undefined}
      />

      {/* AI Change Tracker */}
      <AIChangeTracker
        isOpen={showChangeTracker}
        onClose={() => setShowChangeTracker(false)}
        changes={aiChanges}
        onAcceptChange={handleAcceptChange}
        onRejectChange={handleRejectChange}
        onRevertChange={handleRevertChange}
        onApplyAll={handleApplyAllChanges}
        onRevertAll={handleRevertAllChanges}
        onToggleDiff={handleToggleDiff}
        onHighlightChange={handleHighlightChange}
      />

      {/* AI Inline Diff */}
      {currentDiffChange && (
        <AIInlineDiff
          isVisible={showInlineDiff}
          originalText={currentDiffChange.originalText}
          newText={currentDiffChange.newText}
          changeId={currentDiffChange.id}
          onAccept={handleInlineDiffAccept}
          onReject={handleInlineDiffReject}
          onClose={handleInlineDiffClose}
          confidence={currentDiffChange.confidence}
          action={currentDiffChange.action}
        />
      )}
    </div>
  );
} 