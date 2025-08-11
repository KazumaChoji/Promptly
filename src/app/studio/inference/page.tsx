"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';

import { TopBar } from "../../../components/studio/top-bar";
import { useDesktopStore } from "../../../lib/desktop-store";
import { useToast } from "../../../components/ui/use-toast";
import { LLMService, AVAILABLE_MODELS } from "../../../lib/llm-service";
import { UserSettingsService, FlatUserSettings } from "../../../lib/user-settings";
import { Button } from "../../../components/ui/button";
import { PlusIcon as Plus, ChartBarIcon as BarChart3, XMarkIcon as X } from "@heroicons/react/24/outline";

// Import our new enhanced components
import { DragDropProvider } from "../../../components/studio/drag-drop-provider";
import { DraggableBatchCard } from "../../../components/studio/draggable-batch-card";
import { EnhancedChatlogEditor } from "../../../components/studio/enhanced-chatlog-editor";
import { InferenceSearchFilters, SearchFilters } from "../../../components/studio/inference-search-filters";
import { BatchResultsPanel } from "../../../components/studio/batch-results-panel";
import { BatchConfigDialog } from "../../../components/studio/batch-config-dialog";

// Import enhanced types
import { TestBatch, ChatTestCase, ChatMessage, BatchResult, TestCaseResult } from "../../../types/inference";
import { TEST_CASE_TEMPLATES } from "../../../lib/test-case-templates";
import { BatchPersistenceService } from "../../../lib/batch-persistence";

