"use client";

interface AIAction {
  id: string;
  type: 'replace' | 'insert' | 'delete' | 'enhance' | 'rewrite';
  description: string;
  originalText: string;
  newText: string;
  confidence: number;
  reasoning: string;
}

interface AIPromptEditorRequest {
  highlightedText: string;
  customPrompt: string;
  fullPromptContent: string;
  contextBefore?: string;
  contextAfter?: string;
}

interface AIPromptEditorResponse {
  actions: AIAction[];
  suggestions: string[];
  reasoning: string;
}

export async function generateQuickActionsWithOpenAI(highlightedText: string, promptContent: string): Promise<string[]> {
  try {
    console.log('🚀 Starting quick actions generation:', {
      highlightedTextLength: highlightedText.length,
      promptContentLength: promptContent.length,
      highlightedTextPreview: highlightedText.substring(0, 100) + '...'
    });

    // Load user settings to get the configured model
    let userSettings: any = null;
    try {
      const { UserSettingsService } = await import('./user-settings');
      userSettings = await UserSettingsService.getUserSettings();
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }

    const response = await fetch('/api/llm/quick-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        highlightedText,
        promptContent,
        action: 'generate',
        userSettings
      })
    });

    console.log('📡 API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 API Response data:', data);
    
    if (data.error) {
      console.error('❌ API returned error:', data.error);
      throw new Error(data.error);
    }

    const actions = data.actions || [];
    console.log('✅ Generated actions:', actions);
    return actions;
  } catch (error) {
    console.error('💥 Failed to generate quick actions:', error);
    throw error;
  }
}

