"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  CheckIcon as Check, 
  XMarkIcon as X, 
  ArrowPathIcon as RotateCcw, 
  CodeBracketIcon as GitBranch,
  ExclamationTriangleIcon as AlertCircle,
  InformationCircleIcon as Info,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff
} from '@heroicons/react/24/outline';

interface AIChange {
  id: string;
  timestamp: Date;
  originalText: string;
  newText: string;
  action: string;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied: boolean;
  startPosition?: number;
  endPosition?: number;
}

interface AIChangeTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  changes: AIChange[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
  onRevertChange: (changeId: string) => void;
  onApplyAll: () => void;
  onRevertAll: () => void;
  onToggleDiff: (changeId: string) => void;
  onHighlightChange: (changeId: string) => void;
}

export function AIChangeTracker({
  isOpen,
  onClose,
  changes,
  onAcceptChange,
  onRejectChange,
  onRevertChange,
  onApplyAll,
  onRevertAll,
  onToggleDiff,
  onHighlightChange
}: AIChangeTrackerProps) {
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState<{ [key: string]: boolean }>({});

  const pendingChanges = changes.filter(c => c.status === 'pending');
  const acceptedChanges = changes.filter(c => c.status === 'accepted');
  const rejectedChanges = changes.filter(c => c.status === 'rejected');

  const toggleReasoning = (changeId: string) => {
    setShowReasoning(prev => ({
      ...prev,
      [changeId]: !prev[changeId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Check className="w-4 h-4 text-green-400" />;
      case 'rejected': return <X className="w-4 h-4 text-red-400" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      {/* Compact Change Tracker Panel */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-lg transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-white">AI Changes</h3>
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {changes.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {changes.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <GitBranch className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p>No AI changes yet</p>
              <p className="text-xs">Changes will appear here when you apply quick actions</p>
            </div>
          ) : (
            changes.map((change) => (
              <Card key={change.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(change.status)}
                      <span className={`text-sm font-medium ${getStatusColor(change.status)}`}>
                        {change.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">
                        {change.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                        {Math.round(change.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {change.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onAcceptChange(change.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onRejectChange(change.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {/* Revert Button for Applied Changes */}
                    {change.status === 'accepted' && change.applied && (
                      <Button
                        size="sm"
                        onClick={() => onRevertChange(change.id)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Revert Change
                      </Button>
                    )}
                  </div>

                  {/* Inline Diff Toggle */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleDiff(change.id)}
                      className="flex-1 text-xs border-gray-600 text-gray-300 hover:text-white"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Show Inline Diff
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onHighlightChange(change.id)}
                      className="flex-1 text-xs border-gray-600 text-gray-300 hover:text-white"
                    >
                      <GitBranch className="w-3 h-3 mr-1" />
                      Highlight
                    </Button>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <button
                      onClick={() => toggleReasoning(change.id)}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300"
                    >
                      <Info className="w-3 h-3" />
                      {showReasoning[change.id] ? 'Hide reasoning' : 'Show reasoning'}
                    </button>
                    {showReasoning[change.id] && (
                      <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700 rounded text-xs text-blue-300">
                        {change.reasoning}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
    </>
  );
} 