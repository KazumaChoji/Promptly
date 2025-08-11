import { LLMService, AVAILABLE_MODELS } from './llm-service';
import { AGENT_P_MODES, type AgentPMode } from './agent-p-prompts';
import { type FlatUserSettings } from './user-settings';

export interface AgentPRouterRequest {
  userMessage: string;
  context?: string;
  userSettings?: FlatUserSettings;
}

export interface AgentPRouterResponse {
  mode: AgentPMode;
  confidence: number;
  reasoning: string;
}

const ROUTER_PROMPT = `You are an intelligent router for Agent P, an elite prompt design engineer.

Your job is to analyze user requests and determine which Agent P mode would be most appropriate.

Available modes:
- new-generation: Create a completely new system prompt from scratch
- edit: Edit and improve an existing system prompt
- optimize: Optimize an existing system prompt for performance/efficiency
- evaluate: Evaluate the quality and effectiveness of a system prompt
- test: Test a system prompt with sample scenarios

Router Rules:
1. Look for keywords and intent in the user's message
2. Consider the context and what the user is trying to achieve
3. Choose the most appropriate mode with high confidence
4. Provide brief reasoning for your choice

Keywords to look for:
- "new", "create", "design", "build" → new-generation
- "edit", "modify", "change", "improve", "fix" → edit
- "optimize", "faster", "efficient", "performance" → optimize
- "evaluate", "assess", "quality", "review" → evaluate
- "test", "validate", "scenario", "check" → test

Respond in this exact JSON format:
{
  "mode": "new-generation",
  "confidence": 0.95,
  "reasoning": "User wants to create a new system prompt from scratch"
}`;

export class AgentPRouter {
  private static instance: AgentPRouter;

  private constructor() {}

  static getInstance(): AgentPRouter {
    if (!AgentPRouter.instance) {
      AgentPRouter.instance = new AgentPRouter();
    }
    return AgentPRouter.instance;
  }

  private getCheapestModel(userSettings?: FlatUserSettings) {
    // If user has configured a model for Agent P, use a cheap model from the same provider
    if (userSettings?.agentPModelConfig?.provider) {
      const provider = userSettings.agentPModelConfig.provider;
      const modelsFromProvider = AVAILABLE_MODELS.filter(m => m.provider === provider);
      
      if (provider === 'openai') {
        return modelsFromProvider.find(m => m.id.includes('gpt-4o-mini') || m.id.includes('gpt-3.5')) || modelsFromProvider[0];
      } else if (provider === 'anthropic') {
        return modelsFromProvider.find(m => m.id.includes('haiku')) || modelsFromProvider[0];
      } else if (provider === 'google') {
        return modelsFromProvider.find(m => m.id.includes('flash')) || modelsFromProvider[0];
      }
    }
    
    // Fallback to any cheap model
    return AVAILABLE_MODELS.find(model => 
      model.id.includes('gpt-4o-mini') || 
      model.id.includes('gpt-3.5') ||
      model.id.includes('claude-3-haiku') ||
      model.id.includes('flash')
    ) || AVAILABLE_MODELS[0];
  }

  async routeRequest(request: AgentPRouterRequest): Promise<AgentPRouterResponse> {
    try {
      const model = this.getCheapestModel(request.userSettings);
      
      const prompt = `User Request: ${request.userMessage}

${request.context ? `Context: ${request.context}\n\n` : ''}${ROUTER_PROMPT}`;

      const response = await LLMService.runInference({
        prompt: `System: You are an intelligent router for Agent P. Analyze the user's request and determine the most appropriate mode.

${prompt}`,
        testInput: request.userMessage,
        model,
        apiKeys: request.userSettings ? {
          openai: request.userSettings.openaiApiKey,
          anthropic: request.userSettings.anthropicApiKey,
          google: request.userSettings.googleApiKey
        } : undefined
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No response from router');
      }

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response.content);
      } catch (e) {
        // Fallback to default mode if parsing fails
        return {
          mode: 'new-generation',
          confidence: 0.5,
          reasoning: 'Failed to parse router response, defaulting to new-generation'
        };
      }

      // Validate the mode
      if (!Object.values(AGENT_P_MODES).includes(parsedResponse.mode)) {
        return {
          mode: 'new-generation',
          confidence: 0.5,
          reasoning: 'Invalid mode returned, defaulting to new-generation'
        };
      }

      return {
        mode: parsedResponse.mode,
        confidence: parsedResponse.confidence || 0.8,
        reasoning: parsedResponse.reasoning || 'Mode determined by router'
      };
    } catch (error) {
      console.error('Agent P Router Error:', error);
      // Fallback to new-generation with low confidence
      return {
        mode: 'new-generation',
        confidence: 0.3,
        reasoning: 'Router failed, defaulting to new-generation mode'
      };
    }
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

export const agentPRouter = AgentPRouter.getInstance(); 