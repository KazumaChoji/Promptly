import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature: number;
  maxTokens: number;
}

async function callOpenAI(messages: any[], modelConfig: ModelConfig, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function callAnthropic(messages: any[], modelConfig: ModelConfig, apiKey: string) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text;
}

async function callGoogle(messages: any[], modelConfig: ModelConfig, apiKey: string) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  const prompt = `${systemMessage}\n\n${userMessage}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: 0.9,
        maxOutputTokens: modelConfig.maxTokens
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callProvider(messages: any[], modelConfig: ModelConfig, apiKey: string) {
  switch (modelConfig.provider) {
    case 'openai':
      return await callOpenAI(messages, modelConfig, apiKey);
    case 'anthropic':  
      return await callAnthropic(messages, modelConfig, apiKey);
    case 'google':
      return await callGoogle(messages, modelConfig, apiKey);
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

const QUICK_ACTIONS_SYSTEM_PROMPT_PATH = join(process.cwd(), 'src/prompts/system/quick-actions.txt');

function getSystemPrompt(userSettings?: any): string {
  // Use custom prompt from user settings if available
  if (userSettings?.quickEditPrompt) {
    return userSettings.quickEditPrompt;
  }

  try {
    return readFileSync(QUICK_ACTIONS_SYSTEM_PROMPT_PATH, 'utf-8');
  } catch (error) {
    // Fallback system prompt if file doesn't exist
    return `You are an expert prompt engineer focused on building AI agents. Given a full prompt and a highlighted section, generate exactly 3 concise, actionable editing suggestions.
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
Context: The user has highlighted a section of their prompt and wants quick action suggestions to improve it. The suggestions should be immediately actionable and contextually relevant.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Quick Actions API called');
    const body = await request.json();
    const { highlightedText, promptContent, action, actionText, userSettings } = body;

    console.log('📝 Request data:', {
      highlightedTextLength: highlightedText?.length || 0,
      promptContentLength: promptContent?.length || 0,
      action,
      actionText: actionText?.substring(0, 50) + '...' || 'N/A',
      highlightedTextPreview: highlightedText?.substring(0, 100) + '...' || 'N/A'
    });

    if (!highlightedText || !promptContent) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: highlightedText and promptContent' },
        { status: 400 }
      );
    }

    // Get model configuration from user settings
    const modelConfig = userSettings?.quickActionsModelConfig || {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 300
    };

    // Get the appropriate API key based on provider
    let apiKey: string;
    switch (modelConfig.provider) {
      case 'openai':
        apiKey = userSettings?.openaiApiKey;
        break;
      case 'anthropic':
        apiKey = userSettings?.anthropicApiKey;
        break;
      case 'google':
        apiKey = userSettings?.googleApiKey;
        break;
      default:
        apiKey = userSettings?.openaiApiKey;
    }

    if (!apiKey) {
      console.error(`❌ ${modelConfig.provider} API key not provided in user settings`);
      
      // For quick actions generation, return placeholder message instead of error
      if (action === 'generate') {
        return NextResponse.json({ 
          actions: ["API key not configured", `Please add your ${modelConfig.provider} API key in Settings`, "Go to Settings > API Keys to configure"] 
        });
      }
      
      // For apply actions, return error
      return NextResponse.json(
        { error: `${modelConfig.provider} API key required. Please add your API key in Settings > API Keys.` },
        { status: 400 }
      );
    }

    if (action === 'generate') {
      // Generate quick actions
      console.log('🤖 Generating quick actions...');
      const systemPrompt = getSystemPrompt(userSettings);
      const userPrompt = `Full prompt: "${promptContent}"
Highlighted section: "${highlightedText}"`;

      console.log('📋 System prompt length:', systemPrompt.length);
      console.log('📋 User prompt length:', userPrompt.length);
      console.log('🔧 Using model config:', modelConfig);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const content = await callProvider(messages, modelConfig, apiKey);
      console.log('📝 Provider content:', content);
      
      if (!content) {
        console.error('❌ No content from provider');
        throw new Error('No content from provider');
      }

      // Parse the JSON array from the model's response
      try {
        console.log('🔍 Parsing provider response...');
        
        // Clean the content by removing markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('🧹 Cleaned content:', cleanContent);
        
        const parsed = JSON.parse(cleanContent);
        console.log('✅ Parsed response:', parsed);
        
        if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
          console.log('✅ Successfully generated actions:', parsed);
          return NextResponse.json({ actions: parsed });
        }
        throw new Error('Response is not an array of strings');
      } catch (e) {
        console.error('❌ Failed to parse provider response:', e);
        console.error('Raw content:', content);
        throw new Error('Failed to parse quick actions response: ' + e);
      }

    } else if (action === 'apply') {
      // Apply a specific action
      console.log('🔧 Applying action:', actionText);
      
      if (!actionText) {
        console.error('❌ Missing actionText for apply action');
        return NextResponse.json(
          { error: 'Missing actionText for apply action' },
          { status: 400 }
        );
      }

      const systemPrompt = `You are an expert prompt editor. You will receive a full prompt, a highlighted section, and an editing instruction. Apply the instruction to the highlighted section in the context of the full prompt. Return ONLY the new version of the highlighted section (no explanation, no JSON, just the replacement text).`;
      
      const userPrompt = `Full prompt: "${promptContent}"
Highlighted section: "${highlightedText}"
Instruction: "${actionText}"`;

      console.log('📋 Apply system prompt length:', systemPrompt.length);
      console.log('📋 Apply user prompt length:', userPrompt.length);
      console.log('🔧 Using model config for apply:', modelConfig);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }  
      ];

      // Use slightly lower temperature and fewer tokens for apply action
      const applyConfig = {
        ...modelConfig,
        temperature: Math.max(0.1, modelConfig.temperature - 0.1),
        maxTokens: Math.min(200, modelConfig.maxTokens)
      };

      const content = await callProvider(messages, applyConfig, apiKey);
      console.log('📝 Apply provider content:', content);
      
      if (!content) {
        console.error('❌ No content from provider for apply action');
        throw new Error('No content from provider');
      }

      console.log('✅ Successfully applied action, result:', content.trim());
      return NextResponse.json({ result: content.trim() });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "generate" or "apply"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('💥 Quick actions API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 