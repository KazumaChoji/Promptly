"use client";

import React, { useState } from 'react';
import { TestBatch, ChatTestCase, BatchResult, TestCaseResult } from '../../types/inference';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  CheckCircleIcon as CheckCircle, 
  XCircleIcon as XCircle, 
  ClockIcon as Clock, 
  ChevronDownIcon as ChevronDown, 
  ChevronRightIcon as ChevronRight,
  DocumentDuplicateIcon as Copy,
  PlayIcon as Play,
  ChartBarIcon as BarChart3,
  EyeIcon as Eye,
  ExclamationTriangleIcon as AlertTriangle,
  DocumentIcon as FileText,
  BoltIcon as Zap
} from '@heroicons/react/24/outline';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";


interface BatchResultsPanelProps {
  results: BatchResult[];
  onRerunTest: (testCaseId: string) => void;
  onRerunBatch: (batchId: string) => void;
  onViewDetails: (testCaseId: string) => void;
}

export function BatchResultsPanel({ 
  results, 
  onRerunTest, 
  onRerunBatch,
  onViewDetails 
}: BatchResultsPanelProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleBatch = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const toggleTest = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  const getStatusIcon = (status: string, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    
    switch (status) {
      case 'passed':
        return <CheckCircle className={`${sizeClass} text-green-500`} />;
      case 'failed':
        return <XCircle className={`${sizeClass} text-red-500`} />;
      case 'running':
        return <Clock className={`${sizeClass} text-yellow-500 animate-spin`} />;
      default:
        return <Clock className={`${sizeClass} text-gray-400`} />;
    }
  };

  const getSuccessRate = (batch: BatchResult) => {
    const total = batch.totalTests;
    const passed = batch.passed;
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Results Yet</h3>
        <p className="text-muted-foreground">
          Run a batch to see detailed results and performance metrics here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Batch Results</h2>
            <p className="text-sm text-muted-foreground">
              {results.length} batch{results.length === 1 ? '' : 'es'} executed
            </p>
          </div>
        </div>
      </div>

      {/* Results List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {results.map((batch) => (
            <div key={batch.batchId} className="border border-border rounded-lg bg-card">
              {/* Batch Header */}
              <Collapsible 
                open={expandedBatches.has(batch.batchId)}
                onOpenChange={() => toggleBatch(batch.batchId)}
              >
                <CollapsibleTrigger className="p-4 cursor-pointer hover:bg-muted/50 transition-colors w-full text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedBatches.has(batch.batchId) ? 
                          <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                        <div>
                          <h3 className="font-medium text-foreground">{batch.batchName}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{batch.totalTests} tests</span>
                            <span>•</span>
                            <span>{batch.executionTime}ms</span>
                            <span>•</span>
                            <span>{batch.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Success Rate */}
                        <div className="text-right">
                          <div className="text-lg font-semibold text-foreground">
                            {getSuccessRate(batch)}%
                          </div>
                          <div className="text-xs text-muted-foreground">success</div>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex gap-2">
                          {batch.passed > 0 && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {batch.passed} passed
                            </Badge>
                          )}
                          {batch.failed > 0 && (
                            <Badge variant="destructive">
                              {batch.failed} failed
                            </Badge>
                          )}
                          {batch.pending > 0 && (
                            <Badge variant="secondary">
                              {batch.pending} pending
                            </Badge>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRerunBatch(batch.batchId);
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                </CollapsibleTrigger>

                {/* Batch Details */}
                <CollapsibleContent>
                  <div className="border-t border-border">
                    {batch.testResults.map((result) => (
                      <div key={result.testCase.id} className="border-b border-border last:border-b-0">
                        {/* Test Case Header */}
                        <Collapsible 
                          open={expandedTests.has(result.testCase.id)}
                          onOpenChange={() => toggleTest(result.testCase.id)}
                        >
                          <CollapsibleTrigger className="p-4 cursor-pointer hover:bg-muted/30 transition-colors w-full text-left">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {expandedTests.has(result.testCase.id) ? 
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" /> : 
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  }
                                  {getStatusIcon(result.status)}
                                  <div>
                                    <div className="font-medium text-foreground">{result.testCase.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {result.testCase.messages?.length || 0} messages
                                      {result.model && ` • ${result.model}`}
                                      {result.executionTime && ` • ${result.executionTime}ms`}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {result.confidence && (
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(result.confidence * 100)}%
                                    </Badge>
                                  )}
                                  
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetails(result.testCase.id);
                                      }}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRerunTest(result.testCase.id);
                                      }}
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                          </CollapsibleTrigger>

                          {/* Test Case Details */}
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-4">
                              {/* Error Message */}
                              {result.errorMessage && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                    <div>
                                      <div className="text-sm font-medium text-red-800">Error</div>
                                      <div className="text-sm text-red-700 mt-1">{result.errorMessage}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Output Comparison */}
                              {(result.actualOutput || result.expectedOutput) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Expected Output */}
                                  {result.expectedOutput && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-foreground">Expected Output</div>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => copyToClipboard(result.expectedOutput!)}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="bg-muted rounded-md p-3 text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-foreground">
                                        {result.expectedOutput}
                                      </div>
                                    </div>
                                  )}

                                  {/* Actual Output */}
                                  {result.actualOutput && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-foreground">Actual Output</div>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => copyToClipboard(result.actualOutput!)}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className={`rounded-md p-3 text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto ${
                                        result.status === 'passed' ? 'bg-green-50 border border-green-200 text-green-900' : 
                                        result.status === 'failed' ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-muted text-foreground'
                                      }`}>
                                        {result.actualOutput}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}