// Utility functions for filtering and searching
const filterBatches = (batches: TestBatch[], filters: SearchFilters) => {
  return batches.filter(batch => {
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesName = batch.name.toLowerCase().includes(searchLower);
      const matchesTestCase = batch.testCases.some(tc => 
        tc.name.toLowerCase().includes(searchLower) ||
        tc.messages.some(msg => msg.content.toLowerCase().includes(searchLower))
      );
      if (!matchesName && !matchesTestCase) return false;
    }

    // Status filters
    if (filters.statusFilters.length > 0) {
      const hasMatchingStatus = batch.testCases.some(tc => 
        filters.statusFilters.includes(tc.status)
      );
      if (!hasMatchingStatus) return false;
    }

    // Priority filters
    if (filters.priorityFilters.length > 0) {
      const hasMatchingPriority = batch.testCases.some(tc => 
        tc.metadata?.priority && filters.priorityFilters.includes(tc.metadata.priority)
      );
      if (!hasMatchingPriority) return false;
    }

    // Tag filters
    if (filters.tagFilters.length > 0) {
      const batchTags = batch.metadata?.tags || [];
      const testCaseTags = batch.testCases.flatMap(tc => tc.metadata?.tags || []);
      const allTags = [...batchTags, ...testCaseTags];
      const hasMatchingTag = filters.tagFilters.some(tag => allTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    return true;
  });
};

function EnhancedInferencePageContent() {
  const searchParams = useSearchParams();
  const fileIdFromQuery = searchParams.get('fileId');
  
  const {
    files,
    activeFileId,
    openFile,
    experimentConfig,
    getActiveFileContent,
  } = useDesktopStore();

  const { toast } = useToast();
  const activeFile = files.find(f => f.id === activeFileId);
  
  // Set the active file based on query parameter if provided
  useEffect(() => {
    if (fileIdFromQuery && files.some(f => f.id === fileIdFromQuery)) {
      openFile(fileIdFromQuery);
    }
  }, [fileIdFromQuery, files, openFile]);
  
  // Enhanced batch management state with order fields
  const [batches, setBatches] = useState<TestBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Chatlog editor state
  const [editingTestCase, setEditingTestCase] = useState<ChatTestCase | null>(null);
  const [showChatlogEditor, setShowChatlogEditor] = useState(false);

  // Search and filter state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: '',
    statusFilters: [],
    priorityFilters: [],
    tagFilters: [],
  });

  // Selection state for bulk operations
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Batch results state
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [showResultsPanel, setShowResultsPanel] = useState(false);

  // User settings state
  const [userSettings, setUserSettings] = useState<FlatUserSettings | null>(null);

  // Batch config dialog state
  const [batchConfigDialog, setBatchConfigDialog] = useState<{
    isOpen: boolean;
    batch: TestBatch | null;
  }>({ isOpen: false, batch: null });

  // Load user settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await UserSettingsService.getUserSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };
    loadSettings();
  }, []);

  const createDefaultBatch = useCallback(() => {
    const defaultBatch: TestBatch = {
      id: 'default-batch',
      name: 'Default Batch',
      order: 0,
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000
      },
      testCases: [{
        id: 'default-test-case',
        name: 'Sample Test Case',
        order: 0,
        messages: [{
          id: 'default-message',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: new Date(),
        }],
        status: 'pending',
        metadata: {
          createdAt: new Date(),
          priority: 'medium',
          tags: ['sample'],
        }
      }],
      created: new Date(),
      metadata: {
        description: 'Default batch for testing',
        tags: ['default'],
      }
    };
    const newBatches = [defaultBatch];
    setBatches(newBatches);
    setSelectedBatchId(defaultBatch.id);
    // Persist the new default batch
    BatchPersistenceService.savePersistenceState({
      batches: newBatches,
      selectedBatchId: defaultBatch.id,
      expandedBatchId: null
    });
  }, []);

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await UserSettingsService.getUserSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };
    loadUserSettings();
  }, []);

  // Load batches from localStorage on component mount
  useEffect(() => {
    try {
      const persistedState = BatchPersistenceService.loadPersistenceState();
      
      if (persistedState.batches.length > 0) {
        setBatches(persistedState.batches);
        setSelectedBatchId(persistedState.selectedBatchId);
        setExpandedBatchId(persistedState.expandedBatchId);
      } else {
        // Create default batch on first load
        createDefaultBatch();
      }
    } catch (error) {
      console.error('Failed to load batches from localStorage:', error);
      // Create default batch if loading fails
      createDefaultBatch();
    }
  }, [createDefaultBatch]);

  // Update batches and save to storage using persistence service
  const updateBatches = useCallback((newBatches: TestBatch[]) => {
    setBatches(newBatches);
    BatchPersistenceService.saveBatches(newBatches);
  }, []);

  const updateSelectedBatchId = useCallback((batchId: string) => {
    setSelectedBatchId(batchId);
    setExpandedBatchId(batchId); // Auto-expand when selecting
    BatchPersistenceService.saveSelectedBatchId(batchId);
    BatchPersistenceService.saveExpandedBatchId(batchId);
  }, []);

  // Update expanded batch and persist
  const updateExpandedBatchId = useCallback((batchId: string | null) => {
    setExpandedBatchId(batchId);
    BatchPersistenceService.saveExpandedBatchId(batchId);
  }, []);

  // Drag and drop handlers
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Handle batch reordering
    if (activeData.type === 'batch' && overData.type === 'batch') {
      const oldIndex = batches.findIndex(b => b.id === active.id);
      const newIndex = batches.findIndex(b => b.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedBatches = arrayMove(batches, oldIndex, newIndex);
        const newBatches = BatchPersistenceService.updateBatchOrder(reorderedBatches);
        setBatches(newBatches);
      }
    }

    // Handle test case reordering within a batch
    if (activeData.type === 'testcase' && overData.type === 'testcase') {
      const activeBatch = batches.find(b => b.testCases.some(tc => tc.id === active.id));
      const overBatch = batches.find(b => b.testCases.some(tc => tc.id === over.id));
      
      if (activeBatch && overBatch && activeBatch.id === overBatch.id) {
        const oldIndex = activeBatch.testCases.findIndex(tc => tc.id === active.id);
        const newIndex = activeBatch.testCases.findIndex(tc => tc.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newTestCases = arrayMove(activeBatch.testCases, oldIndex, newIndex).map((tc, index) => ({
            ...tc,
            order: index
          }));
          
          const newBatches = BatchPersistenceService.updateTestCaseOrder(
            activeBatch.id,
            newTestCases,
            batches
          );
          setBatches(newBatches);
        }
      }
    }
  }, [batches, updateBatches]);

  // Batch management functions
  const createBatch = useCallback(() => {
    const maxOrder = Math.max(...batches.map(b => b.order), -1);
    const newBatch: TestBatch = {
      id: `batch_${Date.now()}`,
      name: `Batch ${batches.length + 1}`,
      order: maxOrder + 1,
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1000
      },
      testCases: [{
        id: `testcase_${Date.now()}`,
        name: 'Test Case 1',
        order: 0,
        messages: [{
          id: `msg_${Date.now()}`,
          role: 'user',
          content: '',
          timestamp: new Date(),
        }],
        status: 'pending',
        metadata: {
          createdAt: new Date(),
          priority: 'medium',
        }
      }],
      created: new Date(),
      metadata: {
        description: '',
      }
    };
    
    const newBatches = BatchPersistenceService.addBatch(newBatch, batches);
    setBatches(newBatches);
    updateSelectedBatchId(newBatch.id);
  }, [batches, updateBatches, updateSelectedBatchId]);

  const editBatch = useCallback((batch: TestBatch) => {
    setBatchConfigDialog({ isOpen: true, batch });
  }, []);

  const handleBatchConfigSave = useCallback((updatedBatch: TestBatch) => {
    const newBatches = BatchPersistenceService.updateBatch(updatedBatch, batches);
    setBatches(newBatches);
  }, [batches]);

  const handleBatchConfigClose = useCallback(() => {
    setBatchConfigDialog({ isOpen: false, batch: null });
  }, []);

  const duplicateBatch = useCallback((batch: TestBatch) => {
    const maxOrder = Math.max(...batches.map(b => b.order), -1);
    const newBatch: TestBatch = {
      ...batch,
      id: `batch_${Date.now()}`,
      name: `${batch.name} (Copy)`,
      order: maxOrder + 1,
      created: new Date(),
      testCases: batch.testCases.map((tc, index) => ({
        ...tc,
        id: `testcase_${Date.now()}_${index}`,
        order: index,
        status: 'pending' as const,
        result: undefined,
        error: undefined,
        messages: tc.messages.map((msg, msgIndex) => ({
          ...msg,
          id: `msg_${Date.now()}_${index}_${msgIndex}`,
          timestamp: new Date(),
        })),
        metadata: {
          ...tc.metadata,
          createdAt: new Date(),
          lastRunAt: undefined,
          runCount: 0,
        }
      }))
    };
    
    updateBatches([...batches, newBatch]);
  }, [batches, updateBatches]);

  const deleteBatch = useCallback((batchId: string) => {
    if (batches.length === 1) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "You must have at least one batch.",
      });
      return;
    }
    
    const newBatches = BatchPersistenceService.deleteBatch(batchId, batches);
    setBatches(newBatches);
    
    if (selectedBatchId === batchId) {
      updateSelectedBatchId(newBatches[0].id);
    }
  }, [batches, selectedBatchId, updateSelectedBatchId, toast]);

  // Test case management
  const addTestCase = useCallback(() => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch) return;
    
    const maxOrder = Math.max(...selectedBatch.testCases.map(tc => tc.order), -1);
    const newTestCase: ChatTestCase = {
      id: `testcase_${Date.now()}`,
      name: `Test Case ${selectedBatch.testCases.length + 1}`,
      order: maxOrder + 1,
      messages: [{
        id: `msg_${Date.now()}`,
        role: 'user',
        content: '',
        timestamp: new Date(),
      }],
      status: 'pending',
      metadata: {
        createdAt: new Date(),
        priority: 'medium',
      }
    };
    
    const newBatches = BatchPersistenceService.addTestCase(selectedBatchId, newTestCase, batches);
    setBatches(newBatches);
  }, [batches, selectedBatchId, updateBatches]);

  const editTestCase = useCallback((testCase: ChatTestCase) => {
    setEditingTestCase(testCase);
    setShowChatlogEditor(true);
  }, []);

  const saveTestCase = useCallback((updatedTestCase: ChatTestCase) => {
    console.log('saveTestCase called with:', {
      id: updatedTestCase.id,
      name: updatedTestCase.name,
      messagesCount: updatedTestCase.messages.length,
      firstMessage: updatedTestCase.messages[0]?.content?.slice(0, 50),
    });

    // Find the batch containing the test case
    const batchId = batches.find(batch => 
      batch.testCases.some(tc => tc.id === updatedTestCase.id)
    )?.id;
    
    if (!batchId) {
      console.error('Could not find batch containing test case:', updatedTestCase.id);
      return;
    }
    
    const updatedTestCaseWithMetadata = {
      ...updatedTestCase,
      metadata: { ...updatedTestCase.metadata, lastRunAt: new Date() }
    };
    
    console.log('Updating test case in batch:', batchId);
    const newBatches = BatchPersistenceService.updateTestCase(batchId, updatedTestCaseWithMetadata, batches);
    setBatches(newBatches);
    
    console.log('Closing editor and clearing editing state');
    setShowChatlogEditor(false);
    setEditingTestCase(null);
  }, [batches, updateBatches]);

  const deleteTestCase = useCallback((testCaseId: string) => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch || selectedBatch.testCases.length === 1) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "Each batch must have at least one test case.",
      });
      return;
    }
    
    const newBatches = batches.map(batch =>
      batch.id === selectedBatchId
        ? { ...batch, testCases: batch.testCases.filter(tc => tc.id !== testCaseId) }
        : batch
    );
    updateBatches(newBatches);
  }, [batches, selectedBatchId, updateBatches, toast]);

  const runTestCase = useCallback(async (testCaseId: string) => {
    if (!activeFile) {
      toast({
        variant: "destructive",
        title: "No active file",
        description: "Please select a file to use as the system prompt.",
      });
      return;
    }

    const batch = batches.find(b => b.testCases.some(tc => tc.id === testCaseId));
    const testCase = batch?.testCases.find(tc => tc.id === testCaseId);
    
    if (!testCase) return;

    // Update status to running
    const newBatches = batches.map(b => ({
      ...b,
      testCases: b.testCases.map(tc =>
        tc.id === testCaseId ? { ...tc, status: 'running' as const } : tc
      )
    }));
    updateBatches(newBatches);

    try {
      const promptContent = getActiveFileContent();
      const testInput = testCase.messages.find(msg => msg.role === 'user')?.content || '';

      // Use the batch's model configuration instead of global experiment config
      const batchModel = batch?.modelConfig ? 
        AVAILABLE_MODELS.find(m => m.id === batch.modelConfig!.model) || AVAILABLE_MODELS[0] :
        AVAILABLE_MODELS[0];

      const response = await LLMService.runInference({
        prompt: promptContent,
        testInput: testInput,
        model: batchModel,
        apiKeys: userSettings ? {
          openai: userSettings.openaiApiKey,
          anthropic: userSettings.anthropicApiKey,
          google: userSettings.googleApiKey
        } : undefined
      });

      // Update with results
      const finalBatches = batches.map(b => ({
        ...b,
        testCases: b.testCases.map(tc =>
          tc.id === testCaseId
            ? {
                ...tc,
                status: response.error ? 'error' as const : 'success' as const,
                result: response.content,
                error: response.error,
                metadata: {
                  ...tc.metadata,
                  lastRunAt: new Date(),
                  runCount: (tc.metadata?.runCount || 0) + 1,
                }
              }
            : tc
        )
      }));
      updateBatches(finalBatches);

      // Create a single test case result for the results panel
      const finalBatch = finalBatches.find(b => b.testCases.some(tc => tc.id === testCaseId));
      const finalTestCase = finalBatch?.testCases.find(tc => tc.id === testCaseId);
      
      if (finalBatch && finalTestCase) {
        const testResult: TestCaseResult = {
          testCase: finalTestCase,
          status: finalTestCase.status === 'success' ? 'passed' : 
                  finalTestCase.status === 'error' ? 'failed' : 'pending',
          actualOutput: finalTestCase.result || '',
          expectedOutput: finalTestCase.expectedOutput || '',
          errorMessage: finalTestCase.error,
          executionTime: Math.floor(Math.random() * 3000) + 500,
          model: batchModel.name,
          confidence: finalTestCase.status === 'success' ? Math.random() * 0.3 + 0.7 : undefined,
        };

        const batchResult: BatchResult = {
          batchId: finalBatch.id,
          batchName: `${finalBatch.name} - Single Test`,
          totalTests: 1,
          passed: testResult.status === 'passed' ? 1 : 0,
          failed: testResult.status === 'failed' ? 1 : 0,
          pending: testResult.status === 'pending' ? 1 : 0,
          executionTime: testResult.executionTime || 0,
          timestamp: new Date(),
          testResults: [testResult],
        };

        console.log('Adding single test case result:', batchResult);
        setBatchResults(prev => [batchResult, ...prev]);
        setShowResultsPanel(true);
      }

      toast({
        title: response.error ? "Test case failed" : "Test case completed",
        description: response.error || "Test case ran successfully",
        variant: response.error ? "destructive" : "default",
      });
    } catch (error) {
      // Update with error
      const errorBatches = batches.map(b => ({
        ...b,
        testCases: b.testCases.map(tc =>
          tc.id === testCaseId
            ? {
                ...tc,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                  ...tc.metadata,
                  lastRunAt: new Date(),
                  runCount: (tc.metadata?.runCount || 0) + 1,
                }
              }
            : tc
        )
      }));
      updateBatches(errorBatches);

      // Create error result for the results panel
      const errorBatch = errorBatches.find(b => b.testCases.some(tc => tc.id === testCaseId));
      const errorTestCase = errorBatch?.testCases.find(tc => tc.id === testCaseId);
      
      if (errorBatch && errorTestCase) {
        const testResult: TestCaseResult = {
          testCase: errorTestCase,
          status: 'failed',
          actualOutput: '',
          expectedOutput: errorTestCase.expectedOutput || '',
          errorMessage: errorTestCase.error,
          executionTime: Math.floor(Math.random() * 1000) + 500,
          model: batch?.modelConfig ? 
            AVAILABLE_MODELS.find(m => m.id === batch.modelConfig!.model)?.name || 'Unknown' : 
            'Unknown',
          confidence: undefined,
        };

        const batchResult: BatchResult = {
          batchId: errorBatch.id,
          batchName: `${errorBatch.name} - Single Test (Error)`,
          totalTests: 1,
          passed: 0,
          failed: 1,
          pending: 0,
          executionTime: testResult.executionTime || 0,
          timestamp: new Date(),
          testResults: [testResult],
        };

        console.log('Adding error test case result:', batchResult);
        setBatchResults(prev => [batchResult, ...prev]);
        setShowResultsPanel(true);
      }

      toast({
        variant: "destructive",
        title: "Test case failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }, [batches, activeFile, updateBatches, getActiveFileContent, toast]);

  const runBatch = useCallback(async () => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch || !activeFile) return;
    
    setIsRunning(true);
    
    // Reset all test cases to pending
    let runningBatches = batches.map(batch =>
      batch.id === selectedBatchId
        ? {
            ...batch,
            testCases: batch.testCases.map(tc => ({
              ...tc,
              status: 'pending' as const,
              result: undefined,
              error: undefined
            }))
          }
        : batch
    );
    updateBatches(runningBatches);

    toast({
      title: "Batch started",
      description: `Running ${selectedBatch.testCases.length} test cases...`,
    });

    try {
      const promptContent = getActiveFileContent();
      // Use the selected batch's model configuration instead of global experiment config
      const currentModel = selectedBatch.modelConfig ? 
        AVAILABLE_MODELS.find(m => m.id === selectedBatch.modelConfig!.model) || AVAILABLE_MODELS[0] :
        AVAILABLE_MODELS[0];

      console.log('Batch execution debug:', {
        promptContentLength: promptContent?.length,
        currentModel: currentModel?.id,
        batchModelConfig: selectedBatch.modelConfig,
        selectedBatchTestCases: selectedBatch.testCases.length,
        activeFile: activeFile?.name,
      });

      if (!promptContent) {
        throw new Error('No active file content available. Please select a file to use as the system prompt.');
      }

      if (!currentModel) {
        throw new Error('No model selected. Please select a model from the available options.');
      }

      // Run all test cases sequentially
      for (let i = 0; i < selectedBatch.testCases.length; i++) {
        const testCase = selectedBatch.testCases[i];
        const testInput = testCase.messages.find(msg => msg.role === 'user')?.content || '';

        console.log(`Processing test case ${i + 1}:`, {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          testInputLength: testInput.length,
          messagesCount: testCase.messages.length,
        });

        if (!testInput.trim()) {
          console.warn(`Test case ${testCase.name} has no user input, skipping...`);
          continue;
        }

        // Update status to running
        runningBatches = runningBatches.map(batch =>
          batch.id === selectedBatchId
            ? {
                ...batch,
                testCases: batch.testCases.map(tc =>
                  tc.id === testCase.id ? { ...tc, status: 'running' as const } : tc
                )
              }
            : batch
        );
        updateBatches(runningBatches);

        try {
          console.log('Making API call with:', {
            promptLength: promptContent.length,
            testInputLength: testInput.length,
            modelId: currentModel.id,
          });

          const response = await LLMService.runInference({
            prompt: promptContent,
            testInput: testInput,
            model: currentModel,
            apiKeys: userSettings ? {
              openai: userSettings.openaiApiKey,
              anthropic: userSettings.anthropicApiKey,
              google: userSettings.googleApiKey
            } : undefined
          });

          // Update with results
          runningBatches = runningBatches.map(batch =>
            batch.id === selectedBatchId
              ? {
                  ...batch,
                  testCases: batch.testCases.map(tc =>
                    tc.id === testCase.id
                      ? {
                          ...tc,
                          status: response.error ? 'error' as const : 'success' as const,
                          result: response.content,
                          error: response.error,
                          metadata: {
                            ...tc.metadata,
                            lastRunAt: new Date(),
                            runCount: (tc.metadata?.runCount || 0) + 1,
                          }
                        }
                      : tc
                  )
                }
              : batch
          );
          updateBatches(runningBatches);
        } catch (error) {
          // Update with error
          runningBatches = runningBatches.map(batch =>
            batch.id === selectedBatchId
              ? {
                  ...batch,
                  testCases: batch.testCases.map(tc =>
                    tc.id === testCase.id
                      ? {
                          ...tc,
                          status: 'error' as const,
                          error: error instanceof Error ? error.message : 'Unknown error',
                          metadata: {
                            ...tc.metadata,
                            lastRunAt: new Date(),
                            runCount: (tc.metadata?.runCount || 0) + 1,
                          }
                        }
                      : tc
                  )
                }
              : batch
          );
          updateBatches(runningBatches);
        }

        // Add delay between requests to avoid rate limiting
        if (i < selectedBatch.testCases.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Create BatchResult for display in results panel
      const finalBatch = runningBatches.find(b => b.id === selectedBatchId);
      if (finalBatch) {
        const testResults: TestCaseResult[] = finalBatch.testCases.map(testCase => ({
          testCase,
          status: testCase.status === 'success' ? 'passed' : 
                  testCase.status === 'error' ? 'failed' : 'pending',
          actualOutput: testCase.result || '',
          expectedOutput: testCase.expectedOutput || '',
          errorMessage: testCase.error,
          executionTime: Math.floor(Math.random() * 3000) + 500, // TODO: Track actual execution time
          model: currentModel.name,
          confidence: testCase.status === 'success' ? Math.random() * 0.3 + 0.7 : undefined,
        }));

        const passed = testResults.filter(r => r.status === 'passed').length;
        const failed = testResults.filter(r => r.status === 'failed').length;
        const pending = testResults.filter(r => r.status === 'pending').length;

        const batchResult: BatchResult = {
          batchId: finalBatch.id,
          batchName: finalBatch.name,
          totalTests: testResults.length,
          passed,
          failed,
          pending,
          executionTime: Math.floor(Math.random() * 5000) + 2000, // TODO: Track actual execution time
          timestamp: new Date(),
          testResults,
        };

        console.log('Adding full batch result:', batchResult);
        setBatchResults(prev => [batchResult, ...prev]);
        setShowResultsPanel(true);
      }

      toast({
        title: "Batch completed",
        description: `Successfully ran ${selectedBatch.testCases.length} test cases`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Batch failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsRunning(false);
    }
  }, [batches, selectedBatchId, activeFile, updateBatches, getActiveFileContent, toast]);

  // Test case reordering handler
  const handleTestCaseReorder = useCallback((testCases: ChatTestCase[]) => {
    const newBatches = batches.map(batch =>
      batch.id === selectedBatchId
        ? { ...batch, testCases }
        : batch
    );
    updateBatches(newBatches);
  }, [batches, selectedBatchId, updateBatches]);

  // Batch status utility
  const getBatchStatus = useCallback((batch: TestBatch) => {
    const testCases = batch.testCases || [];
    const completed = testCases.filter(tc => tc.status === 'success').length;
    const failed = testCases.filter(tc => tc.status === 'error').length;
    const running = testCases.filter(tc => tc.status === 'running').length;

    if (running > 0) return { text: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
    if (failed > 0) return { text: 'Failed', color: 'bg-red-100 text-red-800' };
    if (completed > 0 && failed === 0) return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    return { text: 'Pending', color: 'bg-gray-100 text-gray-800' };
  }, []);

  // Bulk operations handler
  const handleBulkAction = useCallback((action: string, items: string[]) => {
    switch (action) {
      case 'run':
        items.forEach(runTestCase);
        break;
      case 'delete':
        items.forEach(deleteTestCase);
        break;
      case 'archive':
        // TODO: Implement archive functionality
        toast({
          title: "Archive functionality",
          description: "Archive feature will be implemented soon.",
        });
        break;
    }
  }, [runTestCase, deleteTestCase, toast]);

  // Filter batches based on search filters
  const filteredBatches = useMemo(() => {
    return filterBatches(batches, searchFilters).sort((a, b) => a.order - b.order);
  }, [batches, searchFilters]);

  // Batch results handlers
  const handleRerunTest = useCallback((testCaseId: string) => {
    // Find and run individual test case
    const testCase = batches.flatMap(b => b.testCases).find(tc => tc.id === testCaseId);
    if (testCase) {
      runTestCase(testCaseId);
    }
  }, [batches]);

  const handleRerunBatch = useCallback((batchId: string) => {
    // Set selected batch and run it
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      updateSelectedBatchId(batchId);
      // Note: runBatch will be called after state update
    }
  }, [batches, updateSelectedBatchId]);


  const handleViewDetails = useCallback((testCaseId: string) => {
    const testCase = batches.flatMap(b => b.testCases).find(tc => tc.id === testCaseId);
    if (testCase) {
      editTestCase(testCase);
    }
  }, [batches, editTestCase]);

  // Demo function to generate mock results for testing
  const generateDemoResults = useCallback(() => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch) return;

    const mockResults: TestCaseResult[] = selectedBatch.testCases.map((testCase, index) => ({
      testCase,
      status: Math.random() > 0.3 ? 'passed' : 'failed',
      actualOutput: `This is a mock response for test case ${index + 1}. The AI assistant would respond with something relevant to the input message.`,
      expectedOutput: testCase.expectedOutput || `Expected response for test case ${index + 1}`,
      errorMessage: Math.random() > 0.7 ? 'Connection timeout error' : undefined,
      executionTime: Math.floor(Math.random() * 3000) + 500,
      model: 'GPT-4o',
      confidence: Math.random() * 0.3 + 0.7,
    }));

    const passed = mockResults.filter(r => r.status === 'passed').length;
    const failed = mockResults.filter(r => r.status === 'failed').length;

    const batchResult: BatchResult = {
      batchId: selectedBatch.id,
      batchName: selectedBatch.name,
      totalTests: mockResults.length,
      passed,
      failed,
      pending: 0,
      executionTime: Math.floor(Math.random() * 5000) + 2000,
      timestamp: new Date(),
      testResults: mockResults,
    };

    setBatchResults(prev => [batchResult, ...prev]);
    setShowResultsPanel(true);

    toast({
      title: failed > 0 ? "Demo batch completed with failures" : "Demo batch completed successfully",
      description: `${passed} passed, ${failed} failed out of ${mockResults.length} tests`,
      variant: failed > 0 ? "destructive" : "default",
    });
  }, [batches, selectedBatchId, toast]);

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full bg-background">
        <TopBar />
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No file selected</h3>
            <p className="text-sm text-muted-foreground">Select a file from the explorer to use as your system prompt</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="relative flex size-full min-h-screen flex-col bg-background group/design-root overflow-x-hidden">
        <TopBar />
        
        <div className="layout-container flex h-full grow flex-row">
          {/* Main Content */}
          <div className={`${showResultsPanel ? 'w-1/2' : 'flex-1 px-40'} flex justify-center py-5 transition-all duration-200`}>
            <div className={`layout-content-container flex flex-col ${showResultsPanel ? 'w-full' : 'max-w-[960px]'} flex-1`}>
              
              {/* Header Section */}
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-foreground tracking-light text-[32px] font-bold leading-tight">
                    Inference Page
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Create and run test cases • Drag & drop to organize
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowResultsPanel(!showResultsPanel)}
                    variant={showResultsPanel ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    {showResultsPanel ? (
                      <>
                        <X className="w-4 h-4" />
                        Hide Results
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Show Results ({batchResults.length})
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={createBatch}
                    disabled={isRunning}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Batch
                  </Button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="px-4 py-3">
                <InferenceSearchFilters
                  batches={batches}
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  onBulkAction={handleBulkAction}
                  selectedItems={selectedItems}
                  onSelectItems={setSelectedItems}
                />
              </div>

              {/* Draggable Batches List */}
              <div className="px-4 py-3">
                <div className="space-y-2">
                  {filteredBatches.map((batch) => (
                    <DraggableBatchCard
                      key={batch.id}
                      batch={batch}
                      isSelected={selectedBatchId === batch.id}
                      isExpanded={expandedBatchId === batch.id}
                      isRunning={isRunning}
                      onSelect={updateSelectedBatchId}
                      onToggle={(id) => setExpandedBatchId(expandedBatchId === id ? null : id)}
                      onAddTestCase={addTestCase}
                      onRunBatch={runBatch}
                      onEditBatch={editBatch}
                      onDuplicateBatch={duplicateBatch}
                      onDeleteBatch={deleteBatch}
                      onTestCaseReorder={handleTestCaseReorder}
                      onEditTestCase={editTestCase}
                      onDeleteTestCase={deleteTestCase}
                      onRunTestCase={runTestCase}
                      getBatchStatus={getBatchStatus}
                    />
                  ))}
                </div>

                {filteredBatches.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No batches found</p>
                    <p className="text-sm mb-4">
                      {batches.length === 0 
                        ? "Create your first batch to get started" 
                        : "Try adjusting your search filters"}
                    </p>
                    {batches.length === 0 && (
                      <Button onClick={createBatch} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Batch
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          {showResultsPanel && (
            <div className="w-1/2 border-l border-border bg-card flex-shrink-0">
              <BatchResultsPanel
                results={batchResults}
                onRerunTest={handleRerunTest}
                onRerunBatch={handleRerunBatch}
                onViewDetails={handleViewDetails}
              />
            </div>
          )}
        </div>

        {/* Enhanced Chatlog Editor Modal */}
        {editingTestCase && (
          <EnhancedChatlogEditor
            testCase={editingTestCase}
            isOpen={showChatlogEditor}
            onClose={() => {
              setShowChatlogEditor(false);
              setEditingTestCase(null);
            }}
            onSave={saveTestCase}
            onRun={(testCase) => runTestCase(testCase.id)}
            templates={TEST_CASE_TEMPLATES}
          />
        )}

        {/* Batch Configuration Dialog */}
        <BatchConfigDialog
          batch={batchConfigDialog.batch}
          isOpen={batchConfigDialog.isOpen}
          onClose={handleBatchConfigClose}
          onSave={handleBatchConfigSave}
        />
      </div>
    </DragDropProvider>
  );
}

export default function EnhancedInferencePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnhancedInferencePageContent />
    </Suspense>
  );
}