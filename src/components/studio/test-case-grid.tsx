"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { 
  PlusIcon as Plus, 
  PencilIcon as Edit, 
  TrashIcon as Trash2, 
  DocumentDuplicateIcon as Copy, 
  PlayIcon as Play,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ClockIcon as Clock,
  ChatBubbleLeftRightIcon as MessageSquare,
  PhotoIcon as ImageIcon,
  UserIcon as User,
  CpuChipIcon as Bot,
  ArrowDownTrayIcon as Save,
  XMarkIcon as X
} from "@heroicons/react/24/outline";
import { ChatTestCaseEditor, type ChatTestCase } from "./chat-test-case";

interface TestCaseGridProps {
  testCases: ChatTestCase[];
  onAddTestCase: () => void;
  onUpdateTestCase: (testCaseId: string, updates: Partial<ChatTestCase>) => void;
  onRemoveTestCase: (testCaseId: string) => void;
  onDuplicateTestCase: (testCaseId: string) => void;
  onRunTestCase: (testCaseId: string) => void;
  isRunning: boolean;
  systemPromptName: string;
}

export function TestCaseGrid({
  testCases,
  onAddTestCase,
  onUpdateTestCase,
  onRemoveTestCase,
  onDuplicateTestCase,
  onRunTestCase,
  isRunning,
  systemPromptName
}: TestCaseGridProps) {
  const [editingTestCaseId, setEditingTestCaseId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTestCase, setNewTestCase] = useState<Partial<ChatTestCase>>({
    name: '',
    messages: [
      { id: `msg_${Date.now()}_user`, role: 'user', content: '' }
    ]
  });

  const getStatusIcon = (status?: ChatTestCase['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: ChatTestCase['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-900 text-green-300 text-xs">Success</Badge>;
      case 'error':
        return <Badge className="bg-red-900 text-red-300 text-xs">Failed</Badge>;
      case 'running':
        return <Badge className="bg-yellow-900 text-yellow-300 text-xs">Running</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getTestCaseIcon = (testCase: ChatTestCase) => {
    const hasImages = testCase.messages?.some(msg => msg.images && msg.images.length > 0);
    return hasImages ? <ImageIcon className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const startEditing = (testCaseId: string) => {
    setEditingTestCaseId(testCaseId);
  };

  const stopEditing = () => {
    setEditingTestCaseId(null);
  };

  const handleAddTestCase = () => {
    if (newTestCase.name?.trim()) {
      onAddTestCase();
      setNewTestCase({
        name: '',
        messages: [
          { id: `msg_${Date.now()}_user`, role: 'user', content: '' }
        ]
      });
      setShowAddForm(false);
    }
  };

  const cancelAddTestCase = () => {
    setShowAddForm(false);
    setNewTestCase({
      name: '',
      messages: [
        { id: `msg_${Date.now()}_user`, role: 'user', content: '' }
      ]
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Test Cases ({testCases.length})</h3>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Test Case
        </Button>
      </div>

      {/* Add Test Case Form */}
      {showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Add New Test Case</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <Input
                value={newTestCase.name}
                onChange={(e) => setNewTestCase({ ...newTestCase, name: e.target.value })}
                placeholder="Test case name..."
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddTestCase} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Add Test Case
              </Button>
              <Button variant="outline" onClick={cancelAddTestCase}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Cases Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {testCases.map((testCase) => (
          <Card 
            key={testCase.id} 
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getTestCaseIcon(testCase)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{testCase.name}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(testCase.status)}
                  {getStatusBadge(testCase.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* System Prompt Name Badge */}
              <div className="mb-2">
                <span className="inline-block bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-blue-300 font-semibold">
                  System Prompt: {systemPromptName}
                </span>
              </div>
              {/* Quick preview of messages */}
              <div className="space-y-2">
                {testCase.messages?.slice(0, 2).map((message, index) => (
                  <div key={message.id} className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-1">
                      {message.role === 'user' && <User className="w-3 h-3 text-green-400" />}
                      {message.role === 'assistant' && <Bot className="w-3 h-3 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 capitalize">{message.role}</p>
                      <p className="text-sm text-gray-300 truncate">
                        {message.content || (message.images?.length ? `${message.images.length} image(s)` : 'Empty')}
                      </p>
                    </div>
                  </div>
                ))}
                {testCase.messages && testCase.messages.length > 2 && (
                  <p className="text-xs text-gray-500">+{testCase.messages.length - 2} more messages</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                <Button
                  size="sm"
                  onClick={() => startEditing(testCase.id)}
                  disabled={isRunning}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => onRunTestCase(testCase.id)}
                  disabled={isRunning || testCase.status === 'running'}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Run
                </Button>
                <Button
                  size="sm"
                  onClick={() => onDuplicateTestCase(testCase.id)}
                  disabled={isRunning}
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onRemoveTestCase(testCase.id)}
                  disabled={isRunning}
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {testCases.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No test cases yet</p>
          <p className="text-sm mb-4">Create your first test case to get started</p>
          <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      {editingTestCaseId && (
        <ChatTestCaseEditor
          testCase={testCases.find(tc => tc.id === editingTestCaseId)!}
          isOpen={true}
          onClose={stopEditing}
          onSave={(updatedTestCase) => {
            onUpdateTestCase(editingTestCaseId, updatedTestCase);
            stopEditing();
          }}
        />
      )}
    </div>
  );
} 