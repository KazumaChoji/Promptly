"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { 
  PlusIcon as Plus, 
  PlayIcon as Play, 
  TrashIcon as Trash2, 
  DocumentDuplicateIcon as Copy,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ClockIcon as Clock,
  PhotoIcon as ImageIcon,
  DocumentTextIcon as FileText,
  FolderPlusIcon as FolderPlus,
  FolderIcon as Folder,
  XMarkIcon as X,
  ArrowUpTrayIcon as Upload,
  PencilIcon as Edit,
  ArrowDownTrayIcon as Save,
  ChatBubbleLeftRightIcon as MessageSquare,
  ArrowDownTrayIcon as Download,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  Cog6ToothIcon as Settings,
  CpuChipIcon as Bot,
  UserIcon as User,
  ArrowPathIcon as Loader2
} from "@heroicons/react/24/outline";
import { useDesktopStore } from "../../lib/desktop-store";
import { ChatTestCaseEditor, type ChatMessage, type ChatTestCase } from "./chat-test-case";
import { AVAILABLE_MODELS } from '../../lib/llm-service';

// Use ChatTestCase as TestCase for compatibility
type TestCase = ChatTestCase;

interface TestBatch {
  id: string;
  name: string;
  description?: string;
  testCases: TestCase[];
  created: Date;
}

export function BatchTab() {
  const { getActiveFileContent, experimentConfig } = useDesktopStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [batches, setBatches] = useState<TestBatch[]>([
    {
      id: '1',
      name: 'Default Batch',
      description: 'Initial test batch',
      testCases: [
        {
          id: '1',
          name: 'Test Case 1',
          messages: [
            {
              id: 'msg_2',
              role: 'user',
              content: 'Hello, how are you?'
            }
          ],
          status: 'pending'
        }
      ],
      created: new Date()
    }
  ]);
  
  const [selectedBatchId, setSelectedBatchId] = useState('1');
  const [isRunning, setIsRunning] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState('');

  // Add batch job management state
  const [activeBatchJobs, setActiveBatchJobs] = useState<Map<string, {
    batch_id: string;
    provider: string;
    status: string;
    created_at: string;
    request_counts?: any;
  }>>(new Map());

  // Store active polling cleanup functions
  const pollingCleanupRef = useRef<Map<string, () => void>>(new Map());

  // Add results visibility toggle
  const [showResults, setShowResults] = useState(true);

  // Add test case viewer modal state
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);
  const [viewingTestCaseIndex, setViewingTestCaseIndex] = useState<number>(-1);

  // Migration function to convert old input-based test cases to message-based
  const migrateTestCases = (batches: any[]): TestBatch[] => {
    return batches.map(batch => ({
      ...batch,
      created: new Date(batch.created),
      testCases: batch.testCases.map((testCase: any) => {
        // Check if this is an old format test case (has inputs instead of messages)
        if ('inputs' in testCase && !testCase.messages) {
          // Convert inputs to messages - only user messages, no system
          const messages: ChatMessage[] = [];

          // Convert text inputs to user messages
          if (testCase.inputs && Array.isArray(testCase.inputs)) {
            testCase.inputs.forEach((input: any, index: number) => {
              if (input.type === 'text' && input.content) {
                messages.push({
                  id: `msg_${Date.now()}_user_${index}`,
                  role: 'user',
                  content: input.content
                });
              } else if (input.type === 'image' && input.content) {
                messages.push({
                  id: `msg_${Date.now()}_user_${index}`,
                  role: 'user',
                  content: '',
                  images: [{
                    data: input.content,
                    name: input.name || 'image.png'
                  }]
                });
              }
            });
          }

          // If no user messages were created, add an empty one
          if (messages.length === 0) {
            messages.push({
              id: `msg_${Date.now()}_user`,
              role: 'user',
              content: ''
            });
          }

          return {
            id: testCase.id,
            name: testCase.name,
            messages,
            expectedOutput: testCase.expectedOutput,
            status: testCase.status || 'pending',
            result: testCase.result,
            error: testCase.error
          };
        }
        
        // Already in new format, ensure messages exist
        const filteredMessages = (testCase.messages || []);
        if (filteredMessages.length === 0) {
          filteredMessages.push({
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content: ''
          });
        }
        
        return {
          ...testCase,
          messages: filteredMessages
        };
      })
    }));
  };

  // Load batches from localStorage on component mount
  useEffect(() => {
    const savedBatches = localStorage.getItem('studio-batches');
    const savedSelectedBatchId = localStorage.getItem('studio-selected-batch-id');
    const savedBatchJobs = localStorage.getItem('studio-batch-jobs');
    
    if (savedBatches) {
      try {
        const parsedBatches = JSON.parse(savedBatches);
        // Migrate old format to new format
        const migratedBatches = migrateTestCases(parsedBatches);
        setBatches(migratedBatches);
        
        // Save migrated data back to localStorage if changes were made
        const originalString = JSON.stringify(parsedBatches);
        const migratedString = JSON.stringify(migratedBatches.map(b => ({ ...b, created: b.created.toISOString() })));
        if (originalString !== migratedString) {
          localStorage.setItem('studio-batches', migratedString);
        }
        
        // Set selected batch if it exists in the loaded batches
        if (savedSelectedBatchId && migratedBatches.some((b: TestBatch) => b.id === savedSelectedBatchId)) {
          setSelectedBatchId(savedSelectedBatchId);
        } else if (migratedBatches.length > 0) {
          setSelectedBatchId(migratedBatches[0].id);
        }
      } catch (error) {
        console.error('Failed to load batches from localStorage:', error);
        // Keep default batches if loading fails
      }
    }

    if (savedBatchJobs) {
      try {
        const parsedJobs = JSON.parse(savedBatchJobs);
        setActiveBatchJobs(new Map(Object.entries(parsedJobs)));
      } catch (error) {
        console.error('Failed to load batch jobs from localStorage:', error);
      }
    }
  }, []);

  // Save batches to localStorage whenever batches change
  const saveBatchesToStorage = (newBatches: TestBatch[]) => {
    try {
      localStorage.setItem('studio-batches', JSON.stringify(newBatches));
    } catch (error) {
      console.error('Failed to save batches to localStorage:', error);
    }
  };

  // Save selected batch ID to localStorage
  const saveSelectedBatchToStorage = (batchId: string) => {
    try {
      localStorage.setItem('studio-selected-batch-id', batchId);
    } catch (error) {
      console.error('Failed to save selected batch to localStorage:', error);
    }
  };

  // Save batch jobs to localStorage
  const saveBatchJobsToStorage = (jobs: Map<string, any>) => {
    try {
      const jobsObject = Object.fromEntries(jobs);
      localStorage.setItem('studio-batch-jobs', JSON.stringify(jobsObject));
    } catch (error) {
      console.error('Failed to save batch jobs to localStorage:', error);
    }
  };

  // Update setBatches calls to also save to localStorage
  const updateBatches = (newBatches: TestBatch[]) => {
    setBatches(newBatches);
    saveBatchesToStorage(newBatches);
  };

  // Update setSelectedBatchId to also save to localStorage
  const updateSelectedBatchId = (batchId: string) => {
    setSelectedBatchId(batchId);
    saveSelectedBatchToStorage(batchId);
  };

  // Update batch jobs and save to localStorage
  const updateActiveBatchJobs = (newJobs: Map<string, any>) => {
    setActiveBatchJobs(newJobs);
    saveBatchJobsToStorage(newJobs);
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const createBatch = () => {
    if (!newBatchName.trim()) return;
    
    const newBatch: TestBatch = {
      id: Date.now().toString(),
      name: newBatchName,
      testCases: [{
        id: Date.now().toString() + '_1',
        name: 'Test Case 1',
        messages: [
          {
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content: ''
          }
        ],
        status: 'pending'
      }],
      created: new Date()
    };
    
    updateBatches([...batches, newBatch]);
    updateSelectedBatchId(newBatch.id);
    setNewBatchName('');
    setShowNewBatchForm(false);
  };

  const updateBatchName = (batchId: string, newName: string) => {
    if (!newName.trim()) return;
    
    updateBatches(batches.map(batch => 
      batch.id === batchId 
        ? { ...batch, name: newName.trim() }
        : batch
    ));
    
    setEditingBatchId(null);
    setEditingBatchName('');
  };

  const startEditingBatchName = (batchId: string, currentName: string) => {
    setEditingBatchId(batchId);
    setEditingBatchName(currentName);
  };

  const cancelEditingBatchName = () => {
    setEditingBatchId(null);
    setEditingBatchName('');
  };

  const deleteBatch = (batchId: string) => {
    if (batches.length === 1) return; // Keep at least one batch
    
    const newBatches = batches.filter(b => b.id !== batchId);
    updateBatches(newBatches);
    
    if (selectedBatchId === batchId) {
      updateSelectedBatchId(newBatches[0].id);
    }
  };

  const addTestCase = () => {
    if (!selectedBatch) return;
    
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: `Test Case ${selectedBatch.testCases.length + 1}`,
      messages: [
        {
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content: ''
        }
      ],
      status: 'pending'
    };
    
    updateBatches(batches.map(batch => 
      batch.id === selectedBatchId 
        ? { ...batch, testCases: [newTestCase, ...batch.testCases] }
        : batch
    ));
  };

  const removeTestCase = (testCaseId: string) => {
    if (!selectedBatch || selectedBatch.testCases.length === 1) return;
    
    updateBatches(batches.map(batch => 
      batch.id === selectedBatchId 
        ? { ...batch, testCases: batch.testCases.filter(tc => tc.id !== testCaseId) }
        : batch
    ));
  };

  const updateTestCase = (testCaseId: string, updates: Partial<TestCase>) => {
    updateBatches(batches.map(batch => 
      batch.id === selectedBatchId 
        ? { 
            ...batch, 
            testCases: batch.testCases.map(tc => 
              tc.id === testCaseId ? { ...tc, ...updates } : tc
            )
          }
        : batch
    ));
    
    // Update editing test case if it's the one being edited
    if (editingTestCase && editingTestCase.id === testCaseId) {
      setEditingTestCase({ ...editingTestCase, ...updates });
    }
  };

  const openEditDialog = (testCase: TestCase) => {
    setEditingTestCase({ ...testCase });
    setIsEditDialogOpen(true);
  };

  const saveTestCase = () => {
    if (!editingTestCase) return;
    
    updateTestCase(editingTestCase.id, editingTestCase);
    setIsEditDialogOpen(false);
    setEditingTestCase(null);
  };

  // Message handling functions for editing test cases
  const addMessageToEditingCase = (role: 'assistant' | 'user') => {
    if (!editingTestCase) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role,
      content: '',
      images: role === 'user' ? [] : undefined
    };

    setEditingTestCase({
      ...editingTestCase,
      messages: [...editingTestCase.messages, newMessage]
    });
  };

  const removeMessageFromEditingCase = (messageIndex: number) => {
    if (!editingTestCase || editingTestCase.messages.length === 1) return;

    setEditingTestCase({
      ...editingTestCase,
      messages: editingTestCase.messages.filter((_, index) => index !== messageIndex)
    });
  };

  const updateMessageInEditingCase = (messageIndex: number, updates: Partial<ChatMessage>) => {
    if (!editingTestCase) return;

    const updatedMessages = editingTestCase.messages.map((message, index) => 
      index === messageIndex ? { ...message, ...updates } : message
    );

    setEditingTestCase({
      ...editingTestCase,
      messages: updatedMessages
    });
  };

  const handleImageUploadInEditingCase = (messageIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!editingTestCase) return;
      
      const message = editingTestCase.messages[messageIndex];
      const updatedImages = [...(message.images || []), { data: result, name: file.name }];
      
      updateMessageInEditingCase(messageIndex, { images: updatedImages });
    };
    reader.readAsDataURL(file);
  };

  const duplicateTestCase = (testCaseId: string) => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch) return;

    const testCase = selectedBatch.testCases.find(tc => tc.id === testCaseId);
    if (!testCase) return;

    const newTestCase: TestCase = {
      ...testCase,
      id: Date.now().toString(),
      name: `${testCase.name} (Copy)`,
      status: 'pending',
      result: undefined,
      error: undefined
    };

    updateBatches(batches.map(batch => 
      batch.id === selectedBatchId 
        ? { ...batch, testCases: [...batch.testCases, newTestCase] }
        : batch
    ));
  };

  // Open test case viewer
  const openTestCaseViewer = (testCase: TestCase) => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch) return;

    const index = selectedBatch.testCases.findIndex(tc => tc.id === testCase.id);
    setViewingTestCase(testCase);
    setViewingTestCaseIndex(index);
  };

  // Close test case viewer
  const closeTestCaseViewer = () => {
    setViewingTestCase(null);
    setViewingTestCaseIndex(-1);
  };

  // Navigate between test cases
  const navigateTestCase = (direction: 'prev' | 'next') => {
    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch || viewingTestCaseIndex === -1) return;

    let newIndex = viewingTestCaseIndex;
    if (direction === 'prev' && viewingTestCaseIndex > 0) {
      newIndex = viewingTestCaseIndex - 1;
    } else if (direction === 'next' && viewingTestCaseIndex < selectedBatch.testCases.length - 1) {
      newIndex = viewingTestCaseIndex + 1;
    }

    if (newIndex !== viewingTestCaseIndex) {
      setViewingTestCase(selectedBatch.testCases[newIndex]);
      setViewingTestCaseIndex(newIndex);
    }
  };

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!viewingTestCase) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateTestCase('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateTestCase('next');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeTestCaseViewer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewingTestCase, viewingTestCaseIndex]);



  // Function to run the selected batch (complete workflow)
  const runBatchJob = async () => {
    if (!selectedBatch) return;
    
    const promptContent = getActiveFileContent();
    if (!promptContent) {
      alert('No prompt content found. Please make sure you have an active file.');
      return;
    }

    try {
      setIsRunning(true);

      // Reset all test cases to pending
      updateBatches(batches.map(batch => 
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
      ));

      // Update all test cases
      const updatedTestCases = selectedBatch.testCases.map(testCase => ({
        ...testCase
      }));

      // Update the batch
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { ...batch, testCases: updatedTestCases }
          : batch
      ));

      // Prepare batch requests for the selected batch only
      const batchRequests = updatedTestCases
        .filter(testCase => testCase.messages.some(message => message.content.trim()))
        .map(testCase => {
          // Use the prompt content from the text editor
          const systemPrompt = promptContent;
          
          // Combine user messages as test input
          const userMessages = testCase.messages
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .join('\n');

          return {
            custom_id: testCase.id,
            prompt: systemPrompt,
            testInput: userMessages,
            max_tokens: 4000
          };
        });

      if (batchRequests.length === 0) {
        throw new Error('No valid test cases found with content');
      }

      // Update test cases to show they're being processed
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { 
              ...batch, 
              testCases: updatedTestCases.map(tc => ({ 
                ...tc, 
                status: 'running' as const, 
                result: 'Submitting batch job...',
                error: undefined 
              }))
            }
          : batch
      ));

      // Find the model to get its tier information
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === experimentConfig.model);
      if (!modelInfo) {
        throw new Error(`Model ${experimentConfig.model} not found`);
      }

      // Submit batch job
      const response = await fetch('/api/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: modelInfo.provider,
          model: experimentConfig.model,
          temperature: experimentConfig.temperature,
          max_tokens: experimentConfig.maxTokens,
          requests: batchRequests
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit batch job');
      }

      const batchData = await response.json();

      // Store batch job info
      const newJobs = new Map(activeBatchJobs);
      newJobs.set(selectedBatch.id, {
        batch_id: batchData.batch_id,
        provider: batchData.provider,
        status: batchData.status,
        created_at: batchData.created_at,
        request_counts: batchData.request_counts
      });
      updateActiveBatchJobs(newJobs);

      // Update test cases to show batch job is submitted
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { 
              ...batch, 
              testCases: updatedTestCases.map(tc => ({ 
                ...tc, 
                status: 'running' as const, 
                result: `Batch processing... (Job ID: ${batchData.batch_id})`,
                error: undefined 
              }))
            }
          : batch
      ));

      // Start polling for completion
      const cleanupPoll = await pollBatchCompletion(batchData.batch_id, batchData.provider);
      if (cleanupPoll) {
        pollingCleanupRef.current.set(selectedBatch.id, cleanupPoll);
      }

    } catch (error) {
      console.error('Batch job error:', error);
      
      // Update test cases to show error
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { 
              ...batch, 
              testCases: batch.testCases.map(tc => ({ 
                ...tc, 
                status: 'error' as const, 
                result: undefined,
                error: error instanceof Error ? error.message : 'Unknown error'
              }))
            }
          : batch
      ));
      
      alert(`Failed to run batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Function to poll for batch completion and automatically retrieve results
  const pollBatchCompletion = async (batchId: string, provider: string) => {
    const maxAttempts = 60; // Poll for up to 1 hour (every minute)
    let attempts = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts} for batch ${batchId}`);
        
        const response = await fetch('/api/llm/batch/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: provider,
            batch_id: batchId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to check batch status');
        }

        const statusData = await response.json();
        console.log(`Batch status response:`, statusData);
        
        // Find the correct batch ID to update (use the batch that has this job)
        let targetBatchId = selectedBatchId;
        for (const [bId, job] of Array.from(activeBatchJobs.entries())) {
          if (job.batch_id === batchId) {
            targetBatchId = bId;
            break;
          }
        }

        // Update batch job status
        const batchJob = activeBatchJobs.get(targetBatchId);
        if (batchJob) {
          const newJobs = new Map(activeBatchJobs);
          newJobs.set(targetBatchId, {
            ...batchJob,
            status: statusData.status,
            request_counts: statusData.request_counts
          });
          updateActiveBatchJobs(newJobs);
        }

        // Check if batch is completed
        const completedStatuses = ['completed', 'ended', 'failed', 'expired', 'cancelled'];
        const isCompleted = completedStatuses.includes(statusData.status.toLowerCase());

        console.log(`Batch ${batchId} status: ${statusData.status}, isCompleted: ${isCompleted}`);

        if (isCompleted) {
          // Clean up polling for this batch
          pollingCleanupRef.current.delete(targetBatchId);
          
          if (statusData.status.toLowerCase() === 'completed' || statusData.status.toLowerCase() === 'ended') {
            // Retrieve results
            console.log('Batch completed, retrieving results...');
            await retrieveBatchResults(batchId, provider, statusData);
          } else {
            // Handle failed/expired/cancelled batches
            console.log(`Batch ${statusData.status.toLowerCase()}, updating to error state`);
            updateBatches(batches.map(batch => 
              batch.id === targetBatchId 
                ? { 
                    ...batch, 
                    testCases: batch.testCases.map(tc => ({ 
                      ...tc, 
                      status: 'error' as const, 
                      result: undefined,
                      error: `Batch ${statusData.status.toLowerCase()}`
                    }))
                  }
                : batch
            ));
            
            // Remove failed job from active jobs
            const finalJobs = new Map(activeBatchJobs);
            finalJobs.delete(targetBatchId);
            updateActiveBatchJobs(finalJobs);
          }
          return; // Stop polling
        }

        // Continue polling if not completed and haven't exceeded max attempts
        if (attempts < maxAttempts) {
          // Update status message with current attempt count
          updateBatches(batches.map(batch => 
            batch.id === targetBatchId 
              ? { 
                  ...batch, 
                  testCases: batch.testCases.map(tc => ({ 
                    ...tc, 
                    result: `Batch ${statusData.status}... (${attempts}/${maxAttempts} checks)`
                  }))
                }
              : batch
          ));

          // Wait 60 seconds before next poll
          console.log(`Scheduling next poll in 60 seconds (attempt ${attempts + 1}/${maxAttempts})`);
          timeoutId = setTimeout(poll, 60000);
        } else {
          throw new Error('Batch polling timeout - please check status manually');
        }

      } catch (error) {
        console.error('Polling error:', error);
        // Find the correct batch ID to update
        let targetBatchId = selectedBatchId;
        for (const [bId, job] of Array.from(activeBatchJobs.entries())) {
          if (job.batch_id === batchId) {
            targetBatchId = bId;
            break;
          }
        }
        
        updateBatches(batches.map(batch => 
          batch.id === targetBatchId 
            ? { 
                ...batch, 
                testCases: batch.testCases.map(tc => ({ 
                  ...tc, 
                  status: 'error' as const, 
                  result: undefined,
                  error: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                }))
              }
            : batch
        ));
      }
    };

    // Start polling immediately for debugging, then wait normal intervals
    console.log(`Starting batch polling for ${batchId} with ${provider}`);
    timeoutId = setTimeout(poll, 10000); // Wait 10 seconds before first status check
    
    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log(`Cancelled polling for batch ${batchId}`);
      }
    };
  };

  // Function to check batch job status
  const checkBatchStatus = async (batchId: string) => {
    const batchJob = activeBatchJobs.get(selectedBatchId);
    if (!batchJob) return;

    try {
      const response = await fetch('/api/llm/batch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: batchJob.provider,
          batch_id: batchJob.batch_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check batch status');
      }

      const statusData = await response.json();

      // Update batch job status
      const newJobs = new Map(activeBatchJobs);
      newJobs.set(selectedBatchId, {
        ...batchJob,
        status: statusData.status,
        request_counts: statusData.request_counts
      });
      updateActiveBatchJobs(newJobs);

      // Check if batch is completed and handle accordingly
      const completedStatuses = ['completed', 'ended', 'failed', 'expired', 'cancelled'];
      const isCompleted = completedStatuses.includes(statusData.status.toLowerCase());

      console.log('Batch status check:', {
        batchId: batchJob.batch_id,
        status: statusData.status,
        isCompleted,
        outputFileId: statusData.output_file_id,
        provider: batchJob.provider
      });

      if (isCompleted) {
        if (statusData.status.toLowerCase() === 'completed' || statusData.status.toLowerCase() === 'ended') {
          // Retrieve results for completed batches
          console.log('Attempting to retrieve batch results...');
          await retrieveBatchResults(batchJob.batch_id, batchJob.provider, statusData);
        } else {
          // Handle failed/expired/cancelled batches
          updateBatches(batches.map(batch => 
            batch.id === selectedBatchId 
              ? { 
                  ...batch, 
                  testCases: batch.testCases.map(tc => ({ 
                    ...tc, 
                    status: 'error' as const, 
                    result: undefined,
                    error: `Batch ${statusData.status.toLowerCase()}`
                  }))
                }
              : batch
          ));

          // Remove failed job from active jobs
          const finalJobs = new Map(activeBatchJobs);
          finalJobs.delete(selectedBatchId);
          updateActiveBatchJobs(finalJobs);
        }
      }

      return statusData;
    } catch (error) {
      console.error('Failed to check batch status:', error);
      return null;
    }
  };

  // Function to retrieve batch results
  const retrieveBatchResults = async (batchId?: string, provider?: string, statusData?: any) => {
    // Use provided parameters or fallback to active batch job
    const batchJob = activeBatchJobs.get(selectedBatchId);
    const finalBatchId = batchId || batchJob?.batch_id;
    const finalProvider = provider || batchJob?.provider;
    
    console.log('retrieveBatchResults called with:', {
      batchId,
      provider,
      statusData,
      finalBatchId,
      finalProvider,
      outputFileId: statusData?.output_file_id
    });
    
    if (!finalBatchId || !finalProvider) {
      console.error('No batch job information available');
      return;
    }

    try {
      const requestBody = {
        provider: finalProvider,
        batch_id: finalBatchId,
        ...(finalProvider === 'openai' && { output_file_id: statusData?.output_file_id }),
        ...(finalProvider === 'anthropic' && { results_url: statusData?.results_url })
      };
      
      console.log('Sending request to /api/llm/batch/results with:', requestBody);

      const response = await fetch('/api/llm/batch/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Batch results API error:', errorData);
        throw new Error(errorData.error || 'Failed to retrieve batch results');
      }

      const resultsData = await response.json();
      console.log('Batch results received:', resultsData);

      // Update test cases with results
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { 
              ...batch, 
              testCases: batch.testCases.map(tc => {
                const result = resultsData.results.find((r: any) => r.custom_id === tc.id);
                if (result) {
                  return {
                    ...tc,
                    status: result.status === 'success' || result.status === 'succeeded' ? 'success' : 'error',
                    result: result.content || 'No content returned',
                    error: result.error || undefined
                  };
                }
                return tc;
              })
            }
          : batch
      ));

      // Remove completed job from active jobs
      const newJobs = new Map(activeBatchJobs);
      newJobs.delete(selectedBatchId);
      updateActiveBatchJobs(newJobs);
      
      // Clean up any polling for this batch
      pollingCleanupRef.current.delete(selectedBatchId);

      console.log(`Batch completed! ${resultsData.success_count} successful, ${resultsData.error_count} errors.`);

    } catch (error) {
      console.error('Failed to retrieve batch results:', error);
      
      // Update test cases to show error
      updateBatches(batches.map(batch => 
        batch.id === selectedBatchId 
          ? { 
              ...batch, 
              testCases: batch.testCases.map(tc => ({ 
                ...tc, 
                status: 'error' as const, 
                result: undefined,
                error: `Failed to retrieve results: ${error instanceof Error ? error.message : 'Unknown error'}`
              }))
            }
          : batch
      ));
    }
  };

  const getStatusIcon = (status?: TestCase['status']) => {
    switch (status) {
      case 'running':
        return (
          <div className="relative">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <div className="absolute inset-0 rounded-full border border-blue-200 animate-pulse" />
          </div>
        );
      case 'success':
        return (
          <div className="relative">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div className="absolute -inset-1 rounded-full bg-green-100 animate-ping opacity-20" />
          </div>
        );
      case 'error':
        return (
          <div className="relative">
            <XCircle className="w-4 h-4 text-red-500" />
            <div className="absolute -inset-1 rounded-full bg-red-100 animate-pulse opacity-30" />
          </div>
        );
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: TestCase['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Running</Badge>;
      case 'success':
        return <Badge variant="outline" className="text-green-600 border-green-600">Success</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-600">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Pending</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* Batch Selection Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Folder className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedBatchId} onValueChange={updateSelectedBatchId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {batches.map(batch => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {batches.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteBatch(selectedBatchId)}
              className="h-8 w-8 p-0 text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewBatchForm(!showNewBatchForm)}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* New Batch Form */}
      {showNewBatchForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Batch name..."
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBatch()}
            />
            <div className="flex gap-2">
              <Button onClick={createBatch} size="sm" disabled={!newBatchName.trim()}>
                Create
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewBatchForm(false);
                  setNewBatchName('');
                }} 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedBatch && (
        <div className="flex flex-col flex-1 overflow-hidden gap-4">
          {/* Batch Info & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {editingBatchId === selectedBatch.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingBatchName}
                    onChange={(e) => setEditingBatchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateBatchName(selectedBatch.id, editingBatchName);
                      } else if (e.key === 'Escape') {
                        cancelEditingBatchName();
                      }
                    }}
                    className="text-sm font-medium h-8 max-w-xs"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateBatchName(selectedBatch.id, editingBatchName)}
                    disabled={!editingBatchName.trim()}
                    className="h-8 w-8 p-0"
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditingBatchName}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">{selectedBatch.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditingBatchName(selectedBatch.id, selectedBatch.name)}
                    disabled={isRunning}
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedBatch.testCases.length} test cases
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {/* First row - Test management and sync */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTestCase}
                  disabled={isRunning}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Test
                </Button>

              </div>
              
              {/* Second row - Batch execution and status */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={runBatchJob}
                  disabled={isRunning || selectedBatch.testCases.length === 0}
                  size="sm"
                  className={isRunning ? "animate-pulse" : ""}
                >
                  {isRunning ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Running Batch...</span>
                    </div>
                  ) : (
                    <>
                      Run Batch
                    </>
                  )}
                </Button>
                {activeBatchJobs.has(selectedBatchId) && (
                  <Button
                    onClick={() => checkBatchStatus(selectedBatchId)}
                    size="sm"
                    variant="outline"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Batch Job Status */}
          {activeBatchJobs.has(selectedBatchId) && (() => {
                         const batchJob = activeBatchJobs.get(selectedBatchId);
             const status = batchJob?.status?.toLowerCase() || '';
             const isProcessing = ['validating', 'in_progress', 'finalizing'].includes(status);
             const isCompleted = ['completed', 'ended'].includes(status);
             const isError = ['failed', 'expired', 'cancelled'].includes(status);
            
                         return (
               <Card className={`border-l-4 ${
                 isCompleted ? 'border-l-success bg-success/5' :
                 isError ? 'border-l-destructive bg-destructive/5' :
                 'border-l-primary bg-primary/5'
               }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                     {isCompleted && <CheckCircle className="w-4 h-4 text-success" />}
                     {isError && <XCircle className="w-4 h-4 text-destructive" />}
                     {!isProcessing && !isCompleted && !isError && <Clock className="w-4 h-4 text-primary" />}
                    
                                         <span className={`text-sm font-medium ${
                       isCompleted ? 'text-success' :
                       isError ? 'text-destructive' :
                       'text-primary'
                     }`}>
                      {isProcessing ? 'Processing Batch' :
                       isCompleted ? 'Batch Completed' :
                       isError ? 'Batch Failed' :
                       'Batch Submitted'}
                    </span>
                    
                                         <div className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                       isCompleted ? 'bg-success/20 text-success' :
                       isError ? 'bg-destructive/20 text-destructive' :
                       'bg-primary/20 text-primary'
                     }`}>
                      {batchJob?.status}
                    </div>
                  </div>
                  
                                     <div className="grid grid-cols-2 gap-4 text-xs">
                     <div>
                       <div className="font-medium text-muted-foreground">Job ID</div>
                       <div className="text-foreground font-mono">
                         {batchJob?.batch_id?.substring(0, 16)}...
                       </div>
                     </div>
                     <div>
                       <div className="font-medium text-muted-foreground">Provider</div>
                       <div className="text-foreground capitalize">
                         {batchJob?.provider}
                       </div>
                     </div>
                   </div>
                  
                                     {batchJob?.request_counts && (
                     <div className="mt-3 pt-3 border-t border-border">
                       <div className="text-xs font-medium text-muted-foreground mb-2">Progress</div>
                       <div className="space-y-2">
                         {/* Progress Bar */}
                         <div className="w-full bg-muted rounded-full h-2">
                           <div 
                             className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                             style={{ 
                               width: `${batchJob.request_counts.total > 0 ? 
                                 ((batchJob.request_counts.completed || 0) + (batchJob.request_counts.failed || 0)) / batchJob.request_counts.total * 100 : 0}%` 
                             }}
                           />
                         </div>
                         
                         <div className="flex gap-3 text-xs">
                           <span className="text-success">✓ {batchJob.request_counts.completed || 0}</span>
                           <span className="text-destructive">✗ {batchJob.request_counts.failed || 0}</span>
                           <span className="text-muted-foreground">Total: {batchJob.request_counts.total || 0}</span>
                           <span className="text-primary ml-auto">
                             {batchJob.request_counts.total > 0 ? 
                               Math.round(((batchJob.request_counts.completed || 0) + (batchJob.request_counts.failed || 0)) / batchJob.request_counts.total * 100) : 0}%
                           </span>
                         </div>
                       </div>
                     </div>
                   )}
                </CardContent>
              </Card>
            );
          })()}

          <Separator />

          {/* Results Toggle */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Test Cases ({selectedBatch.testCases.length})</h4>
            <div className="flex items-center gap-2">
              {showResults ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-xs text-muted-foreground">
                {showResults ? 'Show Results' : 'Hide Results'}
              </span>
              <Switch
                checked={showResults}
                onCheckedChange={setShowResults}
              />
            </div>
          </div>

          {/* Test Cases - Compact View */}
          <div className="space-y-3">
            {selectedBatch.testCases.map((testCase) => (
              <Card 
                key={testCase.id} 
                className="border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openTestCaseViewer(testCase)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(testCase.status)}
                      <h5 className="font-medium text-sm">{testCase.name}</h5>
                      {getStatusBadge(testCase.status)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(testCase);
                        }}
                        disabled={isRunning}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTestCase(testCase.id);
                        }}
                        disabled={isRunning}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTestCase(testCase.id);
                        }}
                        disabled={isRunning || selectedBatch.testCases.length === 1}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Chat Messages Summary */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium">Messages:</span>
                      <div className="flex gap-1">
                        {testCase.messages.map((message, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {message.role === 'user' ? (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                User
                                {message.images && message.images.length > 0 && (
                                  <span className="ml-1">({message.images.length} img)</span>
                                )}
                              </>
                            ) : (
                              <>
                                <Bot className="w-3 h-3 mr-1" />
                                Assistant
                              </>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Preview first user message */}
                    {(() => {
                      const firstUserMessage = testCase.messages.find(m => m.role === 'user' && m.content);
                      return firstUserMessage && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded truncate">
                          {firstUserMessage.content.substring(0, 100)}
                          {firstUserMessage.content.length > 100 && '...'}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Result */}
                  {showResults && testCase.result && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 text-success" />
                        <span className="text-xs font-medium">Result:</span>
                      </div>
                      <div className="bg-success/5 border border-success/20 p-3 rounded-md text-xs text-foreground">
                        {testCase.result}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {showResults && testCase.error && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-destructive" />
                        <span className="text-xs font-medium text-destructive">Error:</span>
                      </div>
                      <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md text-xs text-destructive">
                        {testCase.error}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedBatch.testCases.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No test cases yet</p>
              <p className="text-xs">Add test cases to batch test your prompts</p>
            </div>
          )}
        </div>
      )}

      {/* Test Case Viewer Modal */}
      {viewingTestCase && (
        <Dialog open={!!viewingTestCase} onOpenChange={closeTestCaseViewer}>
          <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(viewingTestCase.status)}
                    <DialogTitle className="text-lg font-semibold">
                      {viewingTestCase.name}
                    </DialogTitle>
                    {getStatusBadge(viewingTestCase.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {viewingTestCaseIndex + 1} of {selectedBatch?.testCases.length || 0}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateTestCase('prev')}
                      disabled={viewingTestCaseIndex <= 0}
                      className="h-8 w-8 p-0"
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateTestCase('next')}
                      disabled={viewingTestCaseIndex >= (selectedBatch?.testCases.length || 0) - 1}
                      className="h-8 w-8 p-0"
                    >
                      →
                    </Button>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              {/* Conversation & Response */}
              <div className="flex flex-col gap-4 overflow-hidden">
                <div className="flex-shrink-0">
                  <h3 className="text-sm font-medium mb-2">Conversation & Response</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {/* User Messages */}
                  {viewingTestCase.messages
                    .filter(message => message.role === 'user')
                    .map((message, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            User
                          </Badge>
                        </div>
                        {message.content ? (
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            No content
                          </div>
                        )}
                        {message.images && message.images.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">
                              {message.images.length} image(s)
                            </div>
                            <div className="flex gap-2">
                              {message.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="text-xs bg-muted p-2 rounded">
                                  {img.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* LLM Response */}
                  {viewingTestCase.result && (
                    <div className="border rounded-lg p-3 bg-success/5 border-success/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          LLM Response
                        </Badge>
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {viewingTestCase.result}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {viewingTestCase.error && (
                    <div className="border rounded-lg p-3 bg-destructive/5 border-destructive/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Error
                        </Badge>
                      </div>
                      <div className="text-sm text-destructive">
                        {viewingTestCase.error}
                      </div>
                    </div>
                  )}

                  {/* No content message */}
                  {!viewingTestCase.messages.some(msg => msg.role === 'user') && !viewingTestCase.result && !viewingTestCase.error && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversation content</p>
                      <p className="text-xs">Add user messages and run the batch to see results</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Use ← → arrow keys to navigate between test cases
                </div>
                <div>
                  Press Escape to close
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Test Case Dialog - Using ChatTestCaseEditor */}
      {editingTestCase && (
        <ChatTestCaseEditor
          testCase={editingTestCase}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedTestCase) => {
            setEditingTestCase(updatedTestCase);
            saveTestCase();
          }}
        />
      )}
    </div>
  );
} 