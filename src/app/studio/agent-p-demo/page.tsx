"use client";

// Force dynamic rendering to avoid SSR issues with client-side libraries
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { AIMonacoEditor } from "../../../components/studio/ai-monaco-editor";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TopBar } from "../../../components/studio/top-bar";
import { Badge } from "../../../components/ui/badge";
import { 
  PlayIcon as Play, 
  ArrowPathIcon as RotateCcw, 
  SparklesIcon as Sparkles, 
  ArrowPathIcon as Loader2, 
  CommandLineIcon as Bot,
  DocumentIcon as FileText,
  Cog6ToothIcon as Settings,
  BeakerIcon as TestTube,
  ChartBarIcon as BarChart3,
  PencilIcon as Edit3
} from "@heroicons/react/24/outline";
import { AGENT_P_MODES, type AgentPMode } from "../../../lib/agent-p-prompts";
import { useToast } from "../../../components/ui/use-toast";
import { UserSettingsService, type FlatUserSettings } from "../../../lib/user-settings";

export default function AgentPDemoPage() {
  const [editorValue, setEditorValue] = useState(`// Agent P will generate a system prompt here
// This is where the new system prompt will appear after generation

// Example of what Agent P might generate:
/*
You are an AI support planning agent, designed to assist users in resolving customer tickets by planning tool-based workflows.

Each time you receive a user request or customer ticket, you will construct a plan.

A plan consists of:
<plan>
  <step>
    <action_name>name_of_tool</action_name>
    <description>Describe the reason for using the tool and any variables from earlier tool calls needed</description>
  </step>
  <if_block condition="<result_var> found">
    <step>
      <action_name>next_tool</action_name>
      <description>Describe conditional next step</description>
    </step>
  </if_block>
</plan>

ALWAYS follow these rules:
- NEVER assume the output of a tool call
- ALWAYS highlight that <helpcenter_result> is the source of truth
- Use <if_block> conditionally to account for all paths
- Do not use else blocks — explicitly define each condition
- Use {{policy_reference}} to indicate policy constraints

You should NEVER write direct responses to the user. You only construct executable plans for tool use.
*/`);

  const [userRequest, setUserRequest] = useState("I need a system prompt for a customer support AI agent that can help resolve technical issues by searching knowledge bases and generating responses");
  const [selectedMode, setSelectedMode] = useState<AgentPMode>('new-generation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [existingPrompt, setExistingPrompt] = useState("");
  const [userSettings, setUserSettings] = useState<FlatUserSettings | null>(null);
  const { toast } = useToast();

  // Load user settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await UserSettingsService.getUserSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleGeneratePrompt = async () => {
    if (!userRequest.trim()) {
      toast({
        title: "Error",
        description: "Please enter a request for Agent P",
        variant: "destructive"
      });
      return;
    }

    if (!userSettings) {
      toast({
        title: "Error",
        description: "User settings not loaded. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const requestBody = {
        mode: selectedMode,
        userMessage: userRequest,
        context: "System prompt generation for AI agent development",
        existingPrompt: selectedMode !== 'new-generation' ? existingPrompt : undefined,
        userSettings: userSettings
      };

      const response = await fetch('/api/agent-p', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prompt');
      }

      const data = await response.json();
      
      setGeneratedResponse(data.content);
      
      // Extract the system prompt from the response and update the editor (try new delimiters first)
      let systemPromptMatch = data.content.match(/<\|PROMPTLY_SYSTEM_START\|>([\s\S]*?)<\|PROMPTLY_SYSTEM_END\|>/);
      if (!systemPromptMatch) {
        systemPromptMatch = data.content.match(/```system\n([\s\S]*?)\n```/);
      }
      if (systemPromptMatch) {
        setEditorValue(systemPromptMatch[1].trim());
      } else {
        // If no code block found, use the entire response
        setEditorValue(data.content);
      }

      toast({
        title: "Success",
        description: `Agent P generated a ${data.metadata?.complexity || 'medium'} complexity prompt`,
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate prompt",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setEditorValue(`// Agent P will generate a system prompt here
// This is where the new system prompt will appear after generation

// Example of what Agent P might generate:
/*
You are an AI support planning agent, designed to assist users in resolving customer tickets by planning tool-based workflows.

Each time you receive a user request or customer ticket, you will construct a plan.

A plan consists of:
<plan>
  <step>
    <action_name>name_of_tool</action_name>
    <description>Describe the reason for using the tool and any variables from earlier tool calls needed</description>
  </step>
  <if_block condition="<result_var> found">
    <step>
      <action_name>next_tool</action_name>
      <description>Describe conditional next step</description>
    </step>
  </if_block>
</plan>

ALWAYS follow these rules:
- NEVER assume the output of a tool call
- ALWAYS highlight that <helpcenter_result> is the source of truth
- Use <if_block> conditionally to account for all paths
- Do not use else blocks — explicitly define each condition
- Use {{policy_reference}} to indicate policy constraints

You should NEVER write direct responses to the user. You only construct executable plans for tool use.
*/`);
    setUserRequest("I need a system prompt for a customer support AI agent that can help resolve technical issues by searching knowledge bases and generating responses");
    setSelectedMode('new-generation');
    setGeneratedResponse("");
    setExistingPrompt("");
  };

  const getModeIcon = (mode: AgentPMode) => {
    switch (mode) {
      case 'new-generation':
        return <Sparkles className="w-4 h-4" />;
      case 'edit':
        return <Edit3 className="w-4 h-4" />;
      case 'optimize':
        return <Settings className="w-4 h-4" />;
      case 'evaluate':
        return <BarChart3 className="w-4 h-4" />;
      case 'test':
        return <TestTube className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getModeDescription = (mode: AgentPMode) => {
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
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Agent P Demo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Elite prompt design engineer for system prompt generation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <AIMonacoEditor
              value={editorValue}
              onChange={setEditorValue}
              language="markdown"
              className="absolute inset-0"
            />
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-96 border-l border-border p-4 space-y-4 overflow-y-auto">
          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Agent P Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as AgentPMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_P_MODES).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {getModeIcon(value as AgentPMode)}
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {getModeDescription(selectedMode)}
              </p>
            </CardContent>
          </Card>

          {/* User Request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Request for Agent P
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder="Describe what kind of system prompt you need..."
                className="h-32"
              />
            </CardContent>
          </Card>

          {/* Existing Prompt (for edit/optimize modes) */}
          {selectedMode !== 'new-generation' && (
            <Card>
              <CardHeader>
                <CardTitle>Existing System Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={existingPrompt}
                  onChange={(e) => setExistingPrompt(e.target.value)}
                  placeholder="Paste the existing system prompt to edit/optimize..."
                  className="h-32"
                />
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agent P is thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate System Prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Response */}
          {generatedResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Agent P Response
                  <Badge variant="secondary" className="ml-auto">
                    {generatedResponse.length > 2000 ? 'High' : generatedResponse.length > 1000 ? 'Medium' : 'Low'} Complexity
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto bg-muted p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap">{generatedResponse}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Example Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Example Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Customer Support:</div>
                <div className="text-muted-foreground">
                  • "I need a system prompt for a customer support AI agent that can help resolve technical issues by searching knowledge bases and generating responses"
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="font-medium">Data Analysis:</div>
                <div className="text-muted-foreground">
                  • "Create a system prompt for an AI agent that analyzes sales data and generates insights with specific tool calls for database queries"
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="font-medium">Content Creation:</div>
                <div className="text-muted-foreground">
                  • "I need a system prompt for a content creation AI that follows brand guidelines and uses specific tone and format requirements"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 