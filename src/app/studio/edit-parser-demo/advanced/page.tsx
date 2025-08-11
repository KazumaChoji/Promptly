"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { AIMonacoEditor } from "../../../../components/studio/ai-monaco-editor";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { TopBar } from "../../../../components/studio/top-bar";
import { PlayIcon as Play, ArrowPathIcon as RotateCcw, SparklesIcon as Sparkles, ArrowPathIcon as Loader2 } from "@heroicons/react/24/outline";
import { aiEditorService } from "../../../../lib/ai-editor-service";
import { useToast } from "../../../../components/ui/use-toast";

export default function AdvancedEditParserDemoPage() {
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

  const [userInstruction, setUserInstruction] = useState("Improve the code by adding TypeScript types, error handling, and better formatting");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEdits, setGeneratedEdits] = useState("");
  const { toast } = useToast();

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
      
      setGeneratedEdits(editResponse);
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

  const handleApplyEdits = () => {
    if (!generatedEdits.trim()) {
      toast({
        title: "Error",
        description: "No edits to apply",
        variant: "destructive"
      });
      return;
    }

    // Use the global method to apply edits
    if (typeof window !== 'undefined' && (window as any).applyAIEdits) {
      (window as any).applyAIEdits(generatedEdits);
      toast({
        title: "Success",
        description: "Edits applied successfully",
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
    setGeneratedEdits("");
    setUserInstruction("Improve the code by adding TypeScript types, error handling, and better formatting");
  };

  const handleAIEditResponse = (response: string) => {
    console.log('AI Edit Response received:', response);
    // The edit parser will handle the actual application
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Advanced Edit Parser Demo</h2>
            <p className="text-sm text-muted-foreground">
              Use AI to generate and apply edit instructions
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
              <CardTitle>AI Instruction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                placeholder="Describe what changes you want to make..."
                className="h-24"
              />
              <Button 
                onClick={handleGenerateEdits}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Edits
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Edit Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedEdits}
                onChange={(e) => setGeneratedEdits(e.target.value)}
                placeholder="AI-generated edit instructions will appear here..."
                className="h-64 font-mono text-sm"
                readOnly
              />
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleApplyEdits}
                  disabled={!generatedEdits.trim()}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Apply Edits
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
              <CardTitle>Example Instructions</CardTitle>
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