"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  PlayIcon as Play, 
  Cog6ToothIcon as Settings, 
  PencilIcon as Edit, 
  DocumentArrowDownIcon as Save, 
  XMarkIcon as X,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  ClockIcon as Clock
} from "@heroicons/react/24/outline";
import { AVAILABLE_MODELS } from "../../lib/llm-service";

interface TestBatch {
  id: string;
  name: string;
  description?: string;
  testCases: any[];
  created: Date;
}

interface ExperimentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

interface BatchHeaderProps {
  batch: TestBatch | null;
  experimentConfig: ExperimentConfig;
  onUpdateExperimentConfig: (config: Partial<ExperimentConfig>) => void;
  onRenameBatch: (newName: string) => void;
  onRunBatch: () => void;
  isRunning: boolean;
}

export function BatchHeader({
  batch,
  experimentConfig,
  onUpdateExperimentConfig,
  onRenameBatch,
  onRunBatch,
  isRunning
}: BatchHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");

  const getBatchStats = () => {
    if (!batch) return { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
    
    const testCases = batch.testCases || [];
    return {
      total: testCases.length,
      completed: testCases.filter(tc => tc.status === 'success').length,
      failed: testCases.filter(tc => tc.status === 'error').length,
      running: testCases.filter(tc => tc.status === 'running').length,
      pending: testCases.filter(tc => tc.status === 'pending').length
    };
  };

  const startEditingName = () => {
    setEditingName(batch?.name || "");
    setIsEditingName(true);
  };

  const saveName = () => {
    if (editingName.trim()) {
      onRenameBatch(editingName.trim());
    }
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
  };

  const stats = getBatchStats();

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No batch selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Batch name and stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') cancelEditingName();
                  }}
                  className="w-48 bg-gray-900 border-gray-600 text-white"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={saveName}
                  className="h-8 px-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditingName}
                  className="h-8 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">{batch.name}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditingName}
                  disabled={isRunning}
                  className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>



          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">{stats.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">{stats.failed}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">{stats.running}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {stats.total} total
            </Badge>
          </div>
        </div>

        {/* Right side - Model config and run button */}
        <div className="flex items-center gap-4">
          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Model:</span>
            <Select 
              value={experimentConfig.model} 
              onValueChange={(value) => onUpdateExperimentConfig({ model: value })}
              disabled={isRunning}
            >
              <SelectTrigger className="w-48 bg-gray-900 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-gray-300 focus:bg-gray-700">
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {model.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Temp:</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={experimentConfig.temperature}
              onChange={(e) => onUpdateExperimentConfig({ temperature: parseFloat(e.target.value) })}
              disabled={isRunning}
              className="w-20"
            />
            <span className="text-sm text-gray-300 w-8">{experimentConfig.temperature}</span>
          </div>

          {/* Max tokens */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Max:</span>
            <input
              type="number"
              value={experimentConfig.maxTokens}
              onChange={(e) => onUpdateExperimentConfig({ maxTokens: parseInt(e.target.value) })}
              disabled={isRunning}
              className="w-16 bg-gray-900 border-gray-600 text-white text-sm px-2 py-1 rounded"
            />
          </div>

          {/* Run button */}
          <Button
            onClick={onRunBatch}
            disabled={isRunning || stats.total === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Batch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 