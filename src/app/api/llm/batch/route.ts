import { NextRequest, NextResponse } from 'next/server';
// No imports needed for API keys - all provided by users

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

interface BatchRequest {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature?: number;
  max_tokens?: number;
  requests: Array<{
    custom_id: string;
    prompt: string;
    testInput: string;
    max_tokens?: number;
  }>;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}



async function createOpenAIBatch(request: BatchRequest, apiKey: string) {
  // Create batch file for OpenAI
  const batchRequests = request.requests.map((req) => ({
    custom_id: req.custom_id,
    method: "POST",
    url: "/v1/chat/completions",
    body: {
      model: request.model,
      messages: [
        {
          role: "system",
          content: req.prompt
        },
        {
          role: "user",
          content: req.testInput
        }
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? request.max_tokens ?? 1000,
    },
  }));

  // Upload batch file
  const fileContent = batchRequests.map(req => JSON.stringify(req)).join('\n');
  
  const fileResponse = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: (() => {
      const formData = new FormData();
      formData.append('file', new Blob([fileContent], { type: 'application/jsonl' }), 'batch.jsonl');
      formData.append('purpose', 'batch');
      return formData;
    })(),
  });

  if (!fileResponse.ok) {
    const error = await fileResponse.text();
    throw new Error(`OpenAI file upload error: ${error}`);
  }

  const fileData = await fileResponse.json();

  // Create batch
  const batchResponse = await fetch('https://api.openai.com/v1/batches', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_file_id: fileData.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    }),
  });

  if (!batchResponse.ok) {
    const error = await batchResponse.text();
    throw new Error(`OpenAI batch creation error: ${error}`);
  }

  return await batchResponse.json();
}

async function createAnthropicBatch(request: BatchRequest, apiKey: string) {
  // Anthropic batch processing
  const batchRequests = request.requests.map((req) => ({
    custom_id: req.custom_id,
    params: {
      model: request.model,
      max_tokens: req.max_tokens ?? request.max_tokens ?? 1000,
      temperature: request.temperature ?? 0.7,
      messages: [
        {
          role: "system",
          content: req.prompt
        },
        {
          role: "user",
          content: req.testInput
        }
      ],
    },
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages/batches', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'message-batches-2024-09-24',
    },
    body: JSON.stringify({
      requests: batchRequests,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic batch creation error: ${error}`);
  }

  return await response.json();
}

async function createGoogleBatch(request: BatchRequest, apiKey: string) {
  // Note: Google doesn't have a dedicated batch API like OpenAI/Anthropic
  // For now, we'll simulate batch processing by making individual requests
  // In a real implementation, you might want to handle this differently
  const results: Array<{
    custom_id: string;
    content: string;
    error: string | null;
  }> = [];
  
  for (const req of request.requests) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${req.prompt}\n\nTest Input: ${req.testInput}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            topP: 0.9,
            maxOutputTokens: req.max_tokens ?? request.max_tokens ?? 1000,
          }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${error}`);
      }

      const data = await response.json();
      results.push({
        custom_id: req.custom_id,
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        error: null
      });
    } catch (error) {
      results.push({
        custom_id: req.custom_id,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Return a simplified batch-like response
  return {
    id: `google_batch_${Date.now()}`,
    status: 'completed',
    created_at: Date.now(),
    results: results
  };
}

export async function POST(request: NextRequest) {
  try {
    
    const body: BatchRequest = await request.json();
    
    if (!body.provider || !body.model || !body.requests || body.requests.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, model, requests' },
        { status: 400 }
      );
    }

    // Get API keys from user request only (no environment fallback)
    const apiKeys = {
      openai: body.apiKeys?.openai || '',
      anthropic: body.apiKeys?.anthropic || '',
      google: body.apiKeys?.google || ''
    };

    const apiKey = body.provider === 'openai' ? apiKeys.openai : 
                   body.provider === 'anthropic' ? apiKeys.anthropic : 
                   apiKeys.google;
    
    if (!apiKey) {
      const providerName = body.provider === 'openai' ? 'OpenAI' : 
                          body.provider === 'anthropic' ? 'Anthropic' : 
                          'Google';
      return NextResponse.json(
        { error: `${providerName} API key required. Please add your API key in Settings > API Keys.` },
        { status: 400 }
      );
    }

    let batchData;

    if (body.provider === 'openai') {
      batchData = await createOpenAIBatch(body, apiKey);
    } else if (body.provider === 'anthropic') {
      batchData = await createAnthropicBatch(body, apiKey);
    } else if (body.provider === 'google') {
      batchData = await createGoogleBatch(body, apiKey);
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${body.provider}` },
        { status: 400 }
      );
    }

    // Record estimated usage for the batch
    const estimatedTokensPerRequest = 1000; // Rough estimate
    const estimatedTotalTokens = body.requests.length * estimatedTokensPerRequest;
    
    // Removed subscription logic

    return NextResponse.json({
      batch_id: batchData.id,
      status: batchData.status,
      created_at: batchData.created_at,
      request_count: body.requests.length,
      provider: body.provider,
      model: body.model,
    });
  } catch (error) {
    console.error('Batch API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 