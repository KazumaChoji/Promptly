"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  XMarkIcon as X, 
  SparklesIcon as Sparkles, 
  ChatBubbleLeftRightIcon as MessageSquare, 
  PaperAirplaneIcon as Send, 
  ArrowPathIcon as Loader2,
  ChevronRightIcon as ChevronRight,
  ChevronLeftIcon as ChevronLeft,
  CommandLineIcon as Bot,
  UserIcon as User,
  DocumentIcon as FileText,
  PencilIcon as Edit,
  CheckIcon as Check,
  DocumentDuplicateIcon as Copy,
  CodeBracketIcon as GitBranch,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  ExclamationTriangleIcon as AlertTriangle,
  Cog6ToothIcon as Settings,
  BeakerIcon as TestTube,
  ChartBarIcon as BarChart3,
  PencilIcon as Edit3,
  ArrowPathIcon as RotateCcw
} from '@heroicons/react/24/outline';
import { AIAction, AIPromptEditorResponse } from '../../lib/ai-prompt-editor-service';
import { LLMService, AVAILABLE_MODELS } from '../../lib/llm-service';
import { agentPService, type AgentPRequest } from '../../lib/agent-p-service';
import { agentPRouter, type AgentPRouterResponse } from '../../lib/agent-p-router';
import { AGENT_P_MODES, type AgentPMode } from '../../lib/agent-p-prompts';
import { UserSettingsService, type FlatUserSettings } from '../../lib/user-settings';
import { DelimiterParser, type ParsedResponse, type EditInstruction } from '../../lib/delimiter-parser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  suggestions?: string[];
  reasoning?: string;
}

interface AIChatChange {
  id: string;
  timestamp: Date;
  originalText: string;
  newText: string;
  action: string;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied: boolean;
  messageId: string;
}

interface AISidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  
  // Active file content
  activeFileContent: string;
  onUpdateFileContent: (content: string) => void;
  
  // Monaco editor reference for direct edits
  monacoEditorRef?: any;
  
  // Diff editor reference for triggering diff mode
  diffEditorRef?: any;
  
  // NLP functionality
  onNLPSubmit: (instruction: string) => void;
  isGeneratingNLP: boolean;
  
  // Suggestions box data
  suggestionsData: AIPromptEditorResponse | null;
  onApplyAction: (action: AIAction) => void;
  onApplySuggestion: (suggestion: string) => void;
  onCloseSuggestions: () => void;
}

