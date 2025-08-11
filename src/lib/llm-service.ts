export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  maxTokens: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
  error?: string;
}

export interface InferenceRequest {
  prompt: string;
  testInput: string;
  model: LLMModel;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

export interface AIAssistantRequest {
  message: string;
  context: {
    activeFileContent: string;
    selectedText?: string;
    cursorPosition?: { line: number; column: number };
  };
  model: LLMModel;
  temperature?: number;
  maxTokens?: number;
  actionType?: 'generate' | 'edit' | 'improve' | 'explain' | 'suggest';
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

// Backend API Keys (Server-side only)
export interface BackendApiKeys {
  openai: string;
  anthropic: string;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  // OpenAI Models
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    maxTokens: 2000000,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    maxTokens: 1000000,
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    maxTokens: 500000,
  },
  {
    id: 'gpt-5-pro',
    name: 'GPT-5 Pro',
    provider: 'openai',
    maxTokens: 4000000,
  },
  {
    id: 'gpt-5-thinking',
    name: 'GPT-5 Thinking',
    provider: 'openai',
    maxTokens: 2000000,
  },
  {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    maxTokens: 200000,
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    maxTokens: 200000,
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    maxTokens: 200000,
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    maxTokens: 1000000,
  },

  // Anthropic Models
  {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    maxTokens: 500000,
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    maxTokens: 400000,
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    maxTokens: 400000,
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
  },

  // Google Models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    maxTokens: 4000000,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    maxTokens: 2000000,
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    maxTokens: 1000000,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    maxTokens: 2000000,
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google',
    maxTokens: 1000000,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    maxTokens: 2000000,
  },
];

// Helper functions for model filtering
export function getModelsByProvider(provider: 'openai' | 'anthropic' | 'google'): LLMModel[] {
  return AVAILABLE_MODELS.filter(model => model.provider === provider);
}

export function getAllAvailableModels(): LLMModel[] {
  return AVAILABLE_MODELS;
}

// Note: Backend API keys are no longer supported. 
// All API keys must be provided by users in Settings.

export class LLMService {
  static async runInference(request: InferenceRequest): Promise<LLMResponse> {
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/llm/inference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out after 30 seconds';
        } else {
          errorMessage = error.message;
        }
      }

      console.error('LLM Service Error:', error);

      return {
        content: '',
        model: request.model.id,
        error: errorMessage,
      };
    }
  }

  static async runBatchInference(
    prompt: string,
    testCases: Array<{ id: string; prompt?: string; title: string }>,
    model: LLMModel,
    onProgress?: (completed: number, total: number) => void,
    apiKeys?: {
      openai?: string;
      anthropic?: string;
    }
  ): Promise<Array<{ testCaseId: string; response: LLMResponse }>> {
    const results: Array<{ testCaseId: string; response: LLMResponse }> = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testInput = testCase.prompt || testCase.title;
      
      try {
        const response = await this.runInference({
          prompt,
          testInput,
          model,
          apiKeys,
        });
        
        results.push({
          testCaseId: testCase.id,
          response,
        });
      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          response: {
            content: '',
            model: model.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
      
      // Call progress callback
      onProgress?.(i + 1, testCases.length);
      
      // Add a small delay to avoid rate limiting
      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  static async runAIAssistant(request: AIAssistantRequest): Promise<LLMResponse> {
    try {
      const response = await fetch('/api/llm/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI Assistant API request failed');
      }

      return await response.json();
    } catch (error) {
      return {
        content: '',
        model: request.model.id,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
} 