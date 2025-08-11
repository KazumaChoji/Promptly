"use client";

import React, { useState } from 'react';
import { TestBatch, ChatTestCase } from '../../types/inference';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  MagnifyingGlassIcon as Search, 
  XMarkIcon as X, 
  FunnelIcon as Filter, 
  ChevronDownIcon as ChevronDown,
  CheckIcon as Check,
  PlusIcon as Plus,
  TrashIcon as Trash2,
  PlayIcon as Play,
  ArchiveBoxIcon as Archive
} from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

export interface SearchFilters {
  searchTerm: string;
  statusFilters: string[];
  priorityFilters: string[];
  tagFilters: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface InferenceSearchFiltersProps {
  batches: TestBatch[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onBulkAction?: (action: string, items: string[]) => void;
  selectedItems?: string[];
  onSelectItems?: (items: string[]) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'running', label: 'Running', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'success', label: 'Success', color: 'bg-green-100 text-green-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
];

export function InferenceSearchFilters({
  batches,
  filters,
  onFiltersChange,
  onBulkAction,
  selectedItems = [],
  onSelectItems
}: InferenceSearchFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Extract all unique tags from batches and test cases
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    
    batches.forEach(batch => {
      batch.metadata?.tags?.forEach(tag => tagSet.add(tag));
      batch.testCases.forEach(testCase => {
        testCase.metadata?.tags?.forEach(tag => tagSet.add(tag));
      });
    });
    
    return Array.from(tagSet).sort();
  }, [batches]);

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      statusFilters: [],
      priorityFilters: [],
      tagFilters: [],
    });
  };

  const getActiveFilterCount = () => {
    return (
      (filters.searchTerm ? 1 : 0) +
      filters.statusFilters.length +
      filters.priorityFilters.length +
      filters.tagFilters.length
    );
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedItems.length > 0) {
      onBulkAction(action, selectedItems);
      onSelectItems?.([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            placeholder="Search batches, test cases, and content..."
            className="pl-10 pr-10"
          />
          {filters.searchTerm && (
            <Button
              onClick={() => updateFilters({ searchTerm: '' })}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {getActiveFilterCount() > 0 && (
                  <Button
                    onClick={clearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Status Filters */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STATUS_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.statusFilters.includes(option.value) ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${
                        filters.statusFilters.includes(option.value) ? '' : option.color
                      }`}
                      onClick={() => {
                        const newFilters = filters.statusFilters.includes(option.value)
                          ? filters.statusFilters.filter(s => s !== option.value)
                          : [...filters.statusFilters, option.value];
                        updateFilters({ statusFilters: newFilters });
                      }}
                    >
                      {filters.statusFilters.includes(option.value) && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Priority Filters */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.priorityFilters.includes(option.value) ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${
                        filters.priorityFilters.includes(option.value) ? '' : option.color
                      }`}
                      onClick={() => {
                        const newFilters = filters.priorityFilters.includes(option.value)
                          ? filters.priorityFilters.filter(p => p !== option.value)
                          : [...filters.priorityFilters, option.value];
                        updateFilters({ priorityFilters: newFilters });
                      }}
                    >
                      {filters.priorityFilters.includes(option.value) && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tagFilters.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          const newFilters = filters.tagFilters.includes(tag)
                            ? filters.tagFilters.filter(t => t !== tag)
                            : [...filters.tagFilters, tag];
                          updateFilters({ tagFilters: newFilters });
                        }}
                      >
                        {filters.tagFilters.includes(tag) && (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {filters.searchTerm && (
            <Badge variant="secondary" className="text-xs">
              Search: "{filters.searchTerm}"
              <Button
                onClick={() => updateFilters({ searchTerm: '' })}
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}

          {filters.statusFilters.map((status) => (
            <Badge key={status} variant="secondary" className="text-xs">
              Status: {STATUS_OPTIONS.find(o => o.value === status)?.label}
              <Button
                onClick={() => updateFilters({ 
                  statusFilters: filters.statusFilters.filter(s => s !== status) 
                })}
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}

          {filters.priorityFilters.map((priority) => (
            <Badge key={priority} variant="secondary" className="text-xs">
              Priority: {PRIORITY_OPTIONS.find(o => o.value === priority)?.label}
              <Button
                onClick={() => updateFilters({ 
                  priorityFilters: filters.priorityFilters.filter(p => p !== priority) 
                })}
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}

          {filters.tagFilters.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              Tag: {tag}
              <Button
                onClick={() => updateFilters({ 
                  tagFilters: filters.tagFilters.filter(t => t !== tag) 
                })}
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && onBulkAction && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={() => onSelectItems?.([])}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Clear selection
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleBulkAction('run')}
              variant="outline"
              size="sm"
            >
              <Play className="w-4 h-4 mr-1" />
              Run Selected
            </Button>
            <Button
              onClick={() => handleBulkAction('archive')}
              variant="outline"
              size="sm"
            >
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
            <Button
              onClick={() => handleBulkAction('delete')}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}