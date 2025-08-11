"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BatchHeader } from "./batch-header";
import { TestCaseGrid } from "./test-case-grid";
import { TestResultViewer } from "./test-result-viewer";
import { type ChatTestCase } from "./chat-test-case";

interface TestBatch {
  id: string;
  name: string;
  description?: string;
  testCases: ChatTestCase[];
  created: Date;
}

interface ExperimentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

interface BatchEditorProps {
  batch: TestBatch | null;
  experimentConfig: ExperimentConfig;
  onUpdateExperimentConfig: (config: Partial<ExperimentConfig>) => void;
  onRenameBatch: (newName: string) => void;
  onAddTestCase: () => void;
  onUpdateTestCase: (testCaseId: string, updates: Partial<ChatTestCase>) => void;
  onRemoveTestCase: (testCaseId: string) => void;
  onDuplicateTestCase: (testCaseId: string) => void;
  onRunTestCase: (testCaseId: string) => void;
  onRunBatch: () => void;
  onCopyResult: (testCaseId: string) => void;
  onExportResults: () => void;
  isRunning: boolean;
  systemPromptName: string;
}

export function BatchEditor({
  batch,
  experimentConfig,
  onUpdateExperimentConfig,
  onRenameBatch,
  onAddTestCase,
  onUpdateTestCase,
  onRemoveTestCase,
  onDuplicateTestCase,
  onRunTestCase,
  onRunBatch,
  onCopyResult,
  onExportResults,
  isRunning,
  systemPromptName
}: BatchEditorProps) {
  const [activeTab, setActiveTab] = useState("test-cases");

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-gray-600 rounded"></div>
          </div>
          <h3 className="text-lg font-medium mb-2">No batch selected</h3>
          <p className="text-sm">Select a batch from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Batch Header */}
      <BatchHeader
        batch={batch}
        experimentConfig={experimentConfig}
        onUpdateExperimentConfig={onUpdateExperimentConfig}
        onRenameBatch={onRenameBatch}
        onRunBatch={onRunBatch}
        isRunning={isRunning}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="test-cases" className="data-[state=active]:bg-gray-700 text-gray-300">
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-gray-700 text-gray-300">
              Results
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="test-cases" className="flex-1 overflow-y-auto p-6">
            <TestCaseGrid
              testCases={batch.testCases}
              onAddTestCase={onAddTestCase}
              onUpdateTestCase={onUpdateTestCase}
              onRemoveTestCase={onRemoveTestCase}
              onDuplicateTestCase={onDuplicateTestCase}
              onRunTestCase={onRunTestCase}
              isRunning={isRunning}
              systemPromptName={systemPromptName}
            />
          </TabsContent>
          
          <TabsContent value="results" className="flex-1 overflow-y-auto p-6">
            <TestResultViewer
              testCases={batch.testCases}
              onCopyResult={onCopyResult}
              onExportResults={onExportResults}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 