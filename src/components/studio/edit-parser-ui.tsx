"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  PlayIcon as Play, 
  ArrowPathIcon as RotateCcw, 
  ClockIcon as History, 
  ArrowUturnLeftIcon as Undo, 
  ArrowUturnRightIcon as Redo, 
  DocumentDuplicateIcon as Copy, 
  CheckIcon as Check,
  ExclamationCircleIcon as AlertCircle,
  InformationCircleIcon as Info
} from '@heroicons/react/24/outline';
import { parseEditBlock, EditInstruction } from '../../lib/editParser';
import { useToast } from '../ui/use-toast';

interface HistoryEntry {
  id: string;
  original: string;
  edits: EditInstruction[];
  updated: string;
  timestamp: string;
  description: string;
}

interface EditParserUIProps {
  editorRef: any;
  onContentChange?: (content: string) => void;
  className?: string;
  showHistory?: boolean;
  showExamples?: boolean;
}

export const EditParserUI: React.FC<EditParserUIProps> = ({
  editorRef,
  onContentChange,
  className = "",
  showHistory = true,
  showExamples = true
}) => {
  const [editBlock, setEditBlock] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const applyEditBlock = useCallback(() => {
    if (!editorRef || !editBlock.trim()) {
      toast({
        title: "Error",
        description: "Please enter edit instructions",
        variant: "destructive"
      });
      return;
    }

    setIsApplying(true);
    
    try {
      const model = editorRef.getModel();
      if (!model) {
        toast({
          title: "Error",
          description: "Editor model not available",
          variant: "destructive"
        });
        return;
      }

      const originalText = model.getValue();
      const edits = parseEditBlock(editBlock);
      
      if (edits.length === 0) {
        toast({
          title: "Warning",
          description: "No valid edit instructions found",
          variant: "destructive"
        });
        return;
      }

      // Apply edits using the global method
      if (typeof window !== 'undefined' && (window as any).applyAIEdits) {
        (window as any).applyAIEdits(editBlock);
        
        // Get the updated text after a short delay
        setTimeout(() => {
          const updatedText = model.getValue();
          const timestamp = new Date().toLocaleString();
          
          const historyEntry: HistoryEntry = {
            id: crypto.randomUUID(),
            original: originalText,
            edits,
            updated: updatedText,
            timestamp,
            description: `Applied ${edits.length} edit(s)`
          };

          setHistory(prev => [historyEntry, ...prev]);
          setCurrentHistoryIndex(0);
          
          // Clear the edit block after successful application
          setEditBlock('');
          
          // Notify parent component of content change
          if (onContentChange) {
            onContentChange(updatedText);
          }
          
          toast({
            title: "Success",
            description: `Applied ${edits.length} edit(s) successfully`,
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error applying edits:', error);
      toast({
        title: "Error",
        description: "Failed to apply edits",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  }, [editorRef, editBlock, onContentChange, toast]);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      const targetIndex = currentHistoryIndex + 1;
      const entry = history[targetIndex];
      
      if (editorRef && editorRef.getModel()) {
        editorRef.setValue(entry.original);
        if (onContentChange) {
          onContentChange(entry.original);
        }
      }
      
      setCurrentHistoryIndex(targetIndex);
      toast({
        title: "Undo",
        description: "Reverted to previous state",
      });
    }
  }, [currentHistoryIndex, history, editorRef, onContentChange, toast]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const targetIndex = currentHistoryIndex - 1;
      const entry = history[targetIndex];
      
      if (editorRef && editorRef.getModel()) {
        editorRef.setValue(entry.updated);
        if (onContentChange) {
          onContentChange(entry.updated);
        }
      }
      
      setCurrentHistoryIndex(targetIndex);
      toast({
        title: "Redo",
        description: "Applied changes forward",
      });
    }
  }, [currentHistoryIndex, history, editorRef, onContentChange, toast]);

  const handleCopyEdits = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(editBlock);
    }
    toast({
      title: "Copied",
      description: "Edit instructions copied to clipboard",
    });
  }, [editBlock, toast]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setCurrentHistoryIndex(-1);
    toast({
      title: "Cleared",
      description: "Edit history cleared",
    });
  }, [toast]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Edit Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Edit Instructions
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEdits}
                disabled={!editBlock.trim()}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={editBlock}
            onChange={(e) => setEditBlock(e.target.value)}
            placeholder="Enter edit instructions in the format:
replace: [exact text to replace]
with: [new text]

insert before: [exact text to insert before]
content: [content to insert]

delete: [exact text to delete]"
            className="h-48 font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button 
              onClick={applyEditBlock}
              disabled={isApplying || !editBlock.trim()}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {isApplying ? 'Applying...' : 'Apply Edits'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditBlock('')}
              disabled={!editBlock.trim()}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Controls */}
      {showHistory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Edit History
                <Badge variant="secondary">{history.length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={currentHistoryIndex >= history.length - 1}
                >
                  <Undo className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={currentHistoryIndex <= 0}
                >
                  <Redo className="w-4 h-4 mr-1" />
                  Redo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={history.length === 0}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">No edit history yet</span>
                </div>
              ) : (
                history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded border text-sm cursor-pointer transition-colors ${
                      index === currentHistoryIndex
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => {
                      if (editorRef && editorRef.getModel()) {
                        editorRef.setValue(entry.updated);
                        if (onContentChange) {
                          onContentChange(entry.updated);
                        }
                        setCurrentHistoryIndex(index);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{entry.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.edits.length} edit(s) applied
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Examples */}
      {showExamples && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Instruction Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Replace Text:</div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                replace: "Hello, " + name + "!"<br/>
                with: `Hello, $`{`name`}!`
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Insert Before:</div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                insert before: function calculateSum<br/>
                content: // Improved calculation with validation
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Insert After:</div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                insert after: return a + b;<br/>
                content: {'}'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Delete Text:</div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                delete: // TODO: Add error handling
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 