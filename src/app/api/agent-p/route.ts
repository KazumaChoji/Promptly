import { NextRequest, NextResponse } from 'next/server';
import { agentPService, type AgentPRequest } from '@/lib/agent-p-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, userMessage, context, existingPrompt, userSettings } = body;

    // Validate required fields
    if (!mode || !userMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: mode and userMessage' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!agentPService.isModeSupported(mode)) {
      return NextResponse.json(
        { error: `Unsupported mode: ${mode}. Supported modes: ${agentPService.getAvailableModes().join(', ')}` },
        { status: 400 }
      );
    }

    const agentPRequest: AgentPRequest = {
      mode,
      userMessage,
      context,
      existingPrompt,
      userSettings
    };

    const response = await agentPService.generateResponse(agentPRequest);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Agent P API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const availableModes = agentPService.getAvailableModes();
    const modeDescriptions = availableModes.map(mode => ({
      mode,
      description: agentPService.getModeDescription(mode)
    }));

    return NextResponse.json({
      availableModes: modeDescriptions,
      service: 'Agent P - Elite Prompt Design Engineer',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Agent P API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Agent P information' },
      { status: 500 }
    );
  }
} 