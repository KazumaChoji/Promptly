"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { 
  CheckIcon as Check, 
  XMarkIcon as X, 
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  CodeBracketIcon as GitBranch
} from '@heroicons/react/24/outline';

interface AIInlineDiffProps {
  isVisible: boolean;
  originalText: string;
  newText: string;
  changeId: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  confidence: number;
  action: string;
}

export function AIInlineDiff({
  isVisible,
  originalText,
  newText,
  changeId,
  onAccept,
  onReject,
  onClose,
  confidence,
  action
}: AIInlineDiffProps) {
  const [showDiff, setShowDiff] = useState(false);

  if (!isVisible) return null;

  const formatInlineDiff = () => {
    const lines = originalText.split('\n');
    const newLines = newText.split('\n');
    
    return (
      <div className="font-mono text-sm space-y-1">
        {lines.map((line, index) => {
          const newLine = newLines[index];
          if (line !== newLine) {
            return (
              <div key={index} className="space-y-1">
                <div className="bg-red-900/30 text-red-300 px-3 py-2 rounded border-l-4 border-red-500">
                  <span className="text-red-400 font-bold">- </span>{line}
                </div>
                {newLine && (
                  <div className="bg-green-900/30 text-green-300 px-3 py-2 rounded border-l-4 border-green-500">
                    <span className="text-green-400 font-bold">+ </span>{newLine}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={index} className="text-gray-400 px-3 py-1">
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">Inline Diff</h3>
              <p className="text-sm text-muted-foreground">{action}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              {Math.round(confidence * 100)}% confidence
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showDiff ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {showDiff ? (
            <div className="space-y-4">
              {/* Diff View */}
              <div className="bg-muted rounded border border-border p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Changes</h4>
                {formatInlineDiff()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={onAccept}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept Changes
                </Button>
                <Button
                  onClick={onReject}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Ready to review changes</p>
              <p className="text-sm">Click the eye icon to see the diff</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 