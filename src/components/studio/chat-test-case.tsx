"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  PlusIcon as Plus, 
  TrashIcon as Trash2, 
  ArrowUpTrayIcon as Upload,
  ArrowDownTrayIcon as Save,
  XMarkIcon as X,
  ChatBubbleLeftRightIcon as MessageSquare,
  UserIcon as User,
  CpuChipIcon as Bot,
  PhotoIcon as ImageIcon,
  DocumentDuplicateIcon as Copy,
  ArrowDownTrayIcon as Download
} from "@heroicons/react/24/outline";

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  images?: Array<{
    data: string; // base64 data URL
    name: string; // filename
  }>;
}

export interface ChatTestCase {
  id: string;
  name: string;
  messages: ChatMessage[];
  expectedOutput?: string;
  status?: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;

}

interface ChatTestCaseEditorProps {
  testCase: ChatTestCase;
  isOpen: boolean;
  onClose: () => void;
  onSave: (testCase: ChatTestCase) => void;
}

export function ChatTestCaseEditor({ testCase, isOpen, onClose, onSave }: ChatTestCaseEditorProps) {
  const [editingTestCase, setEditingTestCase] = useState<ChatTestCase>(testCase);
  const [showPreview, setShowPreview] = useState(false);

  const addMessage = () => {
    // Determine the next role based on the last message
    const lastMessage = editingTestCase.messages[editingTestCase.messages.length - 1];
    const nextRole: 'assistant' | 'user' = lastMessage?.role === 'user' ? 'assistant' : 'user';

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: nextRole,
      content: '',
      images: nextRole === 'user' ? [] : undefined
    };

    setEditingTestCase({
      ...editingTestCase,
      messages: [...editingTestCase.messages, newMessage]
    });
  };

  const removeMessage = (messageIndex: number) => {
    if (editingTestCase.messages.length === 1) return;

    setEditingTestCase({
      ...editingTestCase,
      messages: editingTestCase.messages.filter((_, index) => index !== messageIndex)
    });
  };

  const updateMessage = (messageIndex: number, updates: Partial<ChatMessage>) => {
    const updatedMessages = editingTestCase.messages.map((message, index) => 
      index === messageIndex ? { ...message, ...updates } : message
    );

    setEditingTestCase({
      ...editingTestCase,
      messages: updatedMessages
    });
  };

  const handleImageUpload = (messageIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const message = editingTestCase.messages[messageIndex];
      const updatedImages = [...(message.images || []), { data: result, name: file.name }];
      
      updateMessage(messageIndex, { images: updatedImages });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (messageIndex: number, imageIndex: number) => {
    const message = editingTestCase.messages[messageIndex];
    const updatedImages = (message.images || []).filter((_, index) => index !== imageIndex);
    
    updateMessage(messageIndex, { images: updatedImages });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30';
      case 'assistant':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const handleSave = () => {
    onSave(editingTestCase);
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(editingTestCase.messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editingTestCase.name.replace(/\s+/g, '_')}_conversation.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsChatML = () => {
    const chatML = editingTestCase.messages
      .map(msg => `<${msg.role}>\n${msg.content}\n</${msg.role}>`)
      .join('\n\n');
    
    const dataBlob = new Blob([chatML], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editingTestCase.name.replace(/\s+/g, '_')}_conversation.chatml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPreviewContent = () => {
    return editingTestCase.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test Case - Dynamic Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editingTestCase.name}
                onChange={(e) => setEditingTestCase({ ...editingTestCase, name: e.target.value })}
                placeholder="Test case name..."
              />
            </div>
            

          </div>

          {/* Dynamic Conversation Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Conversation Messages</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
            </div>
            
            {/* Message Blocks */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editingTestCase.messages.map((message, messageIndex) => (
                <Card key={message.id} className={`border-2 ${getRoleColor(message.role)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getRoleColor(message.role)}>
                          {getRoleIcon(message.role)}
                          <span className="ml-1 capitalize">{message.role}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMessage(messageIndex)}
                          disabled={editingTestCase.messages.length === 1}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <Textarea
                      value={message.content}
                      onChange={(e) => updateMessage(messageIndex, { content: e.target.value })}
                      placeholder={`Enter ${message.role} message...`}
                      className="min-h-[120px] resize-none"
                    />
                    
                    {/* Image support for user messages */}
                    {message.role === 'user' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Images</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageUpload(messageIndex, file);
                              };
                              input.click();
                            }}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Add Image
                          </Button>
                        </div>
                        
                        {message.images && message.images.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.images.map((img, imgIndex) => (
                              <div key={imgIndex} className="relative bg-muted p-2 rounded border">
                                <span className="text-xs">{img.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeImage(messageIndex, imgIndex)}
                                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add Message Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={addMessage}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Next Message
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Preview</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsJSON}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsChatML}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export ChatML
                  </Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-4">
                  <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                    {getPreviewContent()}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expected Output */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Expected Output (Optional)</label>
            <Textarea
              value={editingTestCase.expectedOutput || ''}
              onChange={(e) => setEditingTestCase({ ...editingTestCase, expectedOutput: e.target.value })}
              placeholder="Enter the expected output for comparison..."
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Test Case
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 