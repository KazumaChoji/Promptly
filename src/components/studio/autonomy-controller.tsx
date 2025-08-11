"use client";

import React, { useState } from 'react';
import { AutonomyLevel, AutonomyConfig } from '../../lib/ai-editor-types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { 
  ShieldCheckIcon as Shield, 
  UserIcon as User, 
  CpuChipIcon as Bot, 
  SparklesIcon as Sparkles, 
  Cog6ToothIcon as Settings,
  ExclamationTriangleIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  BoltIcon as Zap
} from '@heroicons/react/24/outline';

interface AutonomyControllerProps {
  currentLevel: AutonomyLevel;
  onLevelChange: (level: AutonomyLevel) => void;
  config: AutonomyConfig;
  onConfigChange?: (config: Partial<AutonomyConfig>) => void;
  className?: string;
}

const autonomyLevels: {
  level: AutonomyLevel;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    level: 'manual',
    name: 'Manual',
    description: 'Full human control - AI provides suggestions only',
    icon: <User className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    level: 'partial',
    name: 'Partial',
    description: 'AI suggests and applies high-confidence changes with confirmation',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    level: 'assisted',
    name: 'Assisted',
    description: 'AI applies changes automatically with user oversight',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    level: 'autonomous',
    name: 'Autonomous',
    description: 'AI operates independently with full editing capabilities',
    icon: <Bot className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

export function AutonomyController({
  currentLevel,
  onLevelChange,
  config,
  onConfigChange,
  className = ""
}: AutonomyControllerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const currentLevelInfo = autonomyLevels.find(l => l.level === currentLevel)!;

  const handleLevelChange = (level: AutonomyLevel) => {
    onLevelChange(level);
    // Update config based on new level
    if (onConfigChange) {
      const newConfig = getAutonomyConfig(level);
      onConfigChange(newConfig);
    }
  };

  const getAutonomyConfig = (level: AutonomyLevel): Partial<AutonomyConfig> => {
    const configs: Record<AutonomyLevel, Partial<AutonomyConfig>> = {
      manual: {
        autoApplyThreshold: 1.0,
        requireConfirmation: true,
        maxBatchSize: 1,
        allowedEditTypes: ['custom']
      },
      partial: {
        autoApplyThreshold: 0.9,
        requireConfirmation: true,
        maxBatchSize: 3,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      },
      assisted: {
        autoApplyThreshold: 0.8,
        requireConfirmation: false,
        maxBatchSize: 5,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      },
      autonomous: {
        autoApplyThreshold: 0.7,
        requireConfirmation: false,
        maxBatchSize: 10,
        allowedEditTypes: ['replacement', 'insertion', 'deletion', 'formatting', 'custom']
      }
    };
    return configs[level];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Level Display */}
      <Card className={`p-4 ${currentLevelInfo.bgColor} ${currentLevelInfo.borderColor} border-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentLevelInfo.bgColor} ${currentLevelInfo.color}`}>
              {currentLevelInfo.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentLevelInfo.name} Mode</h3>
              <p className="text-sm text-gray-600">{currentLevelInfo.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${currentLevelInfo.color} ${currentLevelInfo.bgColor}`}>
              Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs"
            >
              <Settings className="w-4 h-4 mr-1" />
              Advanced
            </Button>
          </div>
        </div>
      </Card>

      {/* Level Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {autonomyLevels.map((level) => (
          <Card
            key={level.level}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              currentLevel === level.level
                ? `${level.bgColor} ${level.borderColor} border-2`
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleLevelChange(level.level)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${level.bgColor} ${level.color}`}>
                {level.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{level.name}</h4>
                <p className="text-xs text-gray-500">{level.description}</p>
              </div>
            </div>
            
            {currentLevel === level.level && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Active
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Advanced Configuration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auto-apply Threshold */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Auto-apply Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.1"
                    value={config.autoApplyThreshold}
                    onChange={(e) => onConfigChange?.({ 
                      autoApplyThreshold: parseFloat(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {(config.autoApplyThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Minimum confidence for automatic application
                </p>
              </div>

              {/* Max Batch Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Max Batch Size
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.maxBatchSize}
                    onChange={(e) => onConfigChange?.({ 
                      maxBatchSize: parseInt(e.target.value) 
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">changes</span>
                </div>
                <p className="text-xs text-gray-500">
                  Maximum changes per batch
                </p>
              </div>

              {/* Confirmation Required */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Confirmation Required
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.requireConfirmation}
                    onChange={(e) => onConfigChange?.({ 
                      requireConfirmation: e.target.checked 
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {config.requireConfirmation ? 'Yes' : 'No'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Require user confirmation for changes
                </p>
              </div>
            </div>

            {/* Allowed Edit Types */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Allowed Edit Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['replacement', 'insertion', 'deletion', 'formatting', 'custom'].map((type) => (
                  <label key={type} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={config.allowedEditTypes.includes(type as any)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...config.allowedEditTypes, type as any]
                          : config.allowedEditTypes.filter(t => t !== type);
                        onConfigChange?.({ allowedEditTypes: newTypes });
                      }}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-600 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Safety Warnings */}
      {currentLevel === 'autonomous' && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Autonomous Mode Active</h4>
              <p className="text-sm text-orange-700 mt-1">
                AI will make changes automatically with minimal human oversight. 
                Review changes carefully and use undo if needed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Speed</p>
              <p className="text-sm text-blue-800">
                {currentLevel === 'manual' ? 'Slow' : 
                 currentLevel === 'partial' ? 'Moderate' :
                 currentLevel === 'assisted' ? 'Fast' : 'Very Fast'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">Safety</p>
              <p className="text-sm text-green-800">
                {currentLevel === 'manual' ? 'Very High' : 
                 currentLevel === 'partial' ? 'High' :
                 currentLevel === 'assisted' ? 'Moderate' : 'Low'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">AI Control</p>
              <p className="text-sm text-purple-800">
                {currentLevel === 'manual' ? 'None' : 
                 currentLevel === 'partial' ? 'Low' :
                 currentLevel === 'assisted' ? 'Medium' : 'High'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 