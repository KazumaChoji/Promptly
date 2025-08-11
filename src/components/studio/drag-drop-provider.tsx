"use client";

import React, { ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  closestCorners
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { TestBatch, ChatTestCase } from '../../types/inference';

interface DragDropProviderProps {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
}

interface DragOverlayProps {
  activeItem: TestBatch | ChatTestCase | null;
  itemType: 'batch' | 'testcase' | null;
}

const DragOverlayContent = ({ activeItem, itemType }: DragOverlayProps) => {
  if (!activeItem) return null;

  if (itemType === 'batch') {
    const batch = activeItem as TestBatch;
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-2xl opacity-95 border-primary/50">
        <div className="flex items-center gap-3">
          <div className="font-medium text-foreground">{batch.name}</div>
          <div className="text-sm text-muted-foreground">
            {batch.testCases?.length || 0} cases
          </div>
        </div>
      </div>
    );
  }

  if (itemType === 'testcase') {
    const testCase = activeItem as ChatTestCase;
    return (
      <div className="bg-card border border-border rounded-md p-3 shadow-2xl opacity-95 border-primary/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
          <span className="text-sm font-medium">{testCase.name}</span>
          <div className="text-xs text-muted-foreground">
            {testCase.messages?.length || 0} messages
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export function DragDropProvider({ children, onDragEnd, onDragStart }: DragDropProviderProps) {
  const [activeItem, setActiveItem] = useState<TestBatch | ChatTestCase | null>(null);
  const [itemType, setItemType] = useState<'batch' | 'testcase' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    
    if (data) {
      setActiveItem(data.item);
      setItemType(data.type);
    }
    
    onDragStart?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    setItemType(null);
    onDragEnd(event);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        <DragOverlayContent activeItem={activeItem} itemType={itemType} />
      </DragOverlay>
    </DndContext>
  );
}