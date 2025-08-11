"use client";

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
}

export const MonacoEditor = forwardRef<any, MonacoEditorProps>(({ value, onChange, language = 'plaintext', readOnly = false, className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
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

  useEffect(() => {
    if (!monaco || !containerRef.current || !isLoaded) return;

    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      readOnly,
      theme: 'vs-dark',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
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
}); 