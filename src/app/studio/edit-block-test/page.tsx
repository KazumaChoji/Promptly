"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { SparklesIcon as Sparkles, PaperAirplaneIcon as Send, CommandLineIcon as Bot, UserIcon as User } from '@heroicons/react/24/outline';
import { agentPService, type AgentPRequest } from '../../../lib/agent-p-service';
import { processAIResponseWithEdits, extractEditBlock, fallbackInsert } from '../../../lib/editParser';
import * as monaco from 'monaco-editor';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EditBlockTestPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editorContent, setEditorContent] = useState(`You are a helpful AI assistant.

Your role is to help users with their questions and tasks.

Please be friendly and informative in your responses.`);
  
  const editorRef = useRef<any>(null);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);

    try {
      const request: AgentPRequest = {
        mode: 'edit',
        userMessage: inputValue.trim(),
        context: "Testing edit block functionality",
        existingPrompt: editorContent
      };

      const response = await agentPService.generateResponse(request);
      
      let conversationalContent = response.content;
      let hasAppliedEdits = false;
      
      if (editorRef.current) {
        // Process edit blocks with Monaco editor
        const result = processAIResponseWithEdits(editorRef.current, response.content);
        conversationalContent = result.conversationalContent;
        hasAppliedEdits = result.hasEdits;
        
        // If no edits were applied, use fallback insert
        if (!hasAppliedEdits) {
          fallbackInsert(editorRef.current, response.content);
          conversationalContent = `I've added the generated content to your editor.`;
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: conversationalContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Initialize Monaco editor
    const initEditor = async () => {
      if (typeof window !== 'undefined' && !editorRef.current) {
        const monaco = await import('monaco-editor');
        
        const editor = monaco.editor.create(document.getElementById('monaco-editor')!, {
          value: editorContent,
          language: 'markdown',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
        });

        editorRef.current = editor;

        // Update editor content when state changes
        editor.onDidChangeModelContent(() => {
          const value = editor.getValue();
          setEditorContent(value);
        });
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  const testEditBlock = () => {
    if (!editorRef.current) return;
    
    const testResponse = `I'll improve your system prompt to be more specific and actionable.

\`\`\`edit
replace: "You are a helpful AI assistant."
with: "You are an expert AI assistant specializing in prompt engineering and system design."
\`\`\`

This makes the role more specific and professional.`;

    const result = processAIResponseWithEdits(editorRef.current, testResponse);
    console.log('Edit block test result:', result);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Edit Block Test</h1>
        <Badge variant="secondary">Agent P Integration</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monaco Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Monaco Editor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md h-64">
              <div
                id="monaco-editor"
                className="h-full"
                style={{ minHeight: '250px' }}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={testEditBlock} variant="outline" size="sm">
                Test Edit Block
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Agent P Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-64 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Start a conversation with Agent P</p>
                    <p className="text-xs mt-1">Try: "Make this prompt more professional"</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-lg p-3`}>
                        <div className="flex items-center gap-2 mb-1">
                          {message.type === 'user' ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-primary" />
                          )}
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Agent P to edit your prompt..."
                  className="flex-1"
                  rows={2}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isGenerating}
                  className="self-end"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1.</strong> The Monaco editor on the left shows your current system prompt</p>
            <p><strong>2.</strong> Use the chat interface to ask Agent P to edit your prompt</p>
            <p><strong>3.</strong> Agent P will respond with either:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>```edit</code> blocks that directly modify the editor</li>
              <li>Fallback insertion if no edit blocks are found</li>
            </ul>
            <p><strong>4.</strong> Try these example requests:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>"Make this prompt more professional"</li>
              <li>"Add error handling instructions"</li>
              <li>"Improve the tone to be more friendly"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 