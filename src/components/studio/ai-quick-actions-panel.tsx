"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { 
  XMarkIcon as X, 
  SparklesIcon as Sparkles, 
  ArrowPathIcon as Loader2,
  ExclamationTriangleIcon as AlertCircle,
  PaperAirplaneIcon as Send
} from '@heroicons/react/24/outline';
import { generateQuickActionsWithOpenAI, applyQuickActionWithOpenAI } from '../../lib/ai-prompt-editor-service';

type ProcessStep = 'initializing' | 'analyzing' | 'generating' | 'parsing' | 'complete' | 'error';

interface AIQuickActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  fullPromptContent: string;
  onApplyAction: (action: string) => void;
  currentSelection?: { startLine: number; endLine: number; startColumn: number; endColumn: number };
}

export function AIQuickActionsPanel({
  isOpen,
  onClose,
  selectedText,
  fullPromptContent,
  onApplyAction,
  currentSelection
}: AIQuickActionsPanelProps) {
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('initializing');
  const [error, setError] = useState<string | null>(null);

  // Generate quick actions when panel opens
  useEffect(() => {
    if (isOpen && selectedText && fullPromptContent) {
      setIsLoading(true);
      setQuickActions([]);
      setError(null);
      
      // Step 1: Initialize
      setCurrentStep('initializing');
      
      // Simulate step progression for better UX
      setTimeout(() => {
        setCurrentStep('analyzing');
        
        setTimeout(() => {
          setCurrentStep('generating');
          
          // Make the actual API call
          generateQuickActionsWithOpenAI(selectedText, fullPromptContent)
            .then(actions => {
              setCurrentStep('parsing');
              
              // Brief delay to show parsing step
              setTimeout(() => {
                setQuickActions(actions.slice(0, 3)); // Limit to 3 actions
                setCurrentStep('complete');
              }, 300);
            })
            .catch(error => {
              console.error('Failed to generate quick actions:', error);
              setCurrentStep('error');
              setError(error instanceof Error ? error.message : 'Unknown error occurred');
              setQuickActions([]);
            })
            .finally(() => {
              setIsLoading(false);
            });
        }, 500);
      }, 300);
    }
  }, [isOpen, selectedText, fullPromptContent]);

  const handleApplyAction = async (action: string) => {
    try {
      // Get the actual modified text from the API
      const modifiedText = await applyQuickActionWithOpenAI(selectedText, action, fullPromptContent);
      
      // Call the original onApplyAction with the modified text
      onApplyAction(modifiedText);
      
      // Also trigger the diff system if we have selection info
      if (currentSelection && (window as any).handleQuickActionApplied) {
        const selection = {
          startLineNumber: currentSelection.startLine,
          endLineNumber: currentSelection.endLine,
          startColumn: currentSelection.startColumn,
          endColumn: currentSelection.endColumn
        };
        
        (window as any).handleQuickActionApplied(selectedText, modifiedText, selection);
      }
    } catch (error) {
      console.error('Failed to apply quick action:', error);
      // Fallback to just calling onApplyAction with the action text
      onApplyAction(action);
    }
    
    onClose();
  };

  return (
    <>
      {/* Simple Panel - No Header */}
      <div className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`} style={{ height: '120px' }}>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-sm text-muted-foreground">
                {currentStep === 'generating' ? 'Generating options...' : 'Preparing...'}
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setCurrentStep('initializing');
                  // Re-trigger the effect
                  if (selectedText && fullPromptContent) {
                    setIsLoading(true);
                    setQuickActions([]);
                    setError(null);
                    
                    setCurrentStep('initializing');
                    
                    setTimeout(() => {
                      setCurrentStep('analyzing');
                      
                      setTimeout(() => {
                        setCurrentStep('generating');
                        
                        generateQuickActionsWithOpenAI(selectedText, fullPromptContent)
                          .then(actions => {
                            setCurrentStep('parsing');
                            
                            setTimeout(() => {
                              setQuickActions(actions.slice(0, 3));
                              setCurrentStep('complete');
                            }, 300);
                          })
                          .catch(error => {
                            console.error('Failed to generate quick actions:', error);
                            setCurrentStep('error');
                            setError(error instanceof Error ? error.message : 'Unknown error occurred');
                            setQuickActions([]);
                          })
                          .finally(() => {
                            setIsLoading(false);
                          });
                      }, 500);
                    }, 300);
                  }
                }}
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

                 {/* Actions - Simple Stacked Layout */}
         {!isLoading && !error && quickActions.length > 0 && (
           <div className="flex flex-col h-full">
             {quickActions.map((action, idx) => (
               <div key={idx} className="flex-1 flex">
                 <button
                   onClick={() => handleApplyAction(action)}
                   className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-card-foreground bg-card hover:bg-muted transition-colors border-0"
                 >
                   <span>{action}</span>
                 </button>
               </div>
             ))}
             {/* Border lines between options */}
             {quickActions.length > 1 && (
               <>
                 <div className="h-px bg-border"></div>
                 {quickActions.length > 2 && (
                   <div className="h-px bg-border"></div>
                 )}
               </>
             )}
           </div>
         )}

        {/* Empty State */}
        {!isLoading && !error && quickActions.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Sparkles className="w-5 h-5 mr-2 text-muted-foreground" />
            No options available
          </div>
        )}
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
    </>
  );
} 