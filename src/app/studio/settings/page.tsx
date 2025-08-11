"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DocumentArrowDownIcon as Save, ArrowLeftIcon as ArrowLeft, KeyIcon as Key, CodeBracketIcon as Code, Cog6ToothIcon as Settings, TrashIcon as Trash } from "@heroicons/react/24/outline";
import { useToast } from "../../../components/ui/use-toast";
import { UserSettingsService, FlatUserSettings } from "@/lib/user-settings";
import { AVAILABLE_MODELS, getModelsByProvider } from "@/lib/llm-service";
import { useDesktopStore } from "@/lib/desktop-store";
import { BatchPersistenceService } from "@/lib/batch-persistence";
import Link from "next/link";

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<FlatUserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await UserSettingsService.getUserSettings();
        console.log('Loaded settings:', userSettings);
        setSettings(userSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const success = await UserSettingsService.updateUserSettings(settings);
      if (success) {
        toast({
          title: "Settings saved",
          description: "Your settings have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof FlatUserSettings, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleClearAllData = async () => {
    if (!confirm("Are you sure you want to clear all data? This will delete all files, folders, batch tests, and inference history. This action cannot be undone.")) {
      return;
    }

    setIsClearingData(true);
    try {
      // Clear desktop store files and folders
      const { files } = useDesktopStore.getState();
      
      // Clear localStorage data
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('promptly-studio') || 
        key.includes('studio-file-content-') ||
        key.includes('folders-initialized')
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear batch persistence data
      BatchPersistenceService.clearAllData();

      toast({
        title: "Data cleared",
        description: "All data has been successfully cleared. Please refresh the page.",
      });

      // Refresh the page to reset the application state
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Failed to clear data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearingData(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load settings</p>
          <Button 
            onClick={() => typeof window !== 'undefined' && window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground">
      <div className="h-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Link href="/studio">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Studio
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Settings Content */}
        <div className="p-6">
          <Tabs defaultValue="api-keys" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="api-keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                System Prompts
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Model Configuration
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Trash className="h-4 w-4" />
                Data Management
              </TabsTrigger>
            </TabsList>


            <TabsContent value="api-keys" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">API Keys</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter your API keys to use AI models. These keys are stored locally and securely in your browser.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                        <p className="text-sm text-muted-foreground">Your OpenAI API key for GPT models</p>
                      </div>
                      <div className="w-80">
                        <Input
                          id="openaiApiKey"
                          type="password"
                          value={settings.openaiApiKey}
                          onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                          placeholder="sk-..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="anthropicApiKey">Anthropic API Key</Label>
                        <p className="text-sm text-muted-foreground">Your Anthropic API key for Claude models</p>
                      </div>
                      <div className="w-80">
                        <Input
                          id="anthropicApiKey"
                          type="password"
                          value={settings.anthropicApiKey}
                          onChange={(e) => updateSetting('anthropicApiKey', e.target.value)}
                          placeholder="sk-ant-..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="googleApiKey">Google API Key</Label>
                        <p className="text-sm text-muted-foreground">Your Google API key for Gemini models</p>
                      </div>
                      <div className="w-80">
                        <Input
                          id="googleApiKey"
                          type="password"
                          value={settings.googleApiKey}
                          onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                          placeholder="AIza..."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">System Prompts</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Customize the system prompts used by different AI features in Promptly.
                  </p>
                  
                  <Tabs defaultValue="agent-p-new" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="agent-p-new">Agent P</TabsTrigger>
                      <TabsTrigger value="quick-edit">Quick Edit</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="agent-p-new" className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="agentPNewGeneration">New Generation Mode</Label>
                          <p className="text-sm text-muted-foreground mb-2">Prompt for creating new system prompts from scratch</p>
                          <Textarea
                            id="agentPNewGeneration"
                            value={settings.agentPPrompts.newGeneration}
                            onChange={(e) => updateSetting('agentPPrompts', {
                              ...settings.agentPPrompts,
                              newGeneration: e.target.value
                            })}
                            className="min-h-[200px] font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="agentPEdit">Edit Mode</Label>
                          <p className="text-sm text-muted-foreground mb-2">Prompt for editing existing system prompts</p>
                          <Textarea
                            id="agentPEdit"
                            value={settings.agentPPrompts.edit}
                            onChange={(e) => updateSetting('agentPPrompts', {
                              ...settings.agentPPrompts,
                              edit: e.target.value
                            })}
                            className="min-h-[150px] font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="agentPOptimize">Optimize Mode</Label>
                          <p className="text-sm text-muted-foreground mb-2">Prompt for optimizing system prompts</p>
                          <Textarea
                            id="agentPOptimize"
                            value={settings.agentPPrompts.optimize}
                            onChange={(e) => updateSetting('agentPPrompts', {
                              ...settings.agentPPrompts,
                              optimize: e.target.value
                            })}
                            className="min-h-[150px] font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="agentPEvaluate">Evaluate Mode</Label>
                          <p className="text-sm text-muted-foreground mb-2">Prompt for evaluating system prompts</p>
                          <Textarea
                            id="agentPEvaluate"
                            value={settings.agentPPrompts.evaluate}
                            onChange={(e) => updateSetting('agentPPrompts', {
                              ...settings.agentPPrompts,
                              evaluate: e.target.value
                            })}
                            className="min-h-[150px] font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="agentPTest">Test Mode</Label>
                          <p className="text-sm text-muted-foreground mb-2">Prompt for testing system prompts</p>
                          <Textarea
                            id="agentPTest"
                            value={settings.agentPPrompts.test}
                            onChange={(e) => updateSetting('agentPPrompts', {
                              ...settings.agentPPrompts,
                              test: e.target.value
                            })}
                            className="min-h-[150px] font-mono text-sm"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="quick-edit" className="space-y-4">
                      <div>
                        <Label htmlFor="quickEditPrompt">Quick Edit Prompt</Label>
                        <p className="text-sm text-muted-foreground mb-2">Prompt for generating quick editing suggestions</p>
                        <Textarea
                          id="quickEditPrompt"
                          value={settings.quickEditPrompt}
                          onChange={(e) => updateSetting('quickEditPrompt', e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>
                    </TabsContent>
                    
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Model Configuration</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure the AI models and parameters used by different features in Promptly.
                  </p>
                  
                  <div className="space-y-8">
                    {/* Agent P Configuration */}
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Agent P</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="agentPProvider">Provider</Label>
                          <Select
                            value={settings.agentPModelConfig.provider}
                            onValueChange={(value: 'openai' | 'anthropic' | 'google') => 
                              updateSetting('agentPModelConfig', {
                                ...settings.agentPModelConfig,
                                provider: value,
                                model: getModelsByProvider(value)[0]?.id || ''
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="agentPModel">Model</Label>
                          <Select
                            value={settings.agentPModelConfig.model}
                            onValueChange={(value) => 
                              updateSetting('agentPModelConfig', {
                                ...settings.agentPModelConfig,
                                model: value
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getModelsByProvider(settings.agentPModelConfig.provider).map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="agentPTemperature">Temperature: {settings.agentPModelConfig.temperature}</Label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.agentPModelConfig.temperature}
                            onChange={(e) => 
                              updateSetting('agentPModelConfig', {
                                ...settings.agentPModelConfig,
                                temperature: parseFloat(e.target.value)
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label htmlFor="agentPMaxTokens">Max Tokens</Label>
                          <Input
                            type="number"
                            min="100"
                            max="8000"
                            value={settings.agentPModelConfig.maxTokens}
                            onChange={(e) => 
                              updateSetting('agentPModelConfig', {
                                ...settings.agentPModelConfig,
                                maxTokens: parseInt(e.target.value) || 2000
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions Configuration */}
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quickActionsProvider">Provider</Label>
                          <Select
                            value={settings.quickActionsModelConfig.provider}
                            onValueChange={(value: 'openai' | 'anthropic' | 'google') => 
                              updateSetting('quickActionsModelConfig', {
                                ...settings.quickActionsModelConfig,
                                provider: value,
                                model: getModelsByProvider(value)[0]?.id || ''
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quickActionsModel">Model</Label>
                          <Select
                            value={settings.quickActionsModelConfig.model}
                            onValueChange={(value) => 
                              updateSetting('quickActionsModelConfig', {
                                ...settings.quickActionsModelConfig,
                                model: value
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getModelsByProvider(settings.quickActionsModelConfig.provider).map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quickActionsTemperature">Temperature: {settings.quickActionsModelConfig.temperature}</Label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.quickActionsModelConfig.temperature}
                            onChange={(e) => 
                              updateSetting('quickActionsModelConfig', {
                                ...settings.quickActionsModelConfig,
                                temperature: parseFloat(e.target.value)
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quickActionsMaxTokens">Max Tokens</Label>
                          <Input
                            type="number"
                            min="50"
                            max="2000"
                            value={settings.quickActionsModelConfig.maxTokens}
                            onChange={(e) => 
                              updateSetting('quickActionsModelConfig', {
                                ...settings.quickActionsModelConfig,
                                maxTokens: parseInt(e.target.value) || 300
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Data Management</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Manage your local data including files, folders, and application settings.
                  </p>
                  
                  <div className="space-y-6">
                    {/* Storage Info */}
                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <h3 className="font-medium mb-2">Local Storage Information</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        All your data is stored locally in your browser. This includes:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Files and folders in the file explorer</li>
                        <li>• Batch test configurations and results</li>
                        <li>• Inference history and settings</li>
                        <li>• Application preferences</li>
                      </ul>
                    </div>

                    {/* Clear All Data */}
                    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                      <div className="flex items-start gap-4">
                        <Trash className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-destructive mb-2">Clear All Data</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This will permanently delete all your files, folders, batch tests, inference history, and application data. 
                            This action cannot be undone.
                          </p>
                          <Button 
                            variant="destructive" 
                            onClick={handleClearAllData}
                            disabled={isClearingData}
                          >
                            {isClearingData ? "Clearing..." : "Clear All Data"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}