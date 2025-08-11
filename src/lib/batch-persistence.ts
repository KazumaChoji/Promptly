/**
 * Batch Persistence Service
 * Handles localStorage persistence for inference page test batches and test cases
 */

import { TestBatch, ChatTestCase, TestCaseTemplate } from '../types/inference';

// Keys for localStorage
const BATCHES_KEY = 'promptly-inference-batches';
const BATCH_RESULTS_KEY = 'promptly-inference-batch-results';
const SELECTED_BATCH_KEY = 'promptly-inference-selected-batch';
const EXPANDED_BATCH_KEY = 'promptly-inference-expanded-batch';

export interface BatchPersistenceState {
  batches: TestBatch[];
  selectedBatchId: string;
  expandedBatchId: string | null;
}

export class BatchPersistenceService {
  /**
   * Save batches to localStorage
   */
  static saveBatches(batches: TestBatch[]): void {
    if (typeof window === 'undefined') return;
    try {
      // Remove results from test cases before saving to reduce storage size
      const batchesToSave = batches.map(batch => ({
        ...batch,
        testCases: batch.testCases.map(tc => ({
          ...tc,
          result: undefined, // Don't persist test results
          error: undefined,  // Don't persist error messages
          status: 'pending' as const // Reset status to pending
        }))
      }));
      
      localStorage.setItem(BATCHES_KEY, JSON.stringify(batchesToSave));
      console.log(`💾 Saved ${batches.length} batches to localStorage`);
    } catch (error) {
      console.warn('Failed to save batches to localStorage:', error);
    }
  }

