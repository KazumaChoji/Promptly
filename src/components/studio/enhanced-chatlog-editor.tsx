"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatTestCase, ChatMessage, TestCaseTemplate } from '../../types/inference';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  XMarkIcon as X, 
  DocumentArrowDownIcon as Save, 
  PlusIcon as Plus, 
  UserIcon as User, 
  CommandLineIcon as Bot, 
  TrashIcon as Trash2, 
  ArrowPathIcon as RotateCw,
  DocumentDuplicateIcon as Copy,
  ArrowDownTrayIcon as Download,
  ArrowUpTrayIcon as Upload,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  ChatBubbleLeftRightIcon as MessageSquare,
  SparklesIcon as Sparkles,
  PlayIcon as Play,
  PencilIcon as Edit
} from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
  onUpdate: (messageId: string, updates: Partial<ChatMessage>) => void;
  onDelete: (messageId: string) => void;
  onSwapRole: (messageId: string) => void;
  isLast: boolean;
}

const MessageBubble = ({ message, index, onUpdate, onDelete, onSwapRole, isLast }: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content]);

  const handleSave = () => {
    onUpdate(message.id, { content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(message.content);
    setIsEditing(false);
  };

  const isUser = message.role === 'user';
  const bubbleClasses = isUser 
    ? 'bg-primary text-primary-foreground ml-12' 
    : 'bg-muted mr-12';

  return (
    <div className={`flex items-start gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Role Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <Badge 
            variant={isUser ? "default" : "secondary"} 
            className="text-xs cursor-pointer hover:opacity-80"
            onClick={() => onSwapRole(message.id)}
          >
            <RotateCw className="w-3 h-3 mr-1" />
            {message.role === 'user' ? 'User' : 'Assistant'}
          </Badge>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>

        {/* Message Content */}
        <div className={`rounded-lg p-3 ${bubbleClasses} relative group/bubble`}>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] border-none bg-transparent resize-none focus:ring-0 p-0"
                placeholder={`Enter ${message.role} message...`}
              />
              <div className="flex gap-2 justify-end">
                <Button onClick={handleCancel} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm">
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="whitespace-pre-wrap text-sm">
                {message.content || (
                  <span className="text-muted-foreground italic">
                    Click to add {message.role} message...
                  </span>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className={`absolute top-1 ${isUser ? 'left-1' : 'right-1'} opacity-0 group-hover/bubble:opacity-100 transition-opacity`}>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-background/20"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  {!isLast && (
                    <Button
                      onClick={() => onDelete(message.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/20 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Metadata */}
        {message.timestamp && (
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

interface MessageComposerProps {
  onAdd: (role: 'user' | 'assistant') => void;
  suggestedRole: 'user' | 'assistant';
}

const MessageComposer = ({ onAdd, suggestedRole }: MessageComposerProps) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        onClick={() => onAdd(suggestedRole)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add {suggestedRole === 'user' ? 'User' : 'Assistant'} Message
      </Button>
      <Button
        onClick={() => onAdd(suggestedRole === 'user' ? 'assistant' : 'user')}
        variant="ghost"
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add {suggestedRole === 'user' ? 'Assistant' : 'User'} Message
      </Button>
    </div>
  );
};

interface EnhancedChatlogEditorProps {
  testCase: ChatTestCase;
  isOpen: boolean;
  onClose: () => void;
  onSave: (testCase: ChatTestCase) => void;
  onRun?: (testCase: ChatTestCase) => void;
  templates?: TestCaseTemplate[];
}

export function EnhancedChatlogEditor({ 
  testCase, 
  isOpen, 
  onClose, 
  onSave, 
  onRun,
  templates = []
}: EnhancedChatlogEditorProps) {
  const [editingTestCase, setEditingTestCase] = useState<ChatTestCase>(testCase);
  const [showPreview, setShowPreview] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Track if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(editingTestCase) !== JSON.stringify(testCase);
  
  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  // Handle entrance animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimatingIn(true);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) {
          const confirmed = window.confirm(
            'You have unsaved changes. Are you sure you want to close without saving?'
          );
          if (!confirmed) return;
        }
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave(editingTestCase);
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, onSave, editingTestCase, hasUnsavedChanges]);

  useEffect(() => {
    setEditingTestCase(testCase);
  }, [testCase]);

  const updateMessage = (messageId: string, updates: Partial<ChatMessage>) => {
    const updatedMessages = editingTestCase.messages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    setEditingTestCase({ ...editingTestCase, messages: updatedMessages });
  };

  const deleteMessage = (messageId: string) => {
    if (editingTestCase.messages.length <= 1) return;
    const updatedMessages = editingTestCase.messages.filter(msg => msg.id !== messageId);
    setEditingTestCase({ ...editingTestCase, messages: updatedMessages });
  };

  const swapRole = (messageId: string) => {
    updateMessage(messageId, { 
      role: editingTestCase.messages.find(m => m.id === messageId)?.role === 'user' ? 'assistant' : 'user' 
    });
  };

  const addMessage = (role: 'user' | 'assistant') => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content: '',
      timestamp: new Date(),
    };
    setEditingTestCase({
      ...editingTestCase,
      messages: [...editingTestCase.messages, newMessage]
    });

    // Scroll to bottom after adding message
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  const getSuggestedNextRole = (): 'user' | 'assistant' => {
    const lastMessage = editingTestCase.messages[editingTestCase.messages.length - 1];
    return lastMessage?.role === 'user' ? 'assistant' : 'user';
  };

  const applyTemplate = (template: TestCaseTemplate) => {
    const messages: ChatMessage[] = template.messages.map((msg, index) => ({
      id: `msg_${Date.now()}_${index}`,
      ...msg,
      timestamp: new Date(),
    }));

    setEditingTestCase({
      ...editingTestCase,
      name: template.name,
      messages,
    });
  };

  const exportConversation = () => {
    const data = {
      name: editingTestCase.name,
      messages: editingTestCase.messages,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingTestCase.name.replace(/\s+/g, '_')}_conversation.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPreviewText = () => {
    return editingTestCase.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking the backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className={`bg-background rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col border border-border opacity-100 transform transition-all duration-200 ${
        isAnimatingIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Chatlog editor</h2>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Design multi-turn conversations with visual chat bubbles {hasUnsavedChanges && '• Ctrl+S to save'}
              </p>
            </div>
          </div>
          <Button onClick={handleClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Name:</label>
              <Input
                value={editingTestCase.name}
                onChange={(e) => setEditingTestCase({ ...editingTestCase, name: e.target.value })}
                className="w-64"
                placeholder="Test case name..."
              />
            </div>

            {templates.length > 0 && (
              <Select onValueChange={(value) => {
                const template = templates.find(t => t.id === value);
                if (template) applyTemplate(template);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Apply template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button onClick={exportConversation} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Editor */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-border`}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Conversation Flow</h3>
                <Badge variant="secondary" className="text-xs">
                  {editingTestCase.messages.length} messages
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-6">
                {editingTestCase.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                    onUpdate={updateMessage}
                    onDelete={deleteMessage}
                    onSwapRole={swapRole}
                    isLast={index === editingTestCase.messages.length - 1}
                  />
                ))}

                <MessageComposer
                  onAdd={addMessage}
                  suggestedRole={getSuggestedNextRole()}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-border">
                <h3 className="font-medium">Preview</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                  {getPreviewText()}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{editingTestCase.messages.length} messages</span>
            <span>•</span>
            <span>{editingTestCase.messages.filter(m => m.role === 'user').length} user</span>
            <span>•</span>
            <span>{editingTestCase.messages.filter(m => m.role === 'assistant').length} assistant</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleClose} variant="outline">
              Cancel
            </Button>
            {onRun && (
              <Button 
                onClick={() => onRun(editingTestCase)} 
                variant="outline"
                disabled={editingTestCase.status === 'running'}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </Button>
            )}
            <Button 
              onClick={() => {
                onSave(editingTestCase);
                onClose();
              }} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}