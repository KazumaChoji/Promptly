"use client";

import React, { useState, useEffect } from 'react';
import { TestBatch } from '../../types/inference';
import { AVAILABLE_MODELS, getModelsByProvider } from '../../lib/llm-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface BatchConfigDialogProps {
  batch: TestBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (batch: TestBatch) => void;
}

export function BatchConfigDialog({ batch, isOpen, onClose, onSave }: BatchConfigDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // Initialize form with batch data
  useEffect(() => {
    if (batch) {
      setName(batch.name);
      setDescription(batch.metadata?.description || '');
      setProvider(batch.modelConfig?.provider || 'openai');
      setModel(batch.modelConfig?.model || 'gpt-4o-mini');
      setTemperature(batch.modelConfig?.temperature || 0.7);
      setMaxTokens(batch.modelConfig?.maxTokens || 1000);
    }
  }, [batch]);

  // Update model when provider changes
  useEffect(() => {
    const availableModels = getModelsByProvider(provider);
    if (availableModels.length > 0 && !availableModels.find(m => m.id === model)) {
      setModel(availableModels[0].id);
    }
  }, [provider, model]);

  const handleSave = () => {
    if (!batch) return;

    const updatedBatch: TestBatch = {
      ...batch,
      name: name.trim(),
      modelConfig: {
        provider,
        model,
        temperature,
        maxTokens
      },
      metadata: {
        ...batch.metadata,
        description: description.trim()
      }
    };

    onSave(updatedBatch);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Batch</DialogTitle>
          <DialogDescription>
            Set the name, description, and AI model configuration for this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Batch Name */}
          <div>
            <Label htmlFor="batchName">Batch Name</Label>
            <Input
              id="batchName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter batch name"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="batchDescription">Description (Optional)</Label>
            <Textarea
              id="batchDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter batch description"
              rows={2}
            />
          </div>

          {/* Model Configuration */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Model Configuration</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={provider} onValueChange={(value: 'openai' | 'anthropic' | 'google') => setProvider(value)}>
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
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelsByProvider(provider).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="temperature">Temperature: {temperature}</Label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                type="number"
                min="100"
                max="8000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}