  /**
   * Load batches from localStorage
   */
  static loadBatches(): TestBatch[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(BATCHES_KEY);
      if (stored) {
        const batches = JSON.parse(stored) as TestBatch[];
        // Convert date strings back to Date objects
        return batches.map(batch => ({
          ...batch,
          created: new Date(batch.created),
          metadata: batch.metadata ? {
            ...batch.metadata,
            lastRun: batch.metadata.lastRun ? new Date(batch.metadata.lastRun) : undefined
          } : undefined,
          testCases: batch.testCases.map(tc => ({
            ...tc,
            status: 'pending' as const, // Always start as pending
            metadata: tc.metadata ? {
              ...tc.metadata,
              createdAt: tc.metadata.createdAt ? new Date(tc.metadata.createdAt) : undefined,
              lastRunAt: tc.metadata.lastRunAt ? new Date(tc.metadata.lastRunAt) : undefined
            } : undefined
          }))
        }));
      }
    } catch (error) {
      console.warn('Failed to load batches from localStorage:', error);
    }
    return [];
  }

  /**
   * Save selected batch ID
   */
  static saveSelectedBatchId(batchId: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (batchId) {
        localStorage.setItem(SELECTED_BATCH_KEY, batchId);
      } else {
        localStorage.removeItem(SELECTED_BATCH_KEY);
      }
    } catch (error) {
      console.warn('Failed to save selected batch ID:', error);
    }
  }

  /**
   * Load selected batch ID
   */
  static loadSelectedBatchId(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(SELECTED_BATCH_KEY) || '';
    } catch (error) {
      console.warn('Failed to load selected batch ID:', error);
      return '';
    }
  }

  /**
   * Save expanded batch ID
   */
  static saveExpandedBatchId(batchId: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (batchId) {
        localStorage.setItem(EXPANDED_BATCH_KEY, batchId);
      } else {
        localStorage.removeItem(EXPANDED_BATCH_KEY);
      }
    } catch (error) {
      console.warn('Failed to save expanded batch ID:', error);
    }
  }

  /**
   * Load expanded batch ID
   */
  static loadExpandedBatchId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(EXPANDED_BATCH_KEY);
    } catch (error) {
      console.warn('Failed to load expanded batch ID:', error);
      return null;
    }
  }

  /**
   * Load complete persistence state
   */
  static loadPersistenceState(): BatchPersistenceState {
    const batches = this.loadBatches();
    const selectedBatchId = this.loadSelectedBatchId();
    const expandedBatchId = this.loadExpandedBatchId();
    
    // Validate that selected batch exists
    const validSelectedBatchId = batches.find(b => b.id === selectedBatchId) ? selectedBatchId : (batches.length > 0 ? batches[0].id : '');
    
    // Validate that expanded batch exists
    const validExpandedBatchId = batches.find(b => b.id === expandedBatchId) ? expandedBatchId : null;

    return {
      batches,
      selectedBatchId: validSelectedBatchId,
      expandedBatchId: validExpandedBatchId
    };
  }

  /**
   * Save complete persistence state
   */
  static savePersistenceState(state: Partial<BatchPersistenceState>): void {
    if (state.batches !== undefined) {
      this.saveBatches(state.batches);
    }
    if (state.selectedBatchId !== undefined) {
      this.saveSelectedBatchId(state.selectedBatchId);
    }
    if (state.expandedBatchId !== undefined) {
      this.saveExpandedBatchId(state.expandedBatchId);
    }
  }

  /**
   * Add a new batch and persist
   */
  static addBatch(newBatch: TestBatch, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = [...existingBatches, newBatch];
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Update a batch and persist
   */
  static updateBatch(updatedBatch: TestBatch, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = existingBatches.map(batch => 
      batch.id === updatedBatch.id ? updatedBatch : batch
    );
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Delete a batch and persist
   */
  static deleteBatch(batchId: string, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = existingBatches.filter(batch => batch.id !== batchId);
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Add a test case to a batch and persist
   */
  static addTestCase(batchId: string, newTestCase: ChatTestCase, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = existingBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          testCases: [...batch.testCases, newTestCase]
        };
      }
      return batch;
    });
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Update a test case and persist
   */
  static updateTestCase(batchId: string, updatedTestCase: ChatTestCase, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = existingBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          testCases: batch.testCases.map(tc => 
            tc.id === updatedTestCase.id ? updatedTestCase : tc
          )
        };
      }
      return batch;
    });
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Delete a test case and persist
   */
  static deleteTestCase(batchId: string, testCaseId: string, existingBatches: TestBatch[]): TestBatch[] {
    const updatedBatches = existingBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          testCases: batch.testCases.filter(tc => tc.id !== testCaseId)
        };
      }
      return batch;
    });
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Update batch order after drag-and-drop and persist
   */
  static updateBatchOrder(reorderedBatches: TestBatch[]): TestBatch[] {
    const batchesWithOrder = reorderedBatches.map((batch, index) => ({
      ...batch,
      order: index
    }));
    this.saveBatches(batchesWithOrder);
    return batchesWithOrder;
  }

  /**
   * Update test case order within a batch and persist
   */
  static updateTestCaseOrder(batchId: string, reorderedTestCases: ChatTestCase[], existingBatches: TestBatch[]): TestBatch[] {
    const testCasesWithOrder = reorderedTestCases.map((tc, index) => ({
      ...tc,
      order: index
    }));

    const updatedBatches = existingBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          testCases: testCasesWithOrder
        };
      }
      return batch;
    });
    
    this.saveBatches(updatedBatches);
    return updatedBatches;
  }

  /**
   * Clear all persisted data
   */
  static clearAllData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(BATCHES_KEY);
      localStorage.removeItem(BATCH_RESULTS_KEY);
      localStorage.removeItem(SELECTED_BATCH_KEY);
      localStorage.removeItem(EXPANDED_BATCH_KEY);
      console.log('🗑️ Cleared all batch persistence data');
    } catch (error) {
      console.warn('Failed to clear batch persistence data:', error);
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): { batchCount: number; totalSize: number } {
    if (typeof window === 'undefined') return { batchCount: 0, totalSize: 0 };
    try {
      const batches = this.loadBatches();
      const batchData = localStorage.getItem(BATCHES_KEY) || '';
      return {
        batchCount: batches.length,
        totalSize: new Blob([batchData]).size
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return { batchCount: 0, totalSize: 0 };
    }
  }
}