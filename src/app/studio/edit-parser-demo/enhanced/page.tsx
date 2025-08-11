"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState, useRef } from "react";
import { AIMonacoEditor } from "../../../../components/studio/ai-monaco-editor";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Textarea } from "../../../../components/ui/textarea";
import { TopBar } from "../../../../components/studio/top-bar";
import { PlayIcon as Play, ArrowPathIcon as RotateCcw, ClockIcon as History, ArrowUturnLeftIcon as Undo, ArrowUturnRightIcon as Redo, DocumentDuplicateIcon as Copy, CheckIcon as Check } from "@heroicons/react/24/outline";
import { parseEditBlock, EditInstruction } from "../../../../lib/editParser";
import { aiEditorService } from "../../../../lib/ai-editor-service";
import { useToast } from "../../../../components/ui/use-toast";

interface HistoryEntry {
  id: string;
  original: string;
  edits: EditInstruction[];
  updated: string;
  timestamp: string;
  description: string;
}

export default function EnhancedEditParserDemoPage() {
  const [editorValue, setEditorValue] = useState(`// Example React component
import React from 'react';

function GreetingComponent({ name }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Welcome to our application</p>
    </div>
  );
}

function calculateSum(a, b) {
  return a + b;
}

// TODO: Add error handling
const message = "Welcome to our application";`);

  const [editBlock, setEditBlock] = useState(`replace: "Hello, " + name + "!"
with: \`Hello, \${name}!\`

insert before: function calculateSum(a, b) {
content: // Improved calculation with validation
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

delete: // TODO: Add error handling
const message = "Welcome to our application"`);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isApplying, setIsApplying] = useState(false);
  const [userInstruction, setUserInstruction] = useState("Improve the code by adding TypeScript types and error handling");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleApplyEditBlock = () => {
    if (!editBlock.trim()) {
      toast({
        title: "Error",
        description: "Please enter edit instructions",
        variant: "destructive"
      });
      return;
    }

    setIsApplying(true);
    
    // Simulate processing time
    setTimeout(() => {
      try {
        const originalText = editorValue;
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
            const updatedText = editorValue; // This will be updated by the editor
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
            
            toast({
              title: "Success",
              description: `Applied ${edits.length} edit(s) successfully`,
            });
          }, 100);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to apply edits",
          variant: "destructive"
        });
      } finally {
        setIsApplying(false);
      }
    }, 500);
  };

  const handleGenerateEdits = async () => {
    if (!userInstruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const editResponse = await aiEditorService.generateEditParserResponse(
        editorValue,
        userInstruction,
        "JavaScript/TypeScript code improvement"
      );
      
      setEditBlock(editResponse);
      toast({
        title: "Success",
        description: "AI edit instructions generated successfully",
      });
    } catch (error) {
      console.error('Error generating edits:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate edits",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const targetIndex = currentHistoryIndex + 1;
      const entry = history[targetIndex];
      setEditorValue(entry.original);
      setCurrentHistoryIndex(targetIndex);
      toast({
        title: "Undo",
        description: "Reverted to previous state",
      });
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex > 0) {
      const targetIndex = currentHistoryIndex - 1;
      const entry = history[targetIndex];
      setEditorValue(entry.updated);
      setCurrentHistoryIndex(targetIndex);
      toast({
        title: "Redo",
        description: "Applied changes forward",
      });
    }
  };

  const handleReset = () => {
    setEditorValue(`// Example React component
import React from 'react';

function GreetingComponent({ name }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Welcome to our application</p>
    </div>
  );
}

function calculateSum(a, b) {
  return a + b;
}

// TODO: Add error handling
const message = "Welcome to our application";`);
    setEditBlock(`replace: "Hello, " + name + "!"
with: \`Hello, \${name}!\`

insert before: function calculateSum(a, b) {
content: // Improved calculation with validation
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

delete: // TODO: Add error handling
const message = "Welcome to our application"`);
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setUserInstruction("Improve the code by adding TypeScript types and error handling");
  };

  const handleCopyEdits = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(editBlock);
    }
    toast({
      title: "Copied",
      description: "Edit instructions copied to clipboard",
    });
  };

  const handleAIEditResponse = (response: string) => {
    console.log('AI Edit Response received:', response);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Enhanced Edit Parser Demo</h2>
                <p className="text-sm text-muted-foreground">
                  AI-powered code editing with history tracking
                </p>
              </div>
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
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <AIMonacoEditor
              value={editorValue}
              onChange={setEditorValue}
              language="javascript"
              className="absolute inset-0"
              onAIEditResponse={handleAIEditResponse}
            />
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-96 border-l border-border p-4 space-y-4 overflow-y-auto">
          {/* AI Instruction */}
          <Card>
            <CardHeader>
              <CardTitle>AI Instruction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                placeholder="Describe what changes you want to make..."
                className="h-20"
              />
              <Button 
                onClick={handleGenerateEdits}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Generate Edits
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Edit Block */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Instructions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEdits}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editBlock}
                onChange={(e) => setEditBlock(e.target.value)}
                placeholder="Enter edit instructions..."
                className="h-48 font-mono text-sm"
              />
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleApplyEditBlock}
                  disabled={isApplying || !editBlock.trim()}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isApplying ? 'Applying...' : 'Apply Edits'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Edit History */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <CardTitle>Edit History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No edit history yet
                  </p>
                ) : (
                  history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded border text-sm ${
                        index === currentHistoryIndex
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border'
                      }`}
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

          {/* Quick Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Code Improvements:</div>
                <div className="text-muted-foreground">
                  • "Add TypeScript types to all functions"
                </div>
                <div className="text-muted-foreground">
                  • "Add error handling to the calculateSum function"
                </div>
                <div className="text-muted-foreground">
                  • "Improve the component with better formatting"
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="font-medium">Text Changes:</div>
                <div className="text-muted-foreground">
                  • "Replace all instances of 'Hello' with 'Welcome'"
                </div>
                <div className="text-muted-foreground">
                  • "Add JSDoc comments to all functions"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 