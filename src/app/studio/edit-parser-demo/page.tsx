"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { AIMonacoEditor } from "../../../components/studio/ai-monaco-editor";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { TopBar } from "../../../components/studio/top-bar";
import { PlayIcon as Play, ArrowPathIcon as RotateCcw } from "@heroicons/react/24/outline";

export default function EditParserDemoPage() {
  const [editorValue, setEditorValue] = useState(`// Example code to edit
function greetUser(name) {
  return "Hello, " + name + "!";
}

function calculateSum(a, b) {
  return a + b;
}

// This is a comment that can be improved
const message = "Welcome to our application";`);

  const [editResponse, setEditResponse] = useState(`replace: "Hello, " + name + "!"
with: \`Hello, \${name}!\`

insert before: function calculateSum(a, b) {
content: // Improved sum calculation with validation
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

delete: // This is a comment that can be improved
const message = "Welcome to our application"`);

  const [isApplying, setIsApplying] = useState(false);

  const handleApplyEdits = () => {
    setIsApplying(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      // Use the global method to apply edits
      if (typeof window !== 'undefined' && (window as any).applyAIEdits) {
        (window as any).applyAIEdits(editResponse);
      }
      setIsApplying(false);
    }, 1000);
  };

  const handleReset = () => {
    setEditorValue(`// Example code to edit
function greetUser(name) {
  return "Hello, " + name + "!";
}

function calculateSum(a, b) {
  return a + b;
}

// This is a comment that can be improved
const message = "Welcome to our application";`);
  };

  const handleAIEditResponse = (response: string) => {
    console.log('AI Edit Response received:', response);
    // In a real implementation, this would trigger the edit parser
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Edit Parser Demo</h2>
            <p className="text-sm text-muted-foreground">
              Select text and apply AI edits using the edit parser
            </p>
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
        <div className="w-96 border-l border-border p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Edit Response</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editResponse}
                onChange={(e) => setEditResponse(e.target.value)}
                placeholder="Enter edit instructions..."
                className="h-64 font-mono text-sm"
              />
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleApplyEdits}
                  disabled={isApplying}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isApplying ? 'Applying...' : 'Apply Edits'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Parser Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>replace:</strong> Replace text with new content
              </div>
              <div>
                <strong>insert before:</strong> Insert content before target
              </div>
              <div>
                <strong>insert after:</strong> Insert content after target
              </div>
              <div>
                <strong>delete:</strong> Remove target text
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Example Usage</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="font-mono bg-muted p-2 rounded text-xs">
                replace: "Hello, " + name + "!"<br/>
                with: `Hello, $`{`name`}!`
              </div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                insert before: function calculateSum<br/>
                content: // Improved calculation
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 