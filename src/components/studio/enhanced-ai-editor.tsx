"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { enhancedAIEditorService } from '../../lib/enhanced-ai-editor-service';
import { VisualDiffViewer } from './visual-diff-viewer';
import { AutonomyController } from './autonomy-controller';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  AutonomyLevel,
  AutonomyConfig,
  AIEditSuggestion,
  VisualDiffResult,
  EditHistoryEntry,
  AuditTrailEntry,
  AIEditorEvent
} from '../../lib/ai-editor-types';
import {
  SparklesIcon as Sparkles,
  ArrowUturnLeftIcon as Undo,
  ArrowUturnRightIcon as Redo,
  ClockIcon as History,
  EyeIcon as Eye,
  Cog6ToothIcon as Settings,
  CpuChipIcon as Bot,
  UserIcon as User,
  ShieldCheckIcon as Shield,
  ExclamationTriangleIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ArrowPathIcon as RotateCcw,
  BoltIcon as Zap,
  CpuChipIcon as Brain,
  DocumentTextIcon as FileText
} from '@heroicons/react/24/outline';

interface EnhancedAIEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  showAutonomyControls?: boolean;
  showVisualDiffs?: boolean;
  showAuditTrail?: boolean;
}

export function EnhancedAIEditor({
  value,
  onChange,
  language = 'plaintext',
  readOnly = false,
  className = "",
  showAutonomyControls = true,
  showVisualDiffs = true,
  showAuditTrail = true
}: EnhancedAIEditorProps) {
  // State Management
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('partial');
  const [autonomyConfig, setAutonomyConfig] = useState<AutonomyConfig>({
    level: 'partial',
    autoApplyThreshold: 0.9,
    requireConfirmation: true,
    maxBatchSize: 3,
    allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
  });
  
  const [suggestions, setSuggestions] = useState<AIEditSuggestion[]>([]);
  const [currentDiff, setCurrentDiff] = useState<VisualDiffResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [showAutonomyPanel, setShowAutonomyPanel] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  
  // History and Audit Trail
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAppliedSuggestion = useRef<string | null>(null);

  // Initialize service event listeners
  useEffect(() => {
    const handleSuggestionGenerated = (event: AIEditorEvent) => {
      if (event.type === 'suggestion-generated') {
        setSuggestions(event.payload.suggestions);
        setCurrentDiff(event.payload.diff);
        setShowDiffViewer(true);
      }
    };

    const handleEditApplied = (event: AIEditorEvent) => {
      if (event.type === 'edit-applied') {
        // Update history
        const historyEntry: EditHistoryEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          textBefore: value,
          textAfter: event.payload.newText,
          appliedChunks: event.payload.chunks,
          reasoning: event.payload.reasoning,
          autonomyLevel
        };
        
        setEditHistory(prev => [...prev, historyEntry]);
        setHistoryIndex(prev => prev + 1);
      }
    };

    enhancedAIEditorService.addEventListener('suggestion-generated', handleSuggestionGenerated);
    enhancedAIEditorService.addEventListener('edit-applied', handleEditApplied);

    return () => {
      enhancedAIEditorService.removeEventListener('suggestion-generated');
      enhancedAIEditorService.removeEventListener('edit-applied');
    };
  }, [value, autonomyLevel]);

  // Handle text selection
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const selected = target.value.substring(target.selectionStart, target.selectionEnd);
    setSelectedText(selected);
  }, []);

  // Handle context menu for AI suggestions
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const selectedText = selection?.toString().trim() || '';
    
    if (!selectedText && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selectedTextFromTextarea = value.substring(start, end).trim();
        if (selectedTextFromTextarea) {
          e.preventDefault();
          handleGenerateSuggestions(selectedTextFromTextarea);
          return;
        }
      }
    }

    if (selectedText) {
      e.preventDefault();
      handleGenerateSuggestions(selectedText);
    }
  }, [value, readOnly]);

  // Generate AI suggestions
  const handleGenerateSuggestions = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await enhancedAIEditorService.generateEdit({
        originalText: text,
        instruction: `Improve this text: "${text}"`,
        context: `Editing in ${language} mode with ${autonomyLevel} autonomy`,
        autonomyLevel,
        model: 'gpt-4o-mini',
        includeReasoning: true,
        includeIntermediateSteps: true
      });

      setSuggestions(response.suggestions);
             // Convert AIDiffResult to VisualDiffResult
       const visualDiff: VisualDiffResult = {
         chunks: response.diff.chunks.map(chunk => ({
           id: chunk.id,
           type: chunk.diffType === 'addition' ? 'addition' : 
                 chunk.diffType === 'deletion' ? 'deletion' : 'modification',
           originalText: chunk.originalText,
           newText: chunk.suggestedText,
           startIndex: chunk.startIndex,
           endIndex: chunk.endIndex,
           confidence: chunk.confidence,
           reasoning: chunk.reasoning,
           applied: chunk.applied
         })),
         overallConfidence: response.diff.overallConfidence,
         totalChanges: response.diff.chunks.length,
         reasoning: response.diff.reasoning,
         modelInfo: {
           name: 'GPT-4o-mini',
           version: '1.0',
           provider: 'OpenAI'
         }
       };
       setCurrentDiff(visualDiff);
      setShowDiffViewer(true);

      // Auto-apply high-confidence suggestions based on autonomy level
      if (autonomyConfig.autoApplyThreshold < 1.0) {
        const highConfidenceSuggestions = response.suggestions.filter(
          s => s.confidence >= autonomyConfig.autoApplyThreshold
        );
        
        if (highConfidenceSuggestions.length > 0 && !autonomyConfig.requireConfirmation) {
          // Auto-apply high-confidence suggestions
          for (const suggestion of highConfidenceSuggestions.slice(0, autonomyConfig.maxBatchSize)) {
            await applySuggestion(suggestion);
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [autonomyLevel, autonomyConfig, language]);

  // Apply a suggestion
  const applySuggestion = useCallback(async (suggestion: AIEditSuggestion) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Apply the suggestion
    const beforeSelection = value.substring(0, start);
    const afterSelection = value.substring(end);
    const newText = beforeSelection + suggestion.suggestedText + afterSelection;
    
    onChange(newText);
    lastAppliedSuggestion.current = suggestion.id;

    // Add to audit trail
    const auditEntry: AuditTrailEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action: 'edit',
      sessionId: sessionStorage.getItem('ai-editor-session-id') || crypto.randomUUID(),
      changes: [{
        id: crypto.randomUUID(),
        startIndex: start,
        endIndex: end,
        originalText: value.substring(start, end),
        suggestedText: suggestion.suggestedText,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        applied: true,
        diffType: 'modification'
      }],
      reasoning: suggestion.reasoning,
      autonomyLevel,
      modelUsed: 'gpt-4o-mini',
      confidence: suggestion.confidence
    };

    setAuditTrail(prev => [...prev, auditEntry]);

    // Emit event
    enhancedAIEditorService.emitEvent({
      type: 'edit-applied',
      payload: {
        suggestionId: suggestion.id,
        newText,
        chunks: auditEntry.changes,
        reasoning: suggestion.reasoning
      },
      timestamp: new Date()
    });
  }, [value, onChange, autonomyLevel]);

  // Reject a suggestion
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    
    // Add to audit trail
    const auditEntry: AuditTrailEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action: 'reject',
      sessionId: sessionStorage.getItem('ai-editor-session-id') || crypto.randomUUID(),
      changes: [],
      reasoning: 'User rejected suggestion',
      autonomyLevel,
      modelUsed: 'gpt-4o-mini',
      confidence: 0
    };

    setAuditTrail(prev => [...prev, auditEntry]);
  }, [autonomyLevel]);

  // Undo/Redo functionality
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    
    const targetIndex = historyIndex - 1;
    const targetEntry = editHistory[targetIndex];
    onChange(targetEntry.textBefore);
    setHistoryIndex(targetIndex);
  }, [canUndo, historyIndex, editHistory, onChange]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    
    const targetIndex = historyIndex + 1;
    const targetEntry = editHistory[targetIndex];
    onChange(targetEntry.textAfter);
    setHistoryIndex(targetIndex);
  }, [canRedo, historyIndex, editHistory, onChange]);

  // Natural language instruction processing
  const handleNaturalLanguageEdit = useCallback(async (instruction: string) => {
    setIsGenerating(true);
    try {
      const response = await enhancedAIEditorService.generateEdit({
        originalText: value,
        instruction,
        context: `Full document edit with ${autonomyLevel} autonomy`,
        autonomyLevel,
        model: 'gpt-4o-mini',
        includeReasoning: true,
        includeIntermediateSteps: true
      });

      if (response.suggestions.length > 0) {
        // Apply all suggestions for natural language edits
        for (const suggestion of response.suggestions) {
          await applySuggestion(suggestion);
        }
      }
    } catch (error) {
      console.error('Failed to process natural language edit:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [value, autonomyLevel, applySuggestion]);

  // Visual diff handling
  const handleApplyDiffChunk = useCallback((chunkId: string) => {
    if (!currentDiff) return;
    
    const chunk = currentDiff.chunks.find(c => c.id === chunkId);
    if (!chunk) return;

    // Apply the chunk
    const beforeChunk = value.substring(0, chunk.startIndex);
    const afterChunk = value.substring(chunk.endIndex);
    const newText = beforeChunk + (chunk.newText || '') + afterChunk;
    
    onChange(newText);
    
    // Mark as applied
    setCurrentDiff(prev => prev ? {
      ...prev,
      chunks: prev.chunks.map(c => 
        c.id === chunkId ? { ...c, applied: true } : c
      )
    } : null);
  }, [currentDiff, value, onChange]);

  const handleRejectDiffChunk = useCallback((chunkId: string) => {
    setCurrentDiff(prev => prev ? {
      ...prev,
      chunks: prev.chunks.filter(c => c.id !== chunkId)
    } : null);
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          {/* Autonomy Level Indicator */}
          <div className="flex items-center gap-2">
            {autonomyLevel === 'manual' && <User className="w-4 h-4 text-blue-600" />}
            {autonomyLevel === 'partial' && <Shield className="w-4 h-4 text-green-600" />}
            {autonomyLevel === 'assisted' && <Sparkles className="w-4 h-4 text-purple-600" />}
            {autonomyLevel === 'autonomous' && <Bot className="w-4 h-4 text-orange-600" />}
            <Badge variant="outline" className="text-xs">
              {autonomyLevel.charAt(0).toUpperCase() + autonomyLevel.slice(1)}
            </Badge>
          </div>

          {/* AI Status */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              AI Processing...
            </div>
          )}

          {/* Confidence Indicator */}
          {currentDiff && (
            <div className="flex items-center gap-1">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">
                {(currentDiff.overallConfidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>

          {/* Control Toggles */}
          {showAutonomyControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAutonomyPanel(!showAutonomyPanel)}
              className="h-8 px-3 text-xs"
            >
              <Settings className="w-4 h-4 mr-1" />
              Autonomy
            </Button>
          )}

          {showVisualDiffs && currentDiff && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiffViewer(!showDiffViewer)}
              className="h-8 px-3 text-xs"
            >
              <Eye className="w-4 h-4 mr-1" />
              Diffs
            </Button>
          )}

          {showAuditTrail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              className="h-8 px-3 text-xs"
            >
              <History className="w-4 h-4 mr-1" />
              Audit
            </Button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={handleSelect}
            onContextMenu={handleContextMenu}
            readOnly={readOnly}
            className="w-full h-full resize-none bg-background text-foreground p-4 font-mono text-sm border-none outline-none"
            style={{ 
              fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
              lineHeight: '1.5'
            }}
            placeholder="Start typing... Right-click on selected text for AI suggestions!"
          />
          
          {/* Natural Language Input */}
          {autonomyLevel !== 'manual' && (
            <div className="absolute bottom-4 right-4 w-80">
              <Card className="p-3 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Natural Language Edit</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Describe your edit..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleNaturalLanguageEdit(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Describe your edit..."]') as HTMLInputElement;
                      if (input?.value) {
                        handleNaturalLanguageEdit(input.value);
                        input.value = '';
                      }
                    }}
                    disabled={isGenerating}
                    className="px-3"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Side Panels */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <Tabs defaultValue="autonomy" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="autonomy">Autonomy</TabsTrigger>
              <TabsTrigger value="diffs">Diffs</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            {/* Autonomy Panel */}
            <TabsContent value="autonomy" className="h-full overflow-y-auto">
              {showAutonomyPanel && (
                                 <AutonomyController
                   currentLevel={autonomyLevel}
                   onLevelChange={setAutonomyLevel}
                   config={autonomyConfig}
                   onConfigChange={(config) => setAutonomyConfig(prev => ({ ...prev, ...config }))}
                   className="p-4"
                 />
              )}
            </TabsContent>

            {/* Visual Diffs Panel */}
            <TabsContent value="diffs" className="h-full overflow-y-auto">
              {showDiffViewer && currentDiff && (
                <VisualDiffViewer
                  diff={currentDiff}
                  onApplyChunk={handleApplyDiffChunk}
                  onRejectChunk={handleRejectDiffChunk}
                  onApplyAll={() => {
                    currentDiff.chunks.forEach(chunk => {
                      if (!chunk.applied && chunk.type !== 'unchanged') {
                        handleApplyDiffChunk(chunk.id);
                      }
                    });
                  }}
                  onRejectAll={() => setCurrentDiff(null)}
                  className="p-4"
                />
              )}
            </TabsContent>

            {/* Audit Trail Panel */}
            <TabsContent value="audit" className="h-full overflow-y-auto">
              {showAuditPanel && (
                <div className="p-4 space-y-4">
                  <h3 className="font-semibold text-gray-900">Audit Trail</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditTrail.slice(-20).reverse().map((entry) => (
                      <Card key={entry.id} className="p-3 text-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{entry.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {entry.autonomyLevel}
                          </Badge>
                          <span className="text-gray-500">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{entry.reasoning}</p>
                        {entry.changes.length > 0 && (
                          <div className="mt-2 text-gray-500">
                            {entry.changes.length} change(s)
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 