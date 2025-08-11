import { LLMService, AVAILABLE_MODELS, type LLMModel } from './llm-service';
import {
  AIEditSuggestion,
  AIEditChunk,
  AIDiffResult,
  VisualDiffChunk,
  VisualDiffResult,
  AutonomyLevel,
  AutonomyConfig,
  AIProvider,
  AIEditRequest,
  AIEditResponse,
  AIDiffRequest,
  AIDiffResponse,
  AuditTrailEntry,
  EditHistoryEntry,
  AIEditorConfig,
  AIEditorEvent
} from './ai-editor-types';

export class EnhancedAIEditorService {
  private static instance: EnhancedAIEditorService;
  private auditTrail: AuditTrailEntry[] = [];
  private editHistory: EditHistoryEntry[] = [];
  private eventListeners: Map<string, (event: AIEditorEvent) => void> = new Map();
  private providers: Map<string, AIProvider> = new Map();
  private config: AIEditorConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeProviders();
  }

  static getInstance(): EnhancedAIEditorService {
    if (!EnhancedAIEditorService.instance) {
      EnhancedAIEditorService.instance = new EnhancedAIEditorService();
    }
    return EnhancedAIEditorService.instance;
  }

  private getDefaultConfig(): AIEditorConfig {
    return {
      defaultAutonomyLevel: 'partial',
      autoApplyThreshold: 0.8,
      maxSuggestions: 5,
      enableAuditTrail: true,
      enableVisualDiffs: true,
      enableIntermediateSteps: true,
      providers: [],
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o-mini'
    };
  }

  private initializeProviders() {
    // OpenAI Provider
    const openAIProvider: AIProvider = {
      id: 'openai',
      name: 'OpenAI',
      capabilities: ['text-editing', 'diff-generation', 'reasoning'],
      supportedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      generateEdit: this.generateOpenAIEdit.bind(this),
      generateDiff: this.generateOpenAIDiff.bind(this)
    };

    // Anthropic Provider
    const anthropicProvider: AIProvider = {
      id: 'anthropic',
      name: 'Anthropic',
      capabilities: ['text-editing', 'diff-generation', 'reasoning'],
      supportedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
      generateEdit: this.generateAnthropicEdit.bind(this),
      generateDiff: this.generateAnthropicDiff.bind(this)
    };

    this.providers.set('openai', openAIProvider);
    this.providers.set('anthropic', anthropicProvider);
    this.config.providers = [openAIProvider, anthropicProvider];
  }

  // Core AI Edit Generation
  async generateEdit(request: AIEditRequest): Promise<AIEditResponse> {
    const startTime = Date.now();
    const provider = this.providers.get(request.model.split('-')[0]) || this.providers.get('openai')!;
    
    try {
      const response = await provider.generateEdit(request);
      
      // Add to audit trail
      if (this.config.enableAuditTrail) {
        this.addAuditTrailEntry({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          action: 'suggestion',
          sessionId: this.getSessionId(),
          changes: response.diff.chunks,
          reasoning: response.diff.reasoning,
          autonomyLevel: request.autonomyLevel,
          modelUsed: request.model || 'unknown',
          confidence: response.metadata.confidence
        });
      }

      // Emit event
      this.emitEvent({
        type: 'suggestion-generated',
        payload: response,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      console.error('AI Edit Generation Error:', error);
      throw new Error('Failed to generate AI edit');
    }
  }

  // Visual Diff Generation
  async generateVisualDiff(request: AIDiffRequest): Promise<VisualDiffResult> {
    const provider = this.providers.get('openai')!;
    
    try {
      const response = await provider.generateDiff(request);
      
      // Emit event
      this.emitEvent({
        type: 'diff-generated',
        payload: response.diff,
        timestamp: new Date()
      });

      return response.diff;
    } catch (error) {
      console.error('Visual Diff Generation Error:', error);
      throw new Error('Failed to generate visual diff');
    }
  }

  // OpenAI Implementation
  private async generateOpenAIEdit(request: AIEditRequest): Promise<AIEditResponse> {
    const model = AVAILABLE_MODELS.find(m => m.id === request.model) || AVAILABLE_MODELS[0];
    
    const prompt = this.buildEditPrompt(request);
    const llmRequest = {
      prompt,
      testInput: request.originalText,
      model
    };

    const response = await LLMService.runInference(llmRequest);
    
    if (response.error) {
      throw new Error(response.error);
    }

    const suggestions = this.parseEditResponse(response.content, request);
    const diff = this.generateDiffFromSuggestions(suggestions, request.originalText);
    
    return {
      suggestions,
      diff,
      metadata: {
        modelUsed: request.model,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTime: Date.now(),
        confidence: this.calculateOverallConfidence(suggestions)
      }
    };
  }

  private async generateOpenAIDiff(request: AIDiffRequest): Promise<AIDiffResponse> {
    const model = AVAILABLE_MODELS.find(m => m.id === 'gpt-4o-mini') || AVAILABLE_MODELS[0];
    
    const prompt = this.buildDiffPrompt(request);
    const llmRequest = {
      prompt,
      testInput: request.originalText,
      model
    };

    const response = await LLMService.runInference(llmRequest);
    
    if (response.error) {
      throw new Error(response.error);
    }

    const diff = this.parseDiffResponse(response.content, request);
    
    return {
      diff,
      metadata: {
        modelUsed: request.model || 'unknown',
        processingTime: Date.now()
      }
    };
  }

  // Anthropic Implementation
  private async generateAnthropicEdit(request: AIEditRequest): Promise<AIEditResponse> {
    // Similar to OpenAI but with Anthropic-specific prompt formatting
    return this.generateOpenAIEdit(request);
  }

  private async generateAnthropicDiff(request: AIDiffRequest): Promise<AIDiffResponse> {
    // Similar to OpenAI but with Anthropic-specific prompt formatting
    return this.generateOpenAIDiff(request);
  }

  // Prompt Building
  private buildEditPrompt(request: AIEditRequest): string {
    const autonomyInstructions = {
      manual: 'Provide suggestions only. Do not apply changes automatically.',
      partial: 'Provide suggestions and apply high-confidence changes (>0.8) automatically.',
      assisted: 'Provide suggestions and apply changes with user confirmation.',
      autonomous: 'Apply changes automatically with detailed reasoning.'
    };

    return `You are an expert AI text editor with ${request.autonomyLevel} autonomy level.

${autonomyInstructions[request.autonomyLevel]}

Original Text:
"${request.originalText}"

User Instruction: ${request.instruction}

${request.context ? `Context: ${request.context}\n` : ''}

Requirements:
- Provide detailed reasoning for each change
- Include confidence scores (0.0-1.0)
- Show intermediate steps if requested
- Maintain original meaning and intent
- Use structured format for parsing

${request.includeIntermediateSteps ? 'Include intermediate reasoning steps.' : ''}
${request.includeReasoning ? 'Provide detailed reasoning for each suggestion.' : ''}

Please respond in the following JSON format:
{
  "suggestions": [
    {
      "type": "replacement|insertion|deletion|formatting|custom",
      "originalText": "text to replace",
      "suggestedText": "new text",
      "confidence": 0.95,
      "reasoning": "detailed explanation",
      "intermediateSteps": ["step1", "step2"],
      "citations": ["source1", "source2"]
    }
  ],
  "overallReasoning": "Overall explanation of changes",
  "intermediateSteps": ["step1", "step2"],
  "citations": ["source1", "source2"]
}`;
  }

  private buildDiffPrompt(request: AIDiffRequest): string {
    return `You are an expert diff generator. Create a detailed visual diff between two text versions.

Original Text:
"${request.originalText}"

New Text:
"${request.newText}"

Generate a diff with ${request.granularity} granularity.

Please respond in the following JSON format:
{
  "chunks": [
    {
      "type": "addition|deletion|modification|unchanged",
      "originalText": "original text (if applicable)",
      "newText": "new text (if applicable)",
      "startIndex": 0,
      "endIndex": 10,
      "confidence": 0.95,
      "reasoning": "explanation of change"
    }
  ],
  "overallConfidence": 0.9,
  "totalChanges": 5,
  "reasoning": "Overall explanation"
}`;
  }

  // Response Parsing
  private parseEditResponse(response: string, request: AIEditRequest): AIEditSuggestion[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.suggestions.map((s: any, index: number) => ({
        id: crypto.randomUUID(),
        type: s.type,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        confidence: s.confidence,
        reasoning: s.reasoning,
        intermediateSteps: s.intermediateSteps || [],
        citations: s.citations || [],
        metadata: { index, autonomyLevel: request.autonomyLevel },
        timestamp: new Date()
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  private parseDiffResponse(response: string, request: AIDiffRequest): VisualDiffResult {
    try {
      const parsed = JSON.parse(response);
      return {
        chunks: parsed.chunks.map((c: any) => ({
          id: crypto.randomUUID(),
          type: c.type,
          originalText: c.originalText,
          newText: c.newText,
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          confidence: c.confidence,
          reasoning: c.reasoning,
          applied: false
        })),
        overallConfidence: parsed.overallConfidence,
        totalChanges: parsed.totalChanges,
        reasoning: parsed.reasoning,
        modelInfo: {
          name: 'GPT-4o-mini',
          version: '1.0',
          provider: 'OpenAI'
        }
      };
    } catch (error) {
      console.error('Failed to parse diff response:', error);
      return {
        chunks: [],
        overallConfidence: 0,
        totalChanges: 0,
        reasoning: 'Failed to parse diff',
        modelInfo: {
          name: 'Unknown',
          version: '1.0',
          provider: 'Unknown'
        }
      };
    }
  }

  // Diff Generation from Suggestions
  private generateDiffFromSuggestions(suggestions: AIEditSuggestion[], originalText: string): AIDiffResult {
    const chunks: AIEditChunk[] = suggestions.map(suggestion => ({
      id: crypto.randomUUID(),
      startIndex: originalText.indexOf(suggestion.originalText),
      endIndex: originalText.indexOf(suggestion.originalText) + suggestion.originalText.length,
      originalText: suggestion.originalText,
      suggestedText: suggestion.suggestedText,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      applied: false,
      diffType: suggestion.type === 'deletion' ? 'deletion' : 
                suggestion.type === 'insertion' ? 'addition' : 'modification'
    }));

    return {
      chunks,
      overallConfidence: this.calculateOverallConfidence(suggestions),
      reasoning: suggestions.map(s => s.reasoning).join('; '),
      intermediateSteps: suggestions.flatMap(s => s.intermediateSteps || []),
      citations: suggestions.flatMap(s => s.citations || []),
      modelUsed: 'gpt-4o-mini',
      timestamp: new Date()
    };
  }

  // Utility Methods
  private calculateOverallConfidence(suggestions: AIEditSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    return suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
  }

  private getSessionId(): string {
    return sessionStorage.getItem('ai-editor-session-id') || crypto.randomUUID();
  }

  // History Management
  addEditHistory(entry: EditHistoryEntry) {
    this.editHistory.push(entry);
    if (this.editHistory.length > 100) {
      this.editHistory = this.editHistory.slice(-100);
    }
  }

  getEditHistory(): EditHistoryEntry[] {
    return [...this.editHistory];
  }

  // Audit Trail Management
  private addAuditTrailEntry(entry: AuditTrailEntry) {
    this.auditTrail.push(entry);
    if (this.auditTrail.length > 1000) {
      this.auditTrail = this.auditTrail.slice(-1000);
    }
  }

  getAuditTrail(): AuditTrailEntry[] {
    return [...this.auditTrail];
  }

  // Event System
  addEventListener(eventType: string, listener: (event: AIEditorEvent) => void) {
    this.eventListeners.set(eventType, listener);
  }

  removeEventListener(eventType: string) {
    this.eventListeners.delete(eventType);
  }

  emitEvent(event: AIEditorEvent) {
    const listener = this.eventListeners.get(event.type);
    if (listener) {
      listener(event);
    }
  }

  // Configuration Management
  getConfig(): AIEditorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AIEditorConfig>) {
    this.config = { ...this.config, ...updates };
  }

  // Autonomy Level Management
  getAutonomyConfig(level: AutonomyLevel): AutonomyConfig {
    const configs: Record<AutonomyLevel, AutonomyConfig> = {
      manual: {
        level: 'manual',
        autoApplyThreshold: 1.0, // Never auto-apply
        requireConfirmation: true,
        maxBatchSize: 1,
        allowedEditTypes: ['custom']
      },
      partial: {
        level: 'partial',
        autoApplyThreshold: 0.9,
        requireConfirmation: true,
        maxBatchSize: 3,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      },
      assisted: {
        level: 'assisted',
        autoApplyThreshold: 0.8,
        requireConfirmation: false,
        maxBatchSize: 5,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      },
      autonomous: {
        level: 'autonomous',
        autoApplyThreshold: 0.7,
        requireConfirmation: false,
        maxBatchSize: 10,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      }
    };

    return configs[level];
  }
}

export const enhancedAIEditorService = EnhancedAIEditorService.getInstance(); 