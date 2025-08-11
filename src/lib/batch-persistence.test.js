/**
 * Simple test for BatchPersistenceService
 * Run this in browser console to test functionality
 */

// Test data
const mockBatch = {
  id: 'test-batch-1',
  name: 'Test Batch',
  order: 0,
  testCases: [
    {
      id: 'test-case-1',
      name: 'Sample Test Case',
      order: 0,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, world!',
          timestamp: new Date()
        }
      ],
      status: 'pending',
      metadata: {
        createdAt: new Date(),
        priority: 'medium',
        tags: ['sample']
      }
    }
  ],
  created: new Date(),
  metadata: {
    description: 'Test batch for testing',
    tags: ['test']
  }
};

const mockBatch2 = {
  id: 'test-batch-2',
  name: 'Second Test Batch',
  order: 1,
  testCases: [],
  created: new Date(),
  metadata: {
    description: 'Another test batch'
  }
};

// Test the batch persistence service
function testBatchPersistence() {
  console.log('🧪 Testing BatchPersistenceService...');
  
  // Clear any existing data first
  console.log('\n0. Clearing existing data:');
  BatchPersistenceService.clearAllData();
  
  // Test 1: Save and load batches
  console.log('\n1. Testing save and load batches:');
  const testBatches = [mockBatch, mockBatch2];
  BatchPersistenceService.saveBatches(testBatches);
  
  const loadedBatches = BatchPersistenceService.loadBatches();
  console.log('- Saved batches:', testBatches.length);
  console.log('- Loaded batches:', loadedBatches.length);
  console.log('- Batch names:', loadedBatches.map(b => b.name));
  
  // Test 2: Save and load selection state
  console.log('\n2. Testing selection state:');
  BatchPersistenceService.saveSelectedBatchId('test-batch-2');
  BatchPersistenceService.saveExpandedBatchId('test-batch-1');
  
  const selectedId = BatchPersistenceService.loadSelectedBatchId();
  const expandedId = BatchPersistenceService.loadExpandedBatchId();
  console.log('- Selected batch ID:', selectedId);
  console.log('- Expanded batch ID:', expandedId);
  
  // Test 3: Complete persistence state
  console.log('\n3. Testing complete persistence state:');
  const persistenceState = BatchPersistenceService.loadPersistenceState();
  console.log('- State batches:', persistenceState.batches.length);
  console.log('- State selected:', persistenceState.selectedBatchId);
  console.log('- State expanded:', persistenceState.expandedBatchId);
  
  // Test 4: Add batch operation
  console.log('\n4. Testing add batch:');
  const newBatch = {
    id: 'test-batch-3',
    name: 'Added Batch',
    order: 2,
    testCases: [],
    created: new Date()
  };
  
  const batchesAfterAdd = BatchPersistenceService.addBatch(newBatch, loadedBatches);
  console.log('- Batches after add:', batchesAfterAdd.length);
  console.log('- New batch names:', batchesAfterAdd.map(b => b.name));
  
  // Test 5: Delete batch operation
  console.log('\n5. Testing delete batch:');
  const batchesAfterDelete = BatchPersistenceService.deleteBatch('test-batch-2', batchesAfterAdd);
  console.log('- Batches after delete:', batchesAfterDelete.length);
  console.log('- Remaining batch names:', batchesAfterDelete.map(b => b.name));
  
  // Test 6: Add test case
  console.log('\n6. Testing add test case:');
  const newTestCase = {
    id: 'new-test-case',
    name: 'New Test Case',
    order: 1,
    messages: [
      {
        id: 'new-msg',
        role: 'user',
        content: 'New test message',
        timestamp: new Date()
      }
    ],
    status: 'pending',
    metadata: {
      createdAt: new Date(),
      priority: 'high'
    }
  };
  
  const batchesAfterTestCaseAdd = BatchPersistenceService.addTestCase(
    'test-batch-1',
    newTestCase,
    batchesAfterDelete
  );
  
  const updatedBatch = batchesAfterTestCaseAdd.find(b => b.id === 'test-batch-1');
  console.log('- Test cases in batch 1:', updatedBatch?.testCases.length);
  console.log('- Test case names:', updatedBatch?.testCases.map(tc => tc.name));
  
  // Test 7: Storage info
  console.log('\n7. Testing storage info:');
  const storageInfo = BatchPersistenceService.getStorageInfo();
  console.log('- Batch count:', storageInfo.batchCount);
  console.log('- Storage size (bytes):', storageInfo.totalSize);
  
  console.log('\n✅ BatchPersistenceService tests completed!');
  console.log('💡 Refresh the page and run loadPersistenceState() to verify persistence across sessions.');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testBatchPersistence };
} else {
  // Browser environment
  window.testBatchPersistence = testBatchPersistence;
  window.mockBatch = mockBatch;
  window.mockBatch2 = mockBatch2;
}

console.log('🚀 BatchPersistenceService test loaded. Run testBatchPersistence() to test.');