import { LLMService, AVAILABLE_MODELS, type LLMModel, type InferenceRequest } from './llm-service';
import { parseEditBlock, EditInstruction } from './editParser';

export interface AIEditorSuggestion {
  suggestion: string;
  confidence: number;
  reasoning: string;
}

export class AIEditorService {
  private static instance: AIEditorService;

  private constructor() {}

  static getInstance(): AIEditorService {
    if (!AIEditorService.instance) {
      AIEditorService.instance = new AIEditorService();
    }
    return AIEditorService.instance;
  }

  private getDefaultModel(): LLMModel {
    return AVAILABLE_MODELS.find(model => model.id === 'gpt-4o-mini') || AVAILABLE_MODELS[0];
  }

  async generateTextEdit(
    originalText: string,
    userInstruction: string,
    context?: string
  ): Promise<string> {
    try {
      const prompt = this.buildEditPrompt(originalText, userInstruction, context);
      const model = this.getDefaultModel();
      
      const request: InferenceRequest = {
        prompt,
        testInput: originalText,
        model
      };

      const response = await LLMService.runInference(request);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No response from AI service');
      }

      // Clean up the response - remove any markdown formatting or extra text
      let cleanedResponse = response.content.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```[\s\S]*?```/g, '');
      cleanedResponse = cleanedResponse.replace(/`([^`]+)`/g, '$1');
      
      // Remove any explanatory text and keep only the edited version
      const lines = cleanedResponse.split('\n');
      const editedLines = lines.filter(line => 
        !line.startsWith('Edited:') && 
        !line.startsWith('Here') && 
        !line.startsWith('The') &&
        line.trim().length > 0
      );

      return editedLines.join('\n').trim() || originalText;
    } catch (error) {
      console.error('AI Editor Service Error:', error);
      throw new Error('Failed to generate text edit. Please try again.');
    }
  }

  async generateMultipleSuggestions(
    originalText: string,
    context?: string
  ): Promise<AIEditorSuggestion[]> {
    try {
      const prompt = this.buildSuggestionsPrompt(originalText, context);
      const model = this.getDefaultModel();
      
      const request: InferenceRequest = {
        prompt,
        testInput: originalText,
        model
      };

      const response = await LLMService.runInference(request);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No response from AI service');
      }

      // Parse the response to extract multiple suggestions
      const suggestions = this.parseSuggestionsResponse(response.content);
      return suggestions;
    } catch (error) {
      console.error('AI Editor Service Error:', error);
      return [];
    }
  }

  private buildEditPrompt(
    originalText: string, 
    userInstruction: string, 
    context?: string
  ): string {
    return `You are an expert text editor. Your task is to edit the following text based on the user's instruction.

Original Text:
"${originalText}"

User Instruction: ${userInstruction}

${context ? `Context: ${context}\n` : ''}

Please provide ONLY the edited version of the text. Do not include any explanations, markdown formatting, or additional text. Just return the edited text exactly as it should appear.

Edited Text:`;
  }

  private buildSuggestionsPrompt(
    originalText: string,
    context?: string
  ): string {
    return `You are an expert text editor. Analyze the following text and provide 3-5 different editing suggestions to improve it.

Original Text:
"${originalText}"

${context ? `Context: ${context}\n` : ''}

Provide your suggestions in the following format:
1. [Suggestion Type]: [Brief description of the edit]
2. [Suggestion Type]: [Brief description of the edit]
3. [Suggestion Type]: [Brief description of the edit]

Focus on making the text more engaging, clear, concise, or appropriate for the context.`;
  }

  private parseSuggestionsResponse(response: string): AIEditorSuggestion[] {
    const suggestions: AIEditorSuggestion[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && /^\d+\./.test(trimmed)) {
        const suggestion = trimmed.replace(/^\d+\.\s*/, '');
        suggestions.push({
          suggestion,
          confidence: 0.8,
          reasoning: 'AI-generated suggestion'
        });
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  // Helper method to detect text patterns and suggest improvements
  analyzeText(text: string): string[] {
    const suggestions: string[] = [];
    
    // Check for common patterns
    if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
      suggestions.push("Replace with 'Hey there!' 👋");
    }
    
    if (text.length > 100) {
      suggestions.push("Make it more concise");
    }
    
    if (text.includes('!') && text.includes('?')) {
      suggestions.push("Add emoji 😊");
    }
    
    if (text.endsWith('.')) {
      suggestions.push("Add follow-up question");
    }
    
    if (text.split(' ').length < 5) {
      suggestions.push("Add examples");
    }
    
    return suggestions;
  }

  // Generate edit parser compatible responses
  async generateEditParserResponse(
    originalText: string,
    userInstruction: string,
    context?: string
  ): Promise<string> {
    try {
      const prompt = this.buildEditParserPrompt(originalText, userInstruction, context);
      const model = this.getDefaultModel();
      
      const request: InferenceRequest = {
        prompt,
        testInput: originalText,
        model
      };

      const response = await LLMService.runInference(request);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No response from AI service');
      }

      // Clean up the response and validate it contains valid edit instructions
      let cleanedResponse = response.content.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```[\s\S]*?```/g, '');
      cleanedResponse = cleanedResponse.replace(/`([^`]+)`/g, '$1');
      
      // Validate that the response contains valid edit instructions
      const edits = parseEditBlock(cleanedResponse);
      if (edits.length === 0) {
        throw new Error('No valid edit instructions found in AI response');
      }

      return cleanedResponse;
    } catch (error) {
      console.error('AI Editor Service Error:', error);
      throw new Error('Failed to generate edit parser response. Please try again.');
    }
  }

  private buildEditParserPrompt(
    originalText: string,
    userInstruction: string,
    context?: string
  ): string {
    return `You are an expert code editor. Your task is to edit the following code based on the user's instruction.

Original Code:
\`\`\`
${originalText}
\`\`\`

User Instruction: ${userInstruction}

${context ? `Context: ${context}\n` : ''}

Please provide your edits in the following format:

replace: [exact text to replace]
with: [new text]

insert before: [exact text to insert before]
content: [content to insert]

insert after: [exact text to insert after]
content: [content to insert]

delete: [exact text to delete]

Rules:
1. Use exact text matching for targets
2. Provide only the edit instructions, no explanations
3. Use the format shown above
4. Make sure the target text exists in the original code
5. Use proper escaping for special characters

Edit Instructions:`;
  }
}

export const aiEditorService = AIEditorService.getInstance(); 