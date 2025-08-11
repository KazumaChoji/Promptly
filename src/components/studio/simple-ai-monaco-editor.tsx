"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { parseEditBlock, applyEditsToMonaco, extractEditBlock } from '../../lib/editParser';

interface SimpleAIMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  onAIEditResponse?: (response: string) => void;
}

export function SimpleAIMonacoEditor({ 
  value, 
  onChange, 
  language = 'plaintext', 
  readOnly = false,
  className,
  placeholder = "Start typing...",
  onAIEditResponse
}: SimpleAIMonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced onChange handler
  const debouncedOnChange = useCallback((newValue: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 100); // 100ms debounce for typing
  }, [onChange]);

  // Handle AI edit responses and apply edit instructions automatically
  const handleAIEditResponse = useCallback((response: string) => {
    if (!editorRef.current || !monaco) return;

    // Try to extract edit instructions from the response
    const editBlock = extractEditBlock(response);
    if (editBlock) {
      const instructions = parseEditBlock(editBlock);
      if (instructions.length > 0) {
        // Apply the edits directly to the Monaco editor
        applyEditsToMonaco(editorRef.current, instructions);
        console.log(`Applied ${instructions.length} edit instructions`);
        return; // Don't show as regular text if we applied edits
      }
    }

    // If no edit instructions were found, pass to the callback
    if (onAIEditResponse) {
      onAIEditResponse(response);
    }
  }, [monaco, onAIEditResponse]);

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
      // Disable inline completions to prevent model disposal errors
      inlineSuggest: { enabled: false },
      quickSuggestions: false,
      parameterHints: { enabled: false },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: 'off',
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
      hover: { enabled: false },
      codeLens: false,
      folding: false,
      formatOnType: false,
      formatOnPaste: false
    });

    editorRef.current = editor;

    const disposable = editor.onDidChangeModelContent(() => {
      try {
        const model = editor.getModel();
        if (model && !model.isDisposed()) {
          const newValue = editor.getValue();
          debouncedOnChange(newValue);
        }
      } catch (error) {
        console.warn('Error accessing model content:', error);
      }
    });

    return () => {
      try {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        disposable.dispose();
        editor.dispose();
      } catch (error) {
        console.warn('Error disposing editor:', error);
      }
    };
  }, [monaco, isLoaded, value, language, readOnly, onChange, debouncedOnChange]);

  // Update editor value when prop changes with proper validation
  useEffect(() => {
    if (editorRef.current && monaco) {
      try {
        const model = editorRef.current.getModel();
        if (model && !model.isDisposed()) {
          const currentValue = editorRef.current.getValue();
          if (currentValue !== value) {
            editorRef.current.setValue(value);
          }
        }
      } catch (error) {
        console.warn('Error updating editor value:', error);
      }
    }
  }, [value, monaco]);

  if (!isLoaded) {
    return (
      <div className={`w-full h-full bg-muted animate-pulse rounded flex items-center justify-center ${className}`}>
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return <div ref={containerRef} className={`w-full h-full ${className}`} />;
} 