export async function applyQuickActionWithOpenAI(highlightedText: string, action: string, promptContent: string): Promise<string> {
  try {
    // Load user settings to get the configured model
    let userSettings: any = null;
    try {
      const { UserSettingsService } = await import('./user-settings');
      userSettings = await UserSettingsService.getUserSettings();
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }

    const response = await fetch('/api/llm/quick-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        highlightedText,
        promptContent,
        action: 'apply',
        actionText: action,
        userSettings
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.result || '';
  } catch (error) {
    console.error('Error applying quick action:', error);
    throw error;
  }
}

class AIPromptEditorService {
  private baseUrl = '/api/llm/inference';

  async generateActions(request: AIPromptEditorRequest): Promise<AIPromptEditorResponse> {
    try {
      // Create a structured prompt for the LLM
      const systemPrompt = `You are an AI assistant specialized in editing and improving prompts. 
You will receive highlighted text from a prompt and a custom instruction. 
Your task is to generate specific actions and suggestions based on the context.

Return your response as a JSON object with this structure:
{
  "actions": [
    {
      "id": "unique_id",
      "type": "replace|insert|delete|enhance|rewrite",
      "description": "Brief description of the action",
      "originalText": "The original highlighted text",
      "newText": "The improved/modified text",
      "confidence": 0.95,
      "reasoning": "Explanation of why this change improves the prompt"
    }
  ],
  "suggestions": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3"
  ],
  "reasoning": "Overall reasoning for the suggested changes"
}

Focus on:
- Clarity and specificity improvements
- Better instruction structure
- More effective prompt engineering techniques
- Context-aware enhancements
- Maintaining the original intent while improving effectiveness`;

      const userPrompt = `
Highlighted Text: "${request.highlightedText}"
Custom Instruction: "${request.customPrompt}"

Context Before: "${request.contextBefore || ''}"
Context After: "${request.contextAfter || ''}"

Full Prompt Content: "${request.fullPromptContent}"

Please analyze the highlighted text and provide specific actions and suggestions based on the custom instruction.`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from LLM');
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        return this.validateAndFormatResponse(parsed, request);
      } catch (parseError) {
        // If JSON parsing fails, create a fallback response
        return this.createFallbackResponse(content, request);
      }

    } catch (error) {
      console.error('Error generating AI actions:', error);
      throw error;
    }
  }

  private validateAndFormatResponse(parsed: any, request: AIPromptEditorRequest): AIPromptEditorResponse {
    const actions: AIAction[] = [];
    const suggestions: string[] = [];

    // Validate and format actions
    if (Array.isArray(parsed.actions)) {
      parsed.actions.forEach((action: any, index: number) => {
        if (action && typeof action === 'object') {
          actions.push({
            id: action.id || `action_${index}`,
            type: action.type || 'enhance',
            description: action.description || 'Improve text',
            originalText: action.originalText || request.highlightedText,
            newText: action.newText || request.highlightedText,
            confidence: typeof action.confidence === 'number' ? action.confidence : 0.8,
            reasoning: action.reasoning || 'AI-generated improvement'
          });
        }
      });
    }

    // Validate and format suggestions
    if (Array.isArray(parsed.suggestions)) {
      suggestions.push(...parsed.suggestions.filter(s => typeof s === 'string'));
    }

    return {
      actions,
      suggestions,
      reasoning: parsed.reasoning || 'AI-generated analysis'
    };
  }

  private createFallbackResponse(content: string, request: AIPromptEditorRequest): AIPromptEditorResponse {
    // Create a basic response when JSON parsing fails
    return {
      actions: [{
        id: 'fallback_action',
        type: 'enhance',
        description: 'AI-generated improvement',
        originalText: request.highlightedText,
        newText: content.substring(0, 200), // Use first 200 chars as suggestion
        confidence: 0.7,
        reasoning: 'Generated from AI response'
      }],
      suggestions: [
        'Review the AI-generated content',
        'Consider manual refinement',
        'Apply changes selectively'
      ],
      reasoning: 'Fallback response due to parsing issues'
    };
  }

  async generateQuickSuggestions(highlightedText: string, promptContent: string): Promise<string[]> {
    try {
      const systemPrompt = `You are an AI assistant that provides quick, actionable suggestions for improving prompt text.
Return exactly 3-5 short, specific suggestions as a JSON array of strings.
Focus on immediate, practical improvements.

Example response format:
["Make it more specific", "Add an example", "Clarify the instruction", "Use active voice"]`;

      const userPrompt = `
Highlighted Text: "${highlightedText}"
Full Prompt: "${promptContent}"

Provide 3-5 quick suggestions for improving this highlighted text.`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return [];
      }

      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => typeof s === 'string').slice(0, 5);
        }
      } catch (parseError) {
        console.warn('Failed to parse quick suggestions:', parseError);
      }

      return [];
    } catch (error) {
      console.error('Error generating quick suggestions:', error);
      return [];
    }
  }

  async generateContextAwareQuickPrompts(highlightedText: string, promptContent: string): Promise<string[]> {
    try {
      const systemPrompt = `You are an AI assistant that generates context-aware quick prompts for editing text.
Based on the highlighted text and the full prompt content, generate 4-6 specific, actionable quick prompts.
These should be natural language instructions that users can click to apply.

Return exactly 4-6 short, specific prompts as a JSON array of strings.
Focus on practical editing actions that make sense for the given context.

Example response format:
["Make this more specific", "Add an example here", "Clarify this instruction", "Use more direct language", "Expand on this point", "Simplify this explanation"]`;

      const userPrompt = `
Highlighted Text: "${highlightedText}"
Full Prompt Content: "${promptContent}"

Generate 4-6 context-aware quick prompts that would be useful for editing this highlighted text.`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.6,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return [];
      }

      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => typeof s === 'string').slice(0, 6);
        }
      } catch (parseError) {
        console.warn('Failed to parse context-aware quick prompts:', parseError);
      }

      return [];
    } catch (error) {
      console.error('Error generating context-aware quick prompts:', error);
      return [];
    }
  }
}

export const aiPromptEditorService = new AIPromptEditorService();
export type { AIAction, AIPromptEditorRequest, AIPromptEditorResponse }; 