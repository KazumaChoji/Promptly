// AI Editor Core Types
export interface AIEditSuggestion {
  id: string;
  type: 'replacement' | 'insertion' | 'deletion' | 'formatting' | 'custom';
  originalText: string;
  suggestedText: string;
  confidence: number;
  reasoning: string;
  intermediateSteps?: string[];
  citations?: string[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AIEditChunk {
  id: string;
  startIndex: number;
  endIndex: number;
  originalText: string;
  suggestedText: string;
  confidence: number;
  reasoning: string;
  applied: boolean;
  diffType: 'addition' | 'deletion' | 'modification';
}

export interface AIDiffResult {
  chunks: AIEditChunk[];
  overallConfidence: number;
  reasoning: string;
  intermediateSteps: string[];
  citations: string[];
  modelUsed: string;
  timestamp: Date;
}

// Autonomy Levels
export type AutonomyLevel = 'manual' | 'partial' | 'assisted' | 'autonomous';

export interface AutonomyConfig {
  level: AutonomyLevel;
  autoApplyThreshold: number; // Confidence threshold for auto-apply
  requireConfirmation: boolean;
  maxBatchSize: number;
  allowedEditTypes: AIEditSuggestion['type'][];
}

// Visual Diff Types
export interface VisualDiffChunk {
  id: string;
  type: 'addition' | 'deletion' | 'modification' | 'unchanged';
  originalText?: string;
  newText?: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  reasoning: string;
  applied: boolean;
}

export interface VisualDiffResult {
  chunks: VisualDiffChunk[];
  overallConfidence: number;
  totalChanges: number;
  reasoning: string;
  modelInfo: {
    name: string;
    version: string;
    provider: string;
  };
}

// AI Provider Interface
export interface AIProvider {
  id: string;
  name: string;
  capabilities: string[];
  supportedModels: string[];
  generateEdit: (request: AIEditRequest) => Promise<AIEditResponse>;
  generateDiff: (request: AIDiffRequest) => Promise<AIDiffResponse>;
}

export interface AIEditRequest {
  originalText: string;
  instruction: string;
  context?: string;
  autonomyLevel: AutonomyLevel;
  model: string;
  temperature?: number;
  maxTokens?: number;
  includeReasoning?: boolean;
  includeIntermediateSteps?: boolean;
}

export interface AIEditResponse {
  suggestions: AIEditSuggestion[];
  diff: AIDiffResult;
  metadata: {
    modelUsed: string;
    tokensUsed: number;
    processingTime: number;
    confidence: number;
  };
}

export interface AIDiffRequest {
  originalText: string;
  newText: string;
  context?: string;
  granularity: 'word' | 'sentence' | 'paragraph';
  model?: string;
}

export interface AIDiffResponse {
  diff: VisualDiffResult;
  metadata: {
    modelUsed: string;
    processingTime: number;
  };
}

// Audit Trail Types
export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  action: 'edit' | 'suggestion' | 'apply' | 'reject' | 'undo' | 'redo';
  userId?: string;
  sessionId: string;
  changes: AIEditChunk[];
  reasoning: string;
  autonomyLevel: AutonomyLevel;
  modelUsed: string;
  confidence: number;
}

// Undo/Redo Types
export interface EditHistoryEntry {
  id: string;
  timestamp: Date;
  textBefore: string;
  textAfter: string;
  appliedChunks: AIEditChunk[];
  reasoning: string;
  autonomyLevel: AutonomyLevel;
}

// Natural Language Processing Types
export interface NLPInstruction {
  type: 'edit' | 'format' | 'improve' | 'translate' | 'summarize';
  instruction: string;
  targetSections?: number[];
  constraints?: string[];
  preferences?: Record<string, any>;
}

// Multi-modal Types
export interface MultiModalInput {
  text?: string;
  image?: string; // base64 or URL
  audio?: string; // base64 or URL
  metadata?: Record<string, any>;
}

export interface MultiModalResponse {
  text: string;
  confidence: number;
  reasoning: string;
  visualElements?: string[];
}

// Configuration Types
export interface AIEditorConfig {
  defaultAutonomyLevel: AutonomyLevel;
  autoApplyThreshold: number;
  maxSuggestions: number;
  enableAuditTrail: boolean;
  enableVisualDiffs: boolean;
  enableIntermediateSteps: boolean;
  providers: AIProvider[];
  defaultProvider: string;
  defaultModel: string;
}

// Event Types
export interface AIEditorEvent {
  type: 'suggestion-generated' | 'edit-applied' | 'edit-rejected' | 'autonomy-changed' | 'diff-generated';
  payload: any;
  timestamp: Date;
}

// Hook Types
export interface UseAIEditorReturn {
  // State
  text: string;
  suggestions: AIEditSuggestion[];
  diffs: VisualDiffResult[];
  autonomyLevel: AutonomyLevel;
  history: EditHistoryEntry[];
  auditTrail: AuditTrailEntry[];
  
  // Actions
  setText: (text: string) => void;
  generateSuggestions: (instruction: string) => Promise<void>;
  applySuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  setAutonomyLevel: (level: AutonomyLevel) => void;
  undo: () => void;
  redo: () => void;
  generateDiff: (newText: string) => Promise<VisualDiffResult>;
  
  // Configuration
  config: AIEditorConfig;
  updateConfig: (config: Partial<AIEditorConfig>) => void;
} 