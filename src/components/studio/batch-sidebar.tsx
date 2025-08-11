"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { 
  PlusIcon as Plus, 
  MagnifyingGlassIcon as Search, 
  ChatBubbleLeftRightIcon as MessageSquare, 
  PhotoIcon as ImageIcon,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  XCircleIcon as XCircle,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  EllipsisHorizontalIcon as MoreHorizontal
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface TestBatch {
  id: string;
  name: string;
  description?: string;
  testCases: any[];
  created: Date;
}

interface BatchSidebarProps {
  batches: TestBatch[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  onCreateBatch: () => void;
  onRenameBatch: (batchId: string, newName: string) => void;
  onDeleteBatch: (batchId: string) => void;
  isRunning: boolean;
}

export function BatchSidebar({
  batches,
  selectedBatchId,
  onSelectBatch,
  onCreateBatch,
  onRenameBatch,
  onDeleteBatch,
  isRunning
}: BatchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState("");

  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBatchStatus = (batch: TestBatch) => {
    const testCases = batch.testCases || [];
    const completed = testCases.filter(tc => tc.status === 'success').length;
    const failed = testCases.filter(tc => tc.status === 'error').length;
    const running = testCases.filter(tc => tc.status === 'running').length;
    const pending = testCases.filter(tc => tc.status === 'pending').length;

    if (running > 0) return { icon: <Clock className="w-3 h-3" />, color: "text-yellow-400" };
    if (failed > 0) return { icon: <XCircle className="w-3 h-3" />, color: "text-red-400" };
    if (completed > 0) return { icon: <CheckCircle className="w-3 h-3" />, color: "text-green-400" };
    return { icon: <Clock className="w-3 h-3" />, color: "text-gray-400" };
  };

  const getBatchIcon = (batch: TestBatch) => {
    // Check if any test case has images
    const hasImages = batch.testCases?.some(tc => 
      tc.messages?.some((msg: any) => msg.images && msg.images.length > 0)
    );
    return hasImages ? <ImageIcon className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const startEditingBatchName = (batchId: string, currentName: string) => {
    setEditingBatchId(batchId);
    setEditingBatchName(currentName);
  };

  const saveBatchName = () => {
    if (editingBatchId && editingBatchName.trim()) {
      onRenameBatch(editingBatchId, editingBatchName.trim());
      setEditingBatchId(null);
      setEditingBatchName("");
    }
  };

  const cancelEditingBatchName = () => {
    setEditingBatchId(null);
    setEditingBatchName("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Batches</h2>
          <Button
            onClick={onCreateBatch}
            disabled={isRunning}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Batch List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredBatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No batches found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBatches.map((batch) => {
              const status = getBatchStatus(batch);
              const isSelected = selectedBatchId === batch.id;
              const isEditing = editingBatchId === batch.id;

              return (
                <div
                  key={batch.id}
                  className={`group relative rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
                  }`}
                  onClick={() => onSelectBatch(batch.id)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getBatchIcon(batch)}
                        
                        {isEditing ? (
                          <div className="flex-1">
                            <Input
                              value={editingBatchName}
                              onChange={(e) => setEditingBatchName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveBatchName();
                                if (e.key === 'Escape') cancelEditingBatchName();
                              }}
                              onBlur={saveBatchName}
                              className="h-6 text-sm bg-gray-800 border-gray-600 text-white"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {batch.name}
                              </span>
                              {status.icon}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {batch.testCases?.length || 0} cases
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {new Date(batch.created).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingBatchName(batch.id, batch.name);
                              }}
                              disabled={isRunning}
                              className="text-gray-300 hover:bg-gray-700"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBatch(batch.id);
                              }}
                              disabled={isRunning}
                              className="text-red-400 hover:bg-gray-700 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 