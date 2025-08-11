"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { AIMonacoEditor } from '../../../components/studio/ai-monaco-editor';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

export default function AIEditorDemo() {
  const [promptContent, setPromptContent] = useState(`You are a helpful AI assistant. Please provide clear and concise responses to user questions.

When answering questions:
1. Be accurate and factual
2. Provide examples when helpful
3. Keep responses focused
4. Use a friendly tone

Remember to always verify information before sharing it with users.`);

  // Mock AI suggestion generator
  const generateAISuggestion = async (selectedText: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate different types of suggestions based on content
    if (selectedText.includes('helpful')) {
      return 'extremely helpful and knowledgeable';
    } else if (selectedText.includes('accurate')) {
      return 'precise, accurate, and well-researched';
    } else if (selectedText.includes('friendly')) {
      return 'warm, professional, and approachable';
    } else if (selectedText.includes('verify')) {
      return 'thoroughly fact-check and validate';
    } else {
      // Generic improvement
      return selectedText.replace(/\b\w+/g, (word) => {
        const improvements: { [key: string]: string } = {
          'clear': 'crystal clear',
          'good': 'excellent',
          'nice': 'wonderful',
          'help': 'assist',
          'use': 'utilize',
          'get': 'obtain',
          'make': 'create',
          'do': 'accomplish'
        };
        return improvements[word.toLowerCase()] || word;
      });
    }
  };

  const addSampleChanges = () => {
    // This would simulate AI generating suggestions
    console.log('Sample changes would be added here');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Monaco Editor Demo</h1>
          <p className="text-gray-400">
            VS Code-style inline diff visualization with AI suggestions
          </p>
        </div>

        {/* Instructions */}
        <Card className="mb-6 p-6 bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold mb-4">How to Use</h2>
          <div className="space-y-2 text-gray-300">
            <p>1. <strong>Select text</strong> in the editor below</p>
            <p>2. <strong>Right-click</strong> on selected text to generate AI suggestions</p>
            <p>3. <strong>View inline diffs</strong> showing original (red) and suggested (green) changes</p>
            <p>4. <strong>Accept or reject</strong> changes using the inline buttons</p>
            <p>5. <strong>Toggle diff visibility</strong> using the controls in the top-right</p>
          </div>
        </Card>

        {/* Demo Controls */}
        <div className="mb-4 flex gap-4">
          <Button 
            onClick={addSampleChanges}
            className="bg-primary hover:bg-primary/90"
          >
            Add Sample Changes
          </Button>
          <Button 
            onClick={() => setPromptContent('')}
            variant="outline"
            className="border-border hover:bg-accent"
          >
            Clear Editor
          </Button>
          <Button 
            onClick={() => setPromptContent(`You are a helpful AI assistant. Please provide clear and concise responses to user questions.

When answering questions:
1. Be accurate and factual
2. Provide examples when helpful
3. Keep responses focused
4. Use a friendly tone

Remember to always verify information before sharing it with users.`)}
            variant="outline"
            className="border-border hover:bg-accent"
          >
            Reset to Default
          </Button>
        </div>

        {/* AI Monaco Editor */}
        <Card className="p-0 bg-card border-border overflow-hidden">
          <div className="h-96">
            <AIMonacoEditor
              value={promptContent}
              onChange={setPromptContent}
              language="markdown"
              onGenerateCustomSuggestion={generateAISuggestion}
              className="rounded-lg"
            />
          </div>
        </Card>

        {/* Features */}
        <Card className="mt-6 p-6 bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Visual Diff System</h3>
              <ul className="space-y-1 text-sm">
                <li>• Red highlighting for original text</li>
                <li>• Green view zones for suggested changes</li>
                <li>• Git-style diff visualization</li>
                <li>• Inline accept/reject buttons</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">AI Integration</h3>
              <ul className="space-y-1 text-sm">
                <li>• Context-aware suggestions</li>
                <li>• Right-click activation</li>
                <li>• Confidence scoring</li>
                <li>• Reasoning display</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Editor Features</h3>
              <ul className="space-y-1 text-sm">
                <li>• Monaco editor integration</li>
                <li>• Syntax highlighting</li>
                <li>• Dark theme optimized</li>
                <li>• Responsive design</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Change Management</h3>
              <ul className="space-y-1 text-sm">
                <li>• Batch accept/reject</li>
                <li>• Toggle diff visibility</li>
                <li>• Non-destructive preview</li>
                <li>• Undo/redo support</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 