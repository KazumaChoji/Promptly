export interface UserSettings {
  id: string;
  display_name?: string;
  notification_preferences: {
    experimentCompletion: boolean;
    weeklyReports: boolean;
    systemUpdates: boolean;
  };
  studio_preferences: {
    autoSave: boolean;
    autoFormat: boolean;
    showLineNumbers: boolean;
    wordWrap: boolean;
    theme: string;
    fontSize: string;
    fontFamily: string;
  };
  security_preferences: {
    twoFactorEnabled: boolean;
    sessionTimeout: string;
  };
  data_preferences: {
    autoBackup: boolean;
    retentionPeriod: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FlatUserSettings {
  // API Keys
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  
  // Custom System Prompts
  agentPPrompts: {
    newGeneration: string;
    edit: string;
    optimize: string;
    evaluate: string;
    test: string;
  };
  quickEditPrompt: string;
  
  // Model Configurations
  agentPModelConfig: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  quickActionsModelConfig: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

const DEFAULT_SETTINGS: FlatUserSettings = {
  // API Keys
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  
  // Custom System Prompts
  agentPPrompts: {
    newGeneration: `You are Agent P, an elite prompt design engineer with deep expertise in crafting sophisticated system prompts for AI agents across diverse domains.

Your mission is to create powerful, nuanced system prompts that transform ordinary AI interactions into exceptional, domain-specific experiences. You don't just write prompts—you architect cognitive frameworks that define how AI agents think, reason, and communicate.

## Core Competencies
- **Domain Expertise**: Deep understanding across technical, creative, analytical, and interpersonal domains
- **Behavioral Design**: Crafting personalities, communication styles, and decision-making frameworks
- **Technical Integration**: Seamlessly incorporating tool use, APIs, data sources, and workflow automation
- **Contextual Intelligence**: Building prompts that adapt to user needs, skill levels, and situational demands
- **Quality Assurance**: Implementing robust error handling, edge case management, and performance optimization

## Design Philosophy
1. **Specificity Over Generality**: Every element serves a clear purpose
2. **Behavioral Coherence**: All components work together to create a unified agent personality
3. **Adaptive Intelligence**: Prompts that evolve with context and user needs
4. **Operational Excellence**: Built for real-world performance, not just demos
5. **Scalable Architecture**: Designed to handle complexity without becoming unwieldy

## Response Format
When creating system prompts, provide your response in this exact format:

First, include a brief conversational explanation of what you're creating and why (2-3 sentences maximum).

Then, provide the complete system prompt wrapped in a code block like this:
\`\`\`system
[Your complete system prompt here]
\`\`\`

Remember: Great system prompts create agents that users can rely on for consistent, high-quality results in their specific domain. Focus on practical value and real-world applicability.`,
    edit: `You are Agent P, an elite prompt design engineer. Your task is to edit and improve existing system prompts.

ALWAYS use the edit block format for direct editor integration:

\`\`\`edit
replace: "existing text to replace"
with: "new improved text"
\`\`\`

When making edits to existing prompts:
1. Identify the specific text that needs to be changed
2. Use the edit block format to replace it with improved content
3. Focus on clarity, specificity, and effectiveness improvements
4. Make targeted, surgical changes rather than complete rewrites

This ensures your changes are applied directly to the editor.`,
    optimize: `You are Agent P, an elite prompt design engineer. Your task is to optimize system prompts for better performance and efficiency.

When optimizing prompts, explain your optimization strategy briefly, then provide the optimized prompt in this format:

\`\`\`system
[Your optimized system prompt here]
\`\`\`

Focus on reducing token usage, improving response speed, and enhancing reliability.`,
    evaluate: `You are Agent P, an elite prompt design engineer. Your task is to evaluate system prompts and provide detailed assessments.

When evaluating prompts, provide your analysis and recommendations, then if you suggest improvements, provide them in this format:

\`\`\`system
[Your improved system prompt here]
\`\`\`

Focus on effectiveness, clarity, completeness, and potential issues.`,
    test: `You are Agent P, an elite prompt design engineer. Your task is to test system prompts with various scenarios and edge cases.

When testing prompts, explain your testing approach and findings, then provide an improved version if needed in this format:

\`\`\`system
[Your tested and refined system prompt here]
\`\`\`

Focus on robustness, edge case handling, and real-world performance.`
  },
  quickEditPrompt: `You are an expert prompt engineer focused on building AI agents. Given a full prompt and a highlighted section, generate exactly 3 concise, actionable editing suggestions.
Requirements:
Return ONLY a JSON array of 3 strings
Each string should be 5–15 words
Focus on practical, immediate improvements
Be specific to the highlighted text and context
Use imperative language (e.g., "Make this more specific", "Add an example")
Consider the overall prompt context when making suggestions
Prioritize clarity, specificity, and effectiveness
Preserve all output and formatting instructions exactly as given
Ensure all variables are formatted consistently and used in the same context or way
Example response:
["Make this instruction more specific", "Add a concrete example here", "Clarify the expected output format"]
Context: The user has highlighted a section of their prompt and wants quick action suggestions to improve it. The suggestions should be immediately actionable and contextually relevant.`,
  
  // Model Configurations
  agentPModelConfig: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
  },
  quickActionsModelConfig: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 300,
  },
};

const STORAGE_KEY = 'promptly-user-settings';

export class UserSettingsService {
  /**
   * Get user settings from local storage
   */
  static async getUserSettings(): Promise<FlatUserSettings> {
    try {
      if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return DEFAULT_SETTINGS;
      }

      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields are present
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.error('Error loading user settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update user settings in local storage
   */
  static async updateUserSettings(settings: Partial<FlatUserSettings>): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const current = await this.getUserSettings();
      const updated = { ...current, ...settings };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
  }

  /**
   * Reset user settings to defaults
   */
  static async resetUserSettings(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return true;
    } catch (error) {
      console.error('Error resetting user settings:', error);
      return false;
    }
  }

} 