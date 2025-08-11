"use client";

import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChatTestCase } from '../../types/inference';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Bars3Icon as GripVertical,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  PlayIcon as Play,
  ClockIcon as Clock,
  EllipsisHorizontalIcon as MoreHorizontal,
  DocumentDuplicateIcon as Copy,
  ChatBubbleLeftRightIcon as MessageSquare
} from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface DraggableTestCaseProps {
  testCase: ChatTestCase;
  isRunning: boolean;
  onEdit: (testCase: ChatTestCase) => void;
  onDelete: (testCaseId: string) => void;
  onRun: (testCaseId: string) => void;
}

function DraggableTestCase({ testCase, isRunning, onEdit, onDelete, onRun }: DraggableTestCaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: testCase.id,
    data: {
      type: 'testcase',
      item: testCase,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Passed';
      case 'error': return 'Failed';
      case 'running': return 'Running';
      default: return 'Pending';
    }
  };

  const getPriorityColor = (priority: string = 'medium') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-background rounded-md border border-border hover:bg-muted/50 transition-colors ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>

        <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium">{testCase.name}</span>
          
          {/* Message count indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span>{testCase.messages?.length || 0}</span>
          </div>

          {/* Priority badge */}
          {testCase.metadata?.priority && (
            <Badge 
              variant="outline" 
              className={`text-xs ${getPriorityColor(testCase.metadata.priority)}`}
            >
              {testCase.metadata.priority}
            </Badge>
          )}

          {/* Tags */}
          {testCase.metadata?.tags && testCase.metadata.tags.length > 0 && (
            <div className="flex gap-1">
              {testCase.metadata.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {testCase.metadata.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{testCase.metadata.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status badge */}
        <Badge 
          variant={testCase.status === 'success' ? 'default' : 
                  testCase.status === 'error' ? 'destructive' : 
                  testCase.status === 'running' ? 'secondary' : 'outline'}
          className="text-xs"
        >
          {getStatusText(testCase.status)}
        </Badge>

        {/* Quick run button */}
        <Button
          onClick={() => onRun(testCase.id)}
          disabled={isRunning || testCase.status === 'running'}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          {testCase.status === 'running' ? (
            <Clock className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </Button>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(testCase)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Test Case
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {/* TODO: Implement duplicate */}}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(testCase.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface DragDropTestCaseContainerProps {
  testCases: ChatTestCase[];
  batchId: string;
  onReorder: (testCases: ChatTestCase[]) => void;
  onEdit: (testCase: ChatTestCase) => void;
  onDelete: (testCaseId: string) => void;
  onRun: (testCaseId: string) => void;
  isRunning: boolean;
}

export function DragDropTestCaseContainer({
  testCases,
  batchId,
  onReorder,
  onEdit,
  onDelete,
  onRun,
  isRunning
}: DragDropTestCaseContainerProps) {
  const { setNodeRef } = useDroppable({
    id: `testcase-container-${batchId}`,
    data: {
      type: 'testcase-container',
      batchId,
    },
  });

  // Sort test cases by order
  const sortedTestCases = [...testCases].sort((a, b) => a.order - b.order);

  if (testCases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No test cases yet</p>
        <p className="text-xs">Add a test case to get started</p>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className="space-y-2">
      <SortableContext 
        items={sortedTestCases.map(tc => tc.id)} 
        strategy={verticalListSortingStrategy}
      >
        {sortedTestCases.map((testCase) => (
          <DraggableTestCase
            key={testCase.id}
            testCase={testCase}
            isRunning={isRunning}
            onEdit={onEdit}
            onDelete={onDelete}
            onRun={onRun}
          />
        ))}
      </SortableContext>
    </div>
  );
}