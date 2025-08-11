import { NextRequest, NextResponse } from 'next/server';
import { LLMResponse } from '@/lib/llm-service';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

interface EnhancedInferenceRequest {
  prompt: string;
  testInput: string;
  model: {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'google';
    maxTokens: number;
  };
  temperature?: number;
  maxTokens?: number;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

async function callOpenAI(request: EnhancedInferenceRequest, apiKey: string): Promise<LLMResponse> {
  try {
    console.log('OpenAI - Making API call with model:', request.model.id);
    
    const requestBody = {
      model: request.model.id,
      messages: [
        {
          role: 'system',
          content: request.prompt,
        },
        {
          role: 'user',
          content: request.testInput,
        },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
    };
    
    console.log('OpenAI - Request body:', {
      ...requestBody,
      messages: requestBody.messages.map(m => ({ role: m.role, contentLength: m.content.length }))
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('OpenAI - Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI - API error response:', error);
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log('OpenAI - Success response:', {
      choices: data.choices?.length,
      usage: data.usage,
      firstChoiceFinishReason: data.choices?.[0]?.finish_reason,
    });
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: request.model.id,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
      finish_reason: data.choices[0]?.finish_reason,
    };
  } catch (error) {
    console.error('OpenAI - Error in callOpenAI:', error);
    return {
      content: '',
      model: request.model.id,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
    };
  }
}

async function callAnthropic(request: EnhancedInferenceRequest, apiKey: string): Promise<LLMResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model.id,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
        messages: [
          {
            role: 'system',
            content: request.prompt,
          },
          {
            role: 'user',
            content: request.testInput,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      model: request.model.id,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finish_reason: data.stop_reason,
    };
  } catch (error) {
    return {
      content: '',
      model: request.model.id,
      error: error instanceof Error ? error.message : 'Unknown Anthropic error',
    };
  }
}

async function callGoogle(request: EnhancedInferenceRequest, apiKey: string): Promise<LLMResponse> {
  try {
    console.log('Google - Making API call with model:', request.model.id);
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${request.prompt}\n\n${request.testInput}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: 0.9,
        maxOutputTokens: request.maxTokens ?? 1000,
      }
    };
    
    console.log('Google - Request body:', {
      contentsLength: requestBody.contents.length,
      partsLength: requestBody.contents[0].parts.length,
      textLength: requestBody.contents[0].parts[0].text.length
    });
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model.id}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Google - Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Google - API error response:', error);
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log('Google - Success response:', {
      candidates: data.candidates?.length,
      firstCandidateFinishReason: data.candidates?.[0]?.finishReason,
    });
    
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: request.model.id,
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
      finish_reason: data.candidates?.[0]?.finishReason,
    };
  } catch (error) {
    console.error('Google - Error in callGoogle:', error);
    return {
      content: '',
      model: request.model.id,
      error: error instanceof Error ? error.message : 'Unknown Google error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhancedInferenceRequest = await request.json();
    
    console.log('API Route - Received request:', {
      model: body.model?.id,
      provider: body.model?.provider,
      promptLength: body.prompt?.length,
      testInputLength: body.testInput?.length,
    });
    
    if (!body.prompt || !body.testInput || !body.model) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, testInput, model' },
        { status: 400 }
      );
    }

    // Validate temperature and maxTokens if provided
    if (body.temperature !== undefined && (body.temperature < 0 || body.temperature > 2)) {
      return NextResponse.json(
        { error: 'Temperature must be between 0 and 2' },
        { status: 400 }
      );
    }

    if (body.maxTokens !== undefined && (body.maxTokens < 1 || body.maxTokens > 100000)) {
      return NextResponse.json(
        { error: 'Max tokens must be between 1 and 100000' },
        { status: 400 }
      );
    }

    // Get API keys from user request only (no environment fallback)
    const apiKeys = {
      openai: body.apiKeys?.openai || '',
      anthropic: body.apiKeys?.anthropic || '',
      google: body.apiKeys?.google || ''
    };
    
    let result: LLMResponse;
    
    // Route to appropriate provider
    console.log('API Route - Routing to provider:', body.model.provider);
    
    if (body.model.provider === 'openai') {
      if (!apiKeys.openai) {
        return NextResponse.json(
          { error: 'OpenAI API key required. Please add your API key in Settings > API Keys.' },
          { status: 400 }
        );
      }
      console.log('API Route - Calling OpenAI API...');
      result = await callOpenAI(body, apiKeys.openai);
    } else if (body.model.provider === 'anthropic') {
      if (!apiKeys.anthropic) {
        return NextResponse.json(
          { error: 'Anthropic API key required. Please add your API key in Settings > API Keys.' },
          { status: 400 }
        );
      }
      result = await callAnthropic(body, apiKeys.anthropic);
    } else if (body.model.provider === 'google') {
      if (!apiKeys.google) {
        return NextResponse.json(
          { error: 'Google API key required. Please add your API key in Settings > API Keys.' },
          { status: 400 }
        );
      }
      console.log('API Route - Calling Google API...');
      result = await callGoogle(body, apiKeys.google);
    } else {
      return NextResponse.json(
        { error: 'Unsupported model provider' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Inference API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 