export function AISidebar({
  isOpen,
  onToggle,
  onClose,
  activeFileContent,
  onUpdateFileContent,
  monacoEditorRef,
  diffEditorRef,
  onNLPSubmit,
  isGeneratingNLP,
  suggestionsData,
  onApplyAction,
  onApplySuggestion,
  onCloseSuggestions
}: AISidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [fileEditContent, setFileEditContent] = useState(activeFileContent);
  const [aiChanges, setAiChanges] = useState<AIChatChange[]>([]);
  const [showDiffs, setShowDiffs] = useState(true);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userSettings, setUserSettings] = useState<FlatUserSettings | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agent P specific placeholders
  const placeholders = [
    "I need a system prompt for a customer support AI agent...",
    "Create a system prompt for a data analysis AI...",
    "Design a system prompt for a content creation AI...",
    "I need a system prompt for a technical support agent...",
    "Create a system prompt for a sales assistant AI...",
    "Design a system prompt for a project management AI...",
    "I need a system prompt for a code review assistant...",
    "Create a system prompt for a documentation writer...",
    "Design a system prompt for a research assistant...",
    "I need a system prompt for a quality assurance AI...",
    "Edit this system prompt to be more specific...",
    "Optimize this prompt for better performance...",
    "Evaluate the quality of this system prompt...",
    "Test this prompt with different scenarios...",
    "Improve this prompt's clarity and structure..."
  ];

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * placeholders.length);
      setCurrentPlaceholder(placeholders[randomIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await UserSettingsService.getUserSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to load user settings in AI Sidebar:', error);
      }
    };

    loadUserSettings();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper function to trigger diff mode when content changes
  const triggerDiffMode = useCallback((newContent: string, originalContent: string, actionType: string) => {
    if (diffEditorRef?.current && newContent !== originalContent) {
      diffEditorRef.current.handleAIContentChange(newContent, originalContent, actionType);
    }
  }, [diffEditorRef]);

  const handleSubmit = useCallback(async () => {
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
      // First, route the request to determine the appropriate mode
      const routerResponse = await agentPRouter.routeRequest({
        userMessage: inputValue.trim(),
        context: activeFileContent ? "User has existing prompt content" : "User starting fresh",
        userSettings: userSettings || undefined
      });

      // Use Agent P service with the determined mode
      const request: AgentPRequest = {
        mode: routerResponse.mode,
        userMessage: inputValue.trim(),
        context: "System prompt generation for AI agent development",
        existingPrompt: routerResponse.mode !== 'new-generation' ? activeFileContent : undefined,
        userSettings: userSettings || undefined
      };

      // Debug log to see what's being passed
      console.log('Agent P Request:', {
        mode: routerResponse.mode,
        userMessage: inputValue.trim(),
        existingPrompt: activeFileContent ? activeFileContent.substring(0, 100) + '...' : 'undefined',
        activeFileContentLength: activeFileContent?.length || 0
      });

      const response = await agentPService.generateResponse(request);
      
      // Store original content before changes
      const originalContent = activeFileContent;
      
      // Use the delimiter parser to extract content
      const parsedResponse = DelimiterParser.parseResponseWithIncompleteDelimiters(
        response.content,
        activeFileContent
      );
      
      // Set conversational content for sidebar
      let conversationalContent = parsedResponse.sidebarContent || 'Processing complete.';
      
      // If no conversational content, provide a default message
      if (!conversationalContent || conversationalContent.length < 10) {
        conversationalContent = parsedResponse.editorContentType === 'edit' 
          ? 'Applied edits to your content. Review changes in the text editor.'
          : 'Generated content updated in the text editor.';
      }
      
      // Apply editor content if available
      if (parsedResponse.editorContent && monacoEditorRef?.current) {
        monacoEditorRef.current.setValue(parsedResponse.editorContent);
        const newContent = monacoEditorRef.current.getValue();
        onUpdateFileContent(newContent);
        // Trigger diff mode to show changes
        triggerDiffMode(newContent, originalContent, `Agent P (${parsedResponse.editorContentType})`);
        
        // Add edit instruction feedback if available
        if (parsedResponse.editInstructions && parsedResponse.editInstructions.length > 0) {
          const successfulEdits = parsedResponse.editInstructions.filter(e => e.applied).length;
          const totalEdits = parsedResponse.editInstructions.length;
          conversationalContent += ` Applied ${successfulEdits}/${totalEdits} edits successfully.`;
          
          // Log failed edits for debugging
          const failedEdits = parsedResponse.editInstructions.filter(e => !e.applied);
          if (failedEdits.length > 0) {
            console.warn('Failed edit instructions:', failedEdits);
            conversationalContent += ` Some edits could not be applied - check console for details.`;
          }
        }
      } else if (parsedResponse.editorContent) {
        // Fallback for when no Monaco editor ref is available
        onUpdateFileContent(parsedResponse.editorContent);
        triggerDiffMode(parsedResponse.editorContent, originalContent, `Agent P (${parsedResponse.editorContentType})`);
      } else if (monacoEditorRef?.current) {
        // Fallback: use entire response if no parsed content found
        monacoEditorRef.current.setValue(response.content);
        const newContent = monacoEditorRef.current.getValue();
        onUpdateFileContent(newContent);
        triggerDiffMode(newContent, originalContent, 'Agent P (fallback)');
        conversationalContent = 'No structured content found. Used entire response.';
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
  }, [inputValue, isGenerating, activeFileContent, onUpdateFileContent]);

  // Handle suggestions data updates
  useEffect(() => {
    if (suggestionsData && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'user') {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: suggestionsData.reasoning || 'I\'ve analyzed your request and generated some suggestions.',
          timestamp: new Date(),
          actions: suggestionsData.actions,
          suggestions: suggestionsData.suggestions,
          reasoning: suggestionsData.reasoning
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Create AI changes for tracking
        if (suggestionsData.actions) {
          const newChanges: AIChatChange[] = suggestionsData.actions.map(action => ({
            id: crypto.randomUUID(),
            timestamp: new Date(),
            originalText: action.originalText,
            newText: action.newText,
            action: action.description,
            confidence: action.confidence,
            reasoning: action.reasoning,
            status: 'pending',
            applied: false,
            messageId: assistantMessage.id
          }));
          setAiChanges(prev => [...prev, ...newChanges]);
        }
      }
    }
  }, [suggestionsData]);

  const handleSaveFile = () => {
    onUpdateFileContent(fileEditContent);
    setShowFileEditor(false);
  };

  const handleApplyChange = (changeId: string, status: 'accepted' | 'rejected') => {
    setAiChanges(prev => prev.map(change => 
      change.id === changeId 
        ? { ...change, status, applied: status === 'accepted' }
        : change
    ));
  };

  const handleRevertChange = (changeId: string) => {
    const change = aiChanges.find(c => c.id === changeId);
    if (change && change.applied) {
      // Revert the change in the file content
      const newContent = activeFileContent.replace(change.newText, change.originalText);
      onUpdateFileContent(newContent);
      
      setAiChanges(prev => prev.map(c => 
        c.id === changeId 
          ? { ...c, applied: false, status: 'rejected' }
          : c
      ));
    }
  };

  const getActionTypeColor = (type: AIAction['type']) => {
    switch (type) {
      case 'replace': return 'bg-blue-100 text-blue-800';
      case 'insert': return 'bg-green-100 text-green-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'enhance': return 'bg-purple-100 text-purple-800';
      case 'rewrite': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChangeStatusColor = (status: AIChatChange['status']) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/30';
      case 'accepted': return 'text-success bg-success/30';
      case 'rejected': return 'text-destructive bg-destructive/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getModeIcon = (mode: AgentPMode) => {
    switch (mode) {
      case 'new-generation':
        return <Sparkles className="w-4 h-4" />;
      case 'edit':
        return <Edit3 className="w-4 h-4" />;
      case 'optimize':
        return <Settings className="w-4 h-4" />;
      case 'evaluate':
        return <BarChart3 className="w-4 h-4" />;
      case 'test':
        return <TestTube className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getModeDescription = (mode: AgentPMode) => {
    return agentPRouter.getModeDescription(mode);
  };

  const pendingChanges = aiChanges.filter(c => c.status === 'pending');
  const acceptedChanges = aiChanges.filter(c => c.status === 'accepted' && c.applied);

  return (
    <>
      {/* Sidebar Toggle Button - Removed */}

             {/* Sidebar */}
       <div className={`fixed right-0 top-0 h-screen bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-40 ${
         isOpen ? 'translate-x-0' : 'translate-x-full'
       }`} style={{ width: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: isOpen ? 'auto' : 'none' }}>
        
                 {/* Floating Close Button */}
         <Button
           variant="ghost"
           size="sm"
           onClick={onClose}
           className="absolute top-4 right-4 z-50 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted bg-background border border-border"
         >
          <X className="w-4 h-4" />
        </Button>

        {/* Content */}
        <div className="flex flex-col h-full">
          {/* File Editor Panel */}
          {showFileEditor && (
            <div className="border-b border-border bg-muted p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">Active File</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveFile}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileEditor(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <textarea
                value={fileEditContent}
                onChange={(e) => setFileEditContent(e.target.value)}
                className="w-full h-32 p-2 text-sm border border-border rounded-md resize-none bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Edit your prompt file here..."
              />
            </div>
          )}

          {/* Change Tracker Panel */}
          {aiChanges.length > 0 && (
            <div className="border-b border-border bg-muted p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">AI Changes</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiffs(!showDiffs)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showDiffs ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {pendingChanges.length} pending, {acceptedChanges.length} applied
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {aiChanges.map((change) => (
                  <div key={change.id} className="border border-border rounded p-2 bg-background">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-1 rounded ${getChangeStatusColor(change.status)}`}>
                        {change.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(change.confidence * 100)}%
                      </span>
                    </div>
                    
                    {showDiffs && (
                      <div className="space-y-1 text-xs mb-2">
                        <div className="bg-destructive/20 p-1 rounded">
                          <span className="text-destructive">- </span>
                          <span className="text-muted-foreground">{change.originalText}</span>
                        </div>
                        <div className="bg-primary/20 p-1 rounded">
                          <span className="text-primary">+ </span>
                          <span className="text-foreground">{change.newText}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      {change.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApplyChange(change.id, 'accepted')}
                            className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyChange(change.id, 'rejected')}
                            className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {change.applied && (
                        <Button
                          size="sm"
                          onClick={() => handleRevertChange(change.id)}
                          className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent P Header */}
          <div className="border-b border-border p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-medium">Agent P</h3>
                  <p className="text-xs text-muted-foreground">Create, edit, and improve your system prompts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Agent P - Elite Prompt Design Engineer</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Create powerful, structured system prompts for AI agents
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  I'll automatically determine the best approach for your request
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.type === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                    



                     {/* NOTE: Removed system prompt display - it now goes directly to editor */}
                     
                     {/* Show actions */}
                     {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                          <div key={index} className="border border-border rounded p-2 bg-background">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs px-2 py-1 rounded ${getActionTypeColor(action.type)}`}>
                                {action.type}
                              </span>
                              <span className={`text-xs ${getConfidenceColor(action.confidence)}`}>
                                {Math.round(action.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{action.description}</p>
                            <Button
                              size="sm"
                              onClick={() => onApplyAction(action)}
                              className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Apply
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Quick Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => onApplySuggestion(suggestion)}
                            className="w-full text-left p-2 bg-background hover:bg-muted rounded border border-border transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentPlaceholder}
              className="w-full p-2 pr-12 text-sm border-2 border-border rounded-md resize-none bg-background text-primary placeholder:text-muted-foreground/60 placeholder:italic focus:border-primary focus:ring-1 focus:ring-primary shadow-md outline-none"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0 shadow-md"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}