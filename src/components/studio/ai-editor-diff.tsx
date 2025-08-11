"use client";

import React from 'react';
import { Button } from '../ui/button';
import { 
  CheckIcon as Check, 
  XMarkIcon as X,
  CodeBracketIcon as GitBranch
} from '@heroicons/react/24/outline';

interface AIEditorDiffProps {
  originalText: string;
  newText: string;
  changeId: string;
  onAccept: () => void;
  onReject: () => void;
  confidence: number;
  action: string;
}

export function AIEditorDiff({
  originalText,
  newText,
  changeId,
  onAccept,
  onReject,
  confidence,
  action
}: AIEditorDiffProps) {
  const lines = originalText.split('\n');
  const newLines = newText.split('\n');

  return (
    <div className="my-4 p-3 bg-card border border-border rounded-lg">
      {/* Diff Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border bg-background p-3 -m-3 mb-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-foreground">{action}</span>
          <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            onClick={onReject}
            className="bg-red-600 hover:bg-red-700 text-white h-6 px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Reject
          </Button>
        </div>
      </div>

      {/* Inline Diff Lines */}
      <div className="font-mono text-sm space-y-1">
        {lines.map((line, index) => {
          const newLine = newLines[index];
          if (line !== newLine) {
            return (
              <div key={index} className="space-y-1">
                {/* Original line (red) */}
                <div className="bg-red-900/30 text-red-300 px-3 py-2 rounded border-l-4 border-red-500">
                  <span className="text-red-400 font-bold">- </span>{line}
                </div>
                {/* New line (green) */}
                {newLine && (
                  <div className="bg-green-900/30 text-green-300 px-3 py-2 rounded border-l-4 border-green-500">
                    <span className="text-green-400 font-bold">+ </span>{newLine}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={index} className="text-muted-foreground px-3 py-1">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
} 