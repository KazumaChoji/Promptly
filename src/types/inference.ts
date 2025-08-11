// Enhanced data structures for inference page with drag-and-drop support

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  images?: Array<{
    data: string; // base64 data URL
    name: string; // filename
  }>;
  timestamp?: Date;
}

export interface ChatTestCase {
  id: string;
  name: string;
  messages: ChatMessage[];
  expectedOutput?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  order: number; // For drag-and-drop ordering within batch
  metadata?: {
    description?: string;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    createdAt?: Date;
    lastRunAt?: Date;
    runCount?: number;
  };
}

export interface TestBatch {
  id: string;
  name: string;
  testCases: ChatTestCase[];
  created: Date;
  order: number; // For drag-and-drop ordering
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  metadata?: {
    description?: string;
    tags?: string[];
    lastRun?: Date;
    totalRuns?: number;
    successRate?: number;
  };
}

export interface BatchStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  successRate: number;
}

export interface TestCaseTemplate {
  id: string;
  name: string;
  description: string;
  messages: Omit<ChatMessage, 'id'>[];
  category: 'simple' | 'multi-turn' | 'few-shot' | 'system' | 'custom';
}

export interface DragItem {
  id: string;
  type: 'batch' | 'testcase';
  data: TestBatch | ChatTestCase;
}

// Utility types for drag-and-drop operations
export type DragEndEvent = {
  active: { id: string; data: { current?: any } };
  over: { id: string; data: { current?: any } } | null;
};

export type SortableContext = {
  items: string[];
  strategy?: any;
};

// Batch Results Types
export interface BatchResult {
  batchId: string;
  batchName: string;
  totalTests: number;
  passed: number;
  failed: number;
  pending: number;
  executionTime: number;
  timestamp: Date;
  testResults: TestCaseResult[];
}

export interface TestCaseResult {
  testCase: ChatTestCase;
  status: 'passed' | 'failed' | 'pending' | 'running';
  actualOutput?: string;
  expectedOutput?: string;
  errorMessage?: string;
  executionTime?: number;
  model?: string;
  confidence?: number;
}