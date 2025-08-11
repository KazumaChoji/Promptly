"use client";

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TestBatch, ChatTestCase } from '../../types/inference';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Bars3Icon as GripVertical, 
  ChevronDownIcon as ChevronDown, 
  ChevronRightIcon as ChevronRight, 
  PlusIcon as Plus, 
  PlayIcon as Play, 
  ClockIcon as Clock,
  EllipsisHorizontalIcon as MoreHorizontal,
  PencilIcon as Edit,
  DocumentDuplicateIcon as Copy,
  TrashIcon as Trash2
} from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DragDropTestCaseContainer } from './drag-drop-testcase-container';

interface DraggableBatchCardProps {
  batch: TestBatch;
  isSelected: boolean;
  isExpanded: boolean;
  isRunning: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddTestCase: () => void;
  onRunBatch: () => void;
  onEditBatch: (batch: TestBatch) => void;
  onDuplicateBatch: (batch: TestBatch) => void;
  onDeleteBatch: (batchId: string) => void;
  onTestCaseReorder: (testCases: ChatTestCase[]) => void;
  onEditTestCase: (testCase: ChatTestCase) => void;
  onDeleteTestCase: (testCaseId: string) => void;
  onRunTestCase: (testCaseId: string) => void;
  getBatchStatus: (batch: TestBatch) => { text: string; color: string };
}

export function DraggableBatchCard({
  batch,
  isSelected,
  isExpanded,
  isRunning,
  onSelect,
  onToggle,
  onAddTestCase,
  onRunBatch,
  onEditBatch,
  onDuplicateBatch,
  onDeleteBatch,
  onTestCaseReorder,
  onEditTestCase,
  onDeleteTestCase,
  onRunTestCase,
  getBatchStatus
}: DraggableBatchCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: batch.id,
    data: {
      type: 'batch',
      item: batch,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = getBatchStatus(batch);
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't select if clicking on drag handle or action buttons
    if ((e.target as HTMLElement).closest('[data-drag-handle], [data-no-select]')) {
      return;
    }
    onSelect(batch.id);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(batch.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-border rounded-lg mb-2 transition-all duration-300 ease-in-out ${
        isDragging 
          ? 'opacity-50 shadow-2xl z-50' 
          : isSelected 
          ? 'bg-accent/50 border-accent shadow-md' 
          : 'bg-card hover:bg-muted/50'
      }`}
    >
      {/* Batch Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            data-drag-handle
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={handleToggleClick}
              className="p-1 hover:bg-muted rounded transition-colors"
              data-no-select
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="font-medium text-foreground">
                {batch.name}
              </div>
              <Badge variant="secondary" className="text-xs">
                {batch.testCases?.length || 0} cases
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge 
              variant={status.text === 'Completed' ? 'default' : 
                      status.text === 'Failed' ? 'destructive' : 
                      status.text === 'In Progress' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {status.text}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(batch.created).toLocaleDateString()}
            </span>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                data-no-select
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditBatch(batch)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Batch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateBatch(batch)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Batch
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteBatch(batch.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Batch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Expandable Test Cases */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="border-t border-border bg-muted/20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-muted-foreground">
                Test Cases
              </div>
              {isSelected && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onAddTestCase}
                    disabled={isRunning}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    data-no-select
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Test Case
                  </Button>
                  <Button
                    onClick={onRunBatch}
                    disabled={isRunning || batch.testCases.length === 0}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-no-select
                  >
                    {isRunning ? (
                      <>
                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Run Batch
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Drag-and-drop test cases container */}
            <DragDropTestCaseContainer
              testCases={batch.testCases}
              batchId={batch.id}
              onReorder={onTestCaseReorder}
              onEdit={onEditTestCase}
              onDelete={onDeleteTestCase}
              onRun={onRunTestCase}
              isRunning={isRunning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}