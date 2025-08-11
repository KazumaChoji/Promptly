import { LLMService, AVAILABLE_MODELS, type LLMModel, type InferenceRequest } from './llm-service';
import { getAgentPPrompt, AGENT_P_MODES, type AgentPMode } from './agent-p-prompts';
import { UserSettingsService, type FlatUserSettings } from './user-settings';

export interface AgentPRequest {
  mode: AgentPMode;
  userMessage: string;
  context?: string;
  existingPrompt?: string;
  userSettings?: FlatUserSettings;
}

export interface AgentPResponse {
  content: string;
  mode: AgentPMode;
  timestamp: string;
  metadata?: {
    promptLength?: number;
    estimatedTokens?: number;
    complexity?: 'low' | 'medium' | 'high';
  };
}

export class AgentPService {
  private static instance: AgentPService;

  private constructor() {}

  static getInstance(): AgentPService {
    if (!AgentPService.instance) {
      AgentPService.instance = new AgentPService();
    }
    return AgentPService.instance;
  }

  private getConfiguredModel(userSettings?: FlatUserSettings): LLMModel {
    if (userSettings?.agentPModelConfig) {
      const configuredModel = AVAILABLE_MODELS.find(model => 
        model.id === userSettings.agentPModelConfig.model &&
        model.provider === userSettings.agentPModelConfig.provider
      );
      if (configuredModel) {
        return configuredModel;
      }
    }
    return AVAILABLE_MODELS.find(model => model.id === 'gpt-4o-mini') || AVAILABLE_MODELS[0];
  }

  private getSystemPrompt(mode: AgentPMode, userSettings?: FlatUserSettings): string {
    if (userSettings?.agentPPrompts) {
      switch (mode) {
        case AGENT_P_MODES.NEW_GENERATION:
          return userSettings.agentPPrompts.newGeneration || getAgentPPrompt(mode);
        case AGENT_P_MODES.EDIT:
          return userSettings.agentPPrompts.edit || getAgentPPrompt(mode);
        case AGENT_P_MODES.OPTIMIZE:
          return userSettings.agentPPrompts.optimize || getAgentPPrompt(mode);
        case AGENT_P_MODES.EVALUATE:
          return userSettings.agentPPrompts.evaluate || getAgentPPrompt(mode);
        case AGENT_P_MODES.TEST:
          return userSettings.agentPPrompts.test || getAgentPPrompt(mode);
        default:
          return getAgentPPrompt(mode);
      }
    }
    return getAgentPPrompt(mode);
  }

  async generateResponse(request: AgentPRequest): Promise<AgentPResponse> {
    try {
      // Use custom prompt from user settings or fall back to default
      const systemPrompt = this.getSystemPrompt(request.mode, request.userSettings);
      const userPrompt = this.buildUserPrompt(request);
      const model = this.getConfiguredModel(request.userSettings);
      
      console.log('Agent P - Model Configuration:', {
        configuredProvider: request.userSettings?.agentPModelConfig?.provider,
        configuredModel: request.userSettings?.agentPModelConfig?.model,
        selectedModel: model,
        hasGoogleKey: !!request.userSettings?.googleApiKey?.trim(),
        hasOpenAIKey: !!request.userSettings?.openaiApiKey?.trim(),
        hasAnthropicKey: !!request.userSettings?.anthropicApiKey?.trim()
      });

      const llmRequest: InferenceRequest = {
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        testInput: request.userMessage,
        model,
        apiKeys: request.userSettings ? {
          openai: request.userSettings.openaiApiKey,
          anthropic: request.userSettings.anthropicApiKey,
          google: request.userSettings.googleApiKey
        } : undefined
      };

      console.log('Agent P - Sending request:', {
        modelProvider: model.provider,
        modelId: model.id,
        temperature: request.userSettings?.agentPModelConfig?.temperature ?? 0.7,
        maxTokens: request.userSettings?.agentPModelConfig?.maxTokens ?? 2000
      });

      const response = await LLMService.runInference(llmRequest);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No response from Agent P');
      }

      return {
        content: response.content,
        mode: request.mode,
        timestamp: new Date().toISOString(),
        metadata: {
          promptLength: response.content.length,
          estimatedTokens: Math.ceil(response.content.length / 4), // Rough estimate
          complexity: this.assessComplexity(response.content)
        }
      };
    } catch (error) {
      console.error('Agent P Service Error:', error);
      console.error('Agent P Request:', {
        mode: request.mode,
        modelProvider: request.userSettings?.agentPModelConfig?.provider,
        modelId: request.userSettings?.agentPModelConfig?.model,
        hasApiKeys: {
          openai: !!request.userSettings?.openaiApiKey,
          anthropic: !!request.userSettings?.anthropicApiKey,
          google: !!request.userSettings?.googleApiKey
        }
      });
      throw new Error(`Failed to generate Agent P response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildUserPrompt(request: AgentPRequest): string {
    let prompt = `User Request: ${request.userMessage}\n\n`;

    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }

    if (request.existingPrompt && request.mode !== 'new-generation') {
      prompt += `Existing System Prompt:\n\`\`\`\n${request.existingPrompt}\n\`\`\`\n\n`;
    }

    // Debug log
    console.log('Agent P buildUserPrompt:', {
      mode: request.mode,
      hasExistingPrompt: !!request.existingPrompt,
      existingPromptLength: request.existingPrompt?.length || 0,
      existingPromptPreview: request.existingPrompt ? request.existingPrompt.substring(0, 100) + '...' : 'none'
    });

    return prompt;
  }

  private assessComplexity(content: string): 'low' | 'medium' | 'high' {
    const length = content.length;
    const hasConditionals = content.includes('<if_block>') || content.includes('if');
    const hasToolCalls = content.includes('<') && content.includes('>');
    const hasPolicies = content.includes('{{') && content.includes('}}');

    if (length > 2000 || (hasConditionals && hasToolCalls && hasPolicies)) {
      return 'high';
    } else if (length > 1000 || hasConditionals || hasToolCalls) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Helper method to validate if a mode is supported
  isModeSupported(mode: string): mode is AgentPMode {
    return Object.values(AGENT_P_MODES).includes(mode as AgentPMode);
  }

  // Helper method to get available modes
  getAvailableModes(): AgentPMode[] {
    return Object.values(AGENT_P_MODES);
  }

  // Helper method to get mode description
  getModeDescription(mode: AgentPMode): string {
    switch (mode) {
      case 'new-generation':
        return 'Create a new system prompt from scratch';
      case 'edit':
        return 'Edit and improve an existing system prompt';
      case 'optimize':
        return 'Optimize an existing system prompt for performance';
      case 'evaluate':
        return 'Evaluate the quality and effectiveness of a system prompt';
      case 'test':
        return 'Test a system prompt with sample scenarios';
      default:
        return 'Unknown mode';
    }
  }
}

export const agentPService = AgentPService.getInstance(); 