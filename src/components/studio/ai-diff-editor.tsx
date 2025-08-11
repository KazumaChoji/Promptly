"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AIEditorDiff } from './ai-editor-diff';

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
  startPosition?: number;
  endPosition?: number;
}

interface AIDiffEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  onTextSelection?: (text: string) => void;
  onRightClick?: (text: string) => void;
  aiChanges: AIChange[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
}

export function AIDiffEditor({
  value,
  onChange,
  language = 'plaintext',
  readOnly = false,
  className,
  onTextSelection,
  onRightClick,
  aiChanges,
  onAcceptChange,
  onRejectChange
}: AIDiffEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDiffs, setShowDiffs] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selectedText.trim() && onTextSelection) {
      onTextSelection(selectedText.trim());
    }
  }, [onTextSelection]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    let selectedText = selection?.toString().trim() || '';
    
    // If no text is selected, try to get selection from textarea
    if (!selectedText && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        selectedText = value.substring(start, end).trim();
      }
    }

    if (selectedText && onRightClick) {
      e.preventDefault();
      onRightClick(selectedText);
    }
  }, [value, onRightClick]);

  const toggleDiff = (changeId: string) => {
    setShowDiffs(prev => ({
      ...prev,
      [changeId]: !prev[changeId]
    }));
  };

  const renderContentWithDiffs = () => {
    const pendingChanges = aiChanges.filter(c => c.status === 'pending');
    if (pendingChanges.length === 0) {
      return (
        <textarea
          ref={textareaRef}
          defaultValue={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onContextMenu={handleContextMenu}
          readOnly={readOnly}
          className={`w-full h-full resize-none bg-gray-900 text-gray-100 p-4 font-mono text-sm border-none outline-none ${className}`}
          style={{ 
            fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
            lineHeight: '1.5'
          }}
          placeholder="Start typing... Right-click on selected text for AI suggestions!"
        />
      );
    }

    // For now, we'll show the textarea with diff overlays
    // In a real implementation, you'd want to integrate this more deeply
    return (
      <div className="relative w-full h-full">
        <textarea
          ref={textareaRef}
          defaultValue={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onContextMenu={handleContextMenu}
          readOnly={readOnly}
          className={`w-full h-full resize-none bg-gray-900 text-gray-100 p-4 font-mono text-sm border-none outline-none ${className}`}
          style={{ 
            fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
            lineHeight: '1.5'
          }}
          placeholder="Start typing... Right-click on selected text for AI suggestions!"
        />
        
        {/* Diff Overlays */}
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
          {pendingChanges.map((change) => (
            <div key={change.id} className="pointer-events-auto">
              {showDiffs[change.id] && (
                <div className="mt-4 mx-4">
                  <AIEditorDiff
                    originalText={change.originalText}
                    newText={change.newText}
                    changeId={change.id}
                    onAccept={() => onAcceptChange(change.id)}
                    onReject={() => onRejectChange(change.id)}
                    confidence={change.confidence}
                    action={change.action}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {renderContentWithDiffs()}
      
      {/* Diff Toggle Buttons */}
      {aiChanges.filter(c => c.status === 'pending').length > 0 && (
        <div className="absolute top-4 right-4 flex gap-2">
          {aiChanges.filter(c => c.status === 'pending').map((change) => (
            <button
              key={change.id}
              onClick={() => toggleDiff(change.id)}
              className={`px-3 py-1 text-xs rounded-full border ${
                showDiffs[change.id] 
                  ? 'bg-purple-600 text-white border-purple-500' 
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              {showDiffs[change.id] ? 'Hide Diff' : 'Show Diff'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 