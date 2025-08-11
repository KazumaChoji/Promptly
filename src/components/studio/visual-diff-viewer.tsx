"use client";

import React, { useState, useMemo } from 'react';
import { VisualDiffChunk, VisualDiffResult } from '../../lib/ai-editor-types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { 
  CheckCircleIcon as CheckCircle, 
  XCircleIcon as XCircle, 
  ExclamationCircleIcon as AlertCircle, 
  EyeIcon as Eye, 
  EyeSlashIcon as EyeOff, 
  ArrowPathIcon as RotateCcw,
  InformationCircleIcon as Info,
  ArrowTrendingUpIcon as TrendingUp,
  ClockIcon as Clock
} from '@heroicons/react/24/outline';

interface VisualDiffViewerProps {
  diff: VisualDiffResult;
  onApplyChunk?: (chunkId: string) => void;
  onRejectChunk?: (chunkId: string) => void;
  onApplyAll?: () => void;
  onRejectAll?: () => void;
  showReasoning?: boolean;
  showConfidence?: boolean;
  className?: string;
}

export function VisualDiffViewer({
  diff,
  onApplyChunk,
  onRejectChunk,
  onApplyAll,
  onRejectAll,
  showReasoning = true,
  showConfidence = true,
  className = ""
}: VisualDiffViewerProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [showUnchanged, setShowUnchanged] = useState(false);

  const appliedChunks = useMemo(() => 
    diff.chunks.filter(chunk => chunk.applied), [diff.chunks]
  );

  const pendingChunks = useMemo(() => 
    diff.chunks.filter(chunk => !chunk.applied && chunk.type !== 'unchanged'), [diff.chunks]
  );

  const toggleChunkExpansion = (chunkId: string) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId);
    } else {
      newExpanded.add(chunkId);
    }
    setExpandedChunks(newExpanded);
  };

  const getChunkColor = (chunk: VisualDiffChunk) => {
    switch (chunk.type) {
      case 'addition':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'deletion':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'modification':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'unchanged':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getChunkIcon = (chunk: VisualDiffChunk) => {
    switch (chunk.type) {
      case 'addition':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'deletion':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'modification':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'unchanged':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Summary */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">AI-Generated Changes</span>
            </div>
            <Badge variant="outline" className="bg-white">
              {diff.totalChanges} changes
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="text-xs"
            >
              {showUnchanged ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showUnchanged ? 'Hide' : 'Show'} Unchanged
            </Button>
            
            {onApplyAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onApplyAll}
                className="text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Apply All
              </Button>
            )}
            
            {onRejectAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRejectAll}
                className="text-xs bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
            )}
          </div>
        </div>

        {/* Overall Confidence and Reasoning */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Overall Confidence:</span>
              <Badge className={getConfidenceColor(diff.overallConfidence)}>
                {(diff.overallConfidence * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Model:</span>
              <Badge variant="outline" className="text-xs">
                {diff.modelInfo.name} ({diff.modelInfo.provider})
              </Badge>
            </div>
          </div>
          
          {showReasoning && diff.reasoning && (
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Reasoning:</span>
              <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                {diff.reasoning}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Applied Changes */}
      {appliedChunks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Applied Changes ({appliedChunks.length})
          </h3>
          <div className="space-y-2">
            {appliedChunks.map((chunk) => (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                isExpanded={expandedChunks.has(chunk.id)}
                onToggleExpansion={() => toggleChunkExpansion(chunk.id)}
                showReasoning={showReasoning}
                showConfidence={showConfidence}
                isApplied={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Changes */}
      {pendingChunks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending Changes ({pendingChunks.length})
          </h3>
          <div className="space-y-2">
            {pendingChunks.map((chunk) => (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                isExpanded={expandedChunks.has(chunk.id)}
                onToggleExpansion={() => toggleChunkExpansion(chunk.id)}
                onApply={() => onApplyChunk?.(chunk.id)}
                onReject={() => onRejectChunk?.(chunk.id)}
                showReasoning={showReasoning}
                showConfidence={showConfidence}
                isApplied={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unchanged Sections */}
      {showUnchanged && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Unchanged Sections
          </h3>
          <div className="space-y-1">
            {diff.chunks
              .filter(chunk => chunk.type === 'unchanged')
              .map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600"
                >
                  {chunk.newText || chunk.originalText}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChunkCardProps {
  chunk: VisualDiffChunk;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onApply?: () => void;
  onReject?: () => void;
  showReasoning: boolean;
  showConfidence: boolean;
  isApplied: boolean;
}

function ChunkCard({
  chunk,
  isExpanded,
  onToggleExpansion,
  onApply,
  onReject,
  showReasoning,
  showConfidence,
  isApplied
}: ChunkCardProps) {
  const getChunkColor = (chunk: VisualDiffChunk) => {
    switch (chunk.type) {
      case 'addition':
        return 'bg-green-50 border-green-200';
      case 'deletion':
        return 'bg-red-50 border-red-200';
      case 'modification':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getChunkIcon = (chunk: VisualDiffChunk) => {
    switch (chunk.type) {
      case 'addition':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'deletion':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'modification':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className={`p-3 ${getChunkColor(chunk)} ${isApplied ? 'ring-2 ring-green-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1">
          {getChunkIcon(chunk)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium capitalize">
                {chunk.type}
              </span>
              {showConfidence && (
                <Badge className={`text-xs ${getConfidenceColor(chunk.confidence)}`}>
                  {(chunk.confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {isApplied && (
                <Badge className="text-xs bg-green-100 text-green-700">
                  Applied
                </Badge>
              )}
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              {chunk.type === 'deletion' && chunk.originalText && (
                <div className="p-2 bg-red-100 border border-red-300 rounded text-sm">
                  <span className="text-red-800 line-through">{chunk.originalText}</span>
                </div>
              )}
              
              {chunk.type === 'addition' && chunk.newText && (
                <div className="p-2 bg-green-100 border border-green-300 rounded text-sm">
                  <span className="text-green-800">+ {chunk.newText}</span>
                </div>
              )}
              
              {chunk.type === 'modification' && (
                <div className="space-y-1">
                  {chunk.originalText && (
                    <div className="p-2 bg-red-100 border border-red-300 rounded text-sm">
                      <span className="text-red-800 line-through">- {chunk.originalText}</span>
                    </div>
                  )}
                  {chunk.newText && (
                    <div className="p-2 bg-green-100 border border-green-300 rounded text-sm">
                      <span className="text-green-800">+ {chunk.newText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reasoning */}
            {showReasoning && chunk.reasoning && (
              <div className="mt-2">
                <button
                  onClick={onToggleExpansion}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isExpanded ? 'Hide' : 'Show'} Reasoning
                </button>
                {isExpanded && (
                  <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-sm text-gray-700">
                    {chunk.reasoning}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isApplied && (onApply || onReject) && (
          <div className="flex items-center gap-1 ml-2">
            {onApply && (
              <Button
                size="sm"
                variant="outline"
                onClick={onApply}
                className="h-6 w-6 p-0 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                title="Apply this change"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="h-6 w-6 p-0 bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                title="Reject this change"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
} 