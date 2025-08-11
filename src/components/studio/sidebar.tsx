"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

import { 
  PlayIcon as Play, 
  Cog6ToothIcon as Settings, 
  BeakerIcon as TestTube, 
  DocumentIcon as FileText,
  ChartBarIcon as BarChart3,
  PaperAirplaneIcon as Send,
  ArrowPathIcon as Loader2,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ClockIcon as Clock
} from "@heroicons/react/24/outline";
import { useDesktopStore } from "../../lib/desktop-store";
import { useHotkeys } from "react-hotkeys-hook";
import { BatchTab } from "./batch-tab";
import { AVAILABLE_MODELS } from "../../lib/llm-service";
import { useToast } from "../ui/use-toast";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export function Sidebar({ isCollapsed, onToggle, width = 600, onWidthChange }: SidebarProps) {
  const {
    files,
    activeFileId,
    testInput,
    setTestInput,
    results,
    experimentRuns,
    experimentConfig,
    updateExperimentConfig,
    sidebarTab,
    setSidebarTab,
    getActiveFileContent,
    isQuickTestLoading,
    quickTestStatus,
    lastTestResult,
    runSingleTest: storeRunSingleTest
  } = useDesktopStore();

  const { toast } = useToast();
  const activeFile = files.find(f => f.id === activeFileId);
  
  // Fix hydration mismatch by calculating content stats on client side only
  const [contentStats, setContentStats] = useState<{
    charCount: number;
    variableCount: number;
  } | null>(null);
  
  // Fix hydration mismatch for dynamic timestamps
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    if (activeFile) {
      const content = getActiveFileContent();
      const charCount = content.length;
      const variableCount = content.match(/\{\{[^}]+\}\}/g)?.length || 0;
      setContentStats({ charCount, variableCount });
    } else {
      setContentStats(null);
    }
  }, [activeFile, getActiveFileContent]);
  
  useEffect(() => {
    // Update time only on client side to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString());
  }, [lastTestResult]);

  // Keyboard shortcuts
  useHotkeys('ctrl+shift+b, cmd+shift+b', (e) => {
    e.preventDefault();
    onToggle();
  });

  const getStatusIndicator = () => {
    switch (quickTestStatus) {
      case 'sending':
        return {
          icon: <Send className="w-4 h-4" />,
          text: "Sending request...",
          className: "text-blue-600"
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: "Processing...",
          className: "text-yellow-600"
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Completed",
          className: "text-green-600"
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: "Failed",
          className: "text-red-600"
        };
      default:
        return null;
    }
  };

  const handleQuickTest = async () => {
    const result = await storeRunSingleTest();
    
    if (result.success) {
      toast({
        title: "Test completed successfully",
        description: `Response generated using ${experimentConfig.model}`,
      });
      // Auto-switch to results tab to show the result
      setSidebarTab('results');
    } else {
      toast({
        variant: "destructive",
        title: "Test failed",
        description: result.error || "An unknown error occurred",
      });
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-border bg-background flex flex-col shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 m-1"
          onClick={onToggle}
        >
          ←
        </Button>
      </div>
    );
  }

  return (
    <div className="border-l border-border bg-background flex flex-col shadow-lg relative" style={{ width: `${width}px` }}>
      {/* Resize Handle */}
      {onWidthChange && (
        <div
          className="absolute left-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary/20 transition-colors z-20"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = width;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = startX - e.clientX; // Reversed because we're resizing from the left
              const newWidth = Math.max(500, Math.min(600, startWidth + deltaX));
              onWidthChange(newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Inference Panel</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggle}
        >
          →
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={sidebarTab} onValueChange={(value: string) => setSidebarTab(value as 'test' | 'batch' | 'results')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Batch
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            Results
          </TabsTrigger>
        </TabsList>

        {/* Test Tab */}
        <TabsContent value="test" className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Test Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Input</label>
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter your test input here..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Quick Test Button */}
          <Button 
            onClick={handleQuickTest}
            disabled={!activeFile || !testInput.trim() || isQuickTestLoading}
            className="w-full"
          >
            {isQuickTestLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running Test...
              </div>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Quick Test
              </>
            )}
          </Button>

          {/* Request Status Indicator */}
          {quickTestStatus !== 'idle' && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {getStatusIndicator() && (
                    <>
                      <div className={getStatusIndicator()!.className}>
                        {getStatusIndicator()!.icon}
                      </div>
                      <span className={`text-sm font-medium ${getStatusIndicator()!.className}`}>
                        {getStatusIndicator()!.text}
                      </span>
                    </>
                  )}
                  {quickTestStatus === 'processing' && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {experimentConfig.provider}
                    </span>
                  )}
                </div>
                
                {/* Live Result Display */}
                {lastTestResult && quickTestStatus === 'completed' && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-success">Latest Result:</div>
                    <div className="p-3 bg-success/5 border border-success/20 rounded-md text-xs text-foreground">
                      <div className="whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {lastTestResult.content || 'No content returned'}
                      </div>
                    </div>
                    {lastTestResult.usage && (
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Tokens: {lastTestResult.usage.total_tokens}</span>
                        <span>•</span>
                        <span>Time: {currentTime || 'Loading...'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Display */}
                {lastTestResult?.error && quickTestStatus === 'error' && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-destructive">Error:</div>
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-xs text-destructive">
                      {lastTestResult.error}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

                     {/* Experiment Configuration */}
           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-sm flex items-center gap-2">
                 <Settings className="w-4 h-4" />
                 Experiment Config
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <div className="space-y-2">
                 <label className="text-xs font-medium">Provider</label>
                 <Select value={experimentConfig.provider} onValueChange={(value) => updateExperimentConfig({ provider: value })}>
                   <SelectTrigger className="h-8">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="openai">OpenAI</SelectItem>
                     <SelectItem value="anthropic">Anthropic</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-medium">Model</label>
                 <Select value={experimentConfig.model} onValueChange={(value) => updateExperimentConfig({ model: value })}>
                   <SelectTrigger className="h-8">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {AVAILABLE_MODELS
                       .filter(model => model.provider === experimentConfig.provider.toLowerCase())
                       .map((model) => (
                         <SelectItem key={model.id} value={model.id}>
                           {model.name}
                         </SelectItem>
                       ))}
                   </SelectContent>
                 </Select>
               </div>
               
               <div className="space-y-2">
                 <label className="text-xs font-medium">Temperature</label>
                 <div className="flex items-center gap-2">
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.05"
                     value={experimentConfig.temperature}
                     onChange={(e) => updateExperimentConfig({ temperature: parseFloat(e.target.value) })}
                     className="flex-1"
                   />
                   <span className="text-xs w-8">{experimentConfig.temperature}</span>
                 </div>
               </div>
               
               <div className="space-y-2">
                 <label className="text-xs font-medium">Max Tokens</label>
                 <Input
                   type="number"
                   value={experimentConfig.maxTokens}
                   onChange={(e) => updateExperimentConfig({ maxTokens: parseInt(e.target.value) })}
                   className="h-8"
                 />
               </div>
             </CardContent>
           </Card>

          {/* Active File Info */}
          {activeFile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Active File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {activeFile.name}
                  </Badge>
                  {activeFile.unsaved && (
                    <Badge variant="secondary" className="text-xs">
                      Unsaved
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {contentStats ? (
                    `${contentStats.charCount} characters, ${contentStats.variableCount} variables`
                  ) : (
                    'Loading...'
                  )}
                </p>
              </CardContent>
            </Card>
          )}
                </TabsContent>

        {/* Batch Tab */}
        <TabsContent value="batch" className="flex-1 flex flex-col overflow-hidden">
          <BatchTab />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Test Results</h4>
              <Badge variant="outline" className="text-xs">
                {results.length} results
              </Badge>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No test results yet</p>
                <p className="text-xs">Run a quick test to see results here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.slice().reverse().map((result, index) => (
                  <Card key={results.length - index - 1} className="border">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {result.model}
                          </Badge>
                          {result.error ? (
                            <Badge variant="destructive" className="text-xs">
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Success
                            </Badge>
                          )}
                        </div>
                        
                        {result.error ? (
                          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-xs text-destructive">
                            {result.error}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-3 bg-muted/30 border border-border rounded-md text-xs text-foreground">
                              <div className="font-medium mb-1 text-muted-foreground">Response:</div>
                              <div className="whitespace-pre-wrap break-words">
                                {result.content || 'No content returned'}
                              </div>
                            </div>
                            
                            {result.usage && (
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span>Tokens: {result.usage.total_tokens}</span>
                                <span>•</span>
                                <span>In: {result.usage.prompt_tokens}</span>
                                <span>•</span>
                                <span>Out: {result.usage.completion_tokens}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {experimentRuns.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <h5 className="text-xs font-medium text-muted-foreground">Experiment History</h5>
                <div className="space-y-2">
                  {experimentRuns.slice().reverse().slice(0, 5).map((run) => (
                    <div key={run.id} className="p-3 bg-muted/20 border border-border rounded-md text-xs text-foreground">
                      <div className="font-medium">{run.promptFile}</div>
                      <div className="text-muted-foreground">
                        {run.timestamp.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">
                        {run.config.provider} • {run.config.model}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 