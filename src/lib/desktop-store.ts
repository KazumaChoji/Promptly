import { create } from 'zustand';
import { FileSystemService, FileSystemFile, FileSystemFolder } from './file-system-service';

// Import types
interface LLMResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
  error?: string;
}

interface StudioFile extends FileSystemFile {
  // Keep the same interface for compatibility
}

interface StudioFolder extends FileSystemFolder {
  // Keep the same interface for compatibility
}

interface ExperimentConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface ExperimentRun {
  id: string;
  timestamp: Date;
  promptFile: string;
  promptContent: string;
  config: ExperimentConfig;
  results: LLMResponse[];
}

interface StudioState {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // File management
  files: StudioFile[];
  folders: StudioFolder[];
  activeFileId: string | null;
  
  // Core editor state (derived from active file)
  provider: string;
  model: string;
  testInput: string;
  results: LLMResponse[];
  
  // Experiment runs
  experimentRuns: ExperimentRun[];
  
  // Experiment configuration
  experimentConfig: ExperimentConfig;
  
  // UI state
  sidebarTab: 'test' | 'batch' | 'results';
  isQuickTestLoading: boolean;
  quickTestStatus: 'idle' | 'sending' | 'processing' | 'completed' | 'error';
  lastTestResult: LLMResponse | null;
  
  // Initialization
  initialize: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // File actions
  createFile: (name: string, type?: StudioFile['type'], folderId?: string) => Promise<void>;
  openFile: (fileId: string) => void;
  saveFile: (fileId: string, content: string) => Promise<void>;
  saveFileToDisk: (fileId: string, filePath?: string) => Promise<void>;
  openFileFromDisk: (filePath: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  uploadFile: (file: File, folderId?: string) => Promise<void>;
  downloadFile: (fileId: string) => void;
  getFilesInFolder: (folderId?: string) => StudioFile[];
  
  // Folder actions
  createFolder: (name: string, parentId?: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  toggleFolder: (folderId: string) => Promise<void>;
  moveFile: (fileId: string, folderId?: string) => Promise<void>;
  moveFolder: (folderId: string, parentId?: string) => Promise<void>;
  getRootFolders: () => StudioFolder[];
  getChildFolders: (parentId: string) => StudioFolder[];
  getFolderPath: (folderId: string) => Promise<string>;
  
  // Content actions (work with active file)
  setContent: (content: string) => void;
  getActiveFileContent: () => string;
  
  // Utility functions
  getFileExtension: (filename: string) => string;
  getFileType: (filename: string) => StudioFile['type'];
  
  // Basic actions
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setTestInput: (value: string) => void;
  addResult: (result: LLMResponse) => void;
  setSidebarTab: (tab: 'test' | 'batch' | 'results') => void;
  
  // Experiment actions
  updateExperimentConfig: (config: Partial<ExperimentConfig>) => void;
  setQuickTestLoading: (loading: boolean) => void;
  setQuickTestStatus: (status: 'idle' | 'sending' | 'processing' | 'completed' | 'error') => void;
  setLastTestResult: (result: LLMResponse | null) => void;
  runSingleTest: () => Promise<{ success: boolean; error?: string; result?: any }>;
}

// Prefix for storing individual file contents in localStorage
const FILE_CONTENT_PREFIX = 'studio-file-content-';

// Keys for storing file/folder structure in localStorage
const STUDIO_FILES_KEY = 'promptly-studio-files';
const STUDIO_FOLDERS_KEY = 'promptly-studio-folders';
const STUDIO_ACTIVE_FILE_KEY = 'promptly-studio-active-file';

// Helper functions for localStorage persistence
const persistFiles = (files: StudioFile[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STUDIO_FILES_KEY, JSON.stringify(files));
    } catch (err) {
      console.warn('Failed to persist files to localStorage', err);
    }
  }
};

const persistFolders = (folders: StudioFolder[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STUDIO_FOLDERS_KEY, JSON.stringify(folders));
    } catch (err) {
      console.warn('Failed to persist folders to localStorage', err);
    }
  }
};

const persistActiveFile = (activeFileId: string | null) => {
  if (typeof window !== 'undefined') {
    try {
      if (activeFileId) {
        localStorage.setItem(STUDIO_ACTIVE_FILE_KEY, activeFileId);
      } else {
        localStorage.removeItem(STUDIO_ACTIVE_FILE_KEY);
      }
    } catch (err) {
      console.warn('Failed to persist active file to localStorage', err);
    }
  }
};

const loadPersistedFiles = (): StudioFile[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STUDIO_FILES_KEY);
    
    if (stored) {
      const files = JSON.parse(stored) as StudioFile[];
      console.log('📂 Loading', files.length, 'persisted files from localStorage');
      
      // Load content from localStorage for each file
      const loadedFiles = files.map(file => {
        const storedContent = localStorage.getItem(`${FILE_CONTENT_PREFIX}${file.id}`);
        return {
          ...file,
          content: storedContent || file.content || '',
          unsaved: false // Mark as saved since it's from localStorage
        };
      });
      
      return loadedFiles;
    }
  } catch (err) {
    console.warn('Failed to load files from localStorage', err);
  }
  return [];
};

const loadPersistedFolders = (): StudioFolder[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STUDIO_FOLDERS_KEY);
    if (stored) {
      return JSON.parse(stored) as StudioFolder[];
    }
  } catch (err) {
    console.warn('Failed to load folders from localStorage', err);
  }
  return [];
};

const loadPersistedActiveFile = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STUDIO_ACTIVE_FILE_KEY);
  } catch (err) {
    console.warn('Failed to load active file from localStorage', err);
  }
  return null;
};

export const useDesktopStore = create<StudioState>()((set, get) => {
  const fileSystemService = FileSystemService.getInstance();
  let isInitializing = false;
  let isInitialized = false;

  return {
    // Initial state
    isLoading: false,
    error: null,
    files: [],
    folders: [],
    activeFileId: null,
    
    provider: "openai",
    model: "gpt-4o",
    testInput: "",
    results: [],
    experimentRuns: [],
    
    experimentConfig: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 4000,
    },
    sidebarTab: 'test',
    isQuickTestLoading: false,
    quickTestStatus: 'idle',
    lastTestResult: null,
    
    // Initialization
    initialize: async () => {
      if (isInitializing || isInitialized) {
        console.log('⏭️ Skipping initialization - already initializing or initialized');
        return;
      }
      
      isInitializing = true;
      
      try {
        set({ isLoading: true, error: null });

        // Try to load persisted data first
        console.log('🚀 Starting desktop store initialization...');
        const persistedKeys = Object.keys(localStorage).filter(k => k.includes('promptly') || k.includes('studio'));
        console.log('📋 Found', persistedKeys.length, 'localStorage keys related to the app');
        
        const persistedFiles = loadPersistedFiles();
        const persistedFolders = loadPersistedFolders();
        const persistedActiveFile = loadPersistedActiveFile();
        
        console.log('🔍 Desktop Store Init - Found persisted data:', {
          files: persistedFiles.length,
          folders: persistedFolders.length,
          activeFile: persistedActiveFile,
          fileNames: persistedFiles.map(f => f.name),
          fileContents: persistedFiles.map(f => ({ name: f.name, contentLength: f.content?.length || 0 }))
        });

        let files: StudioFile[] = [];
        let folders: StudioFolder[] = [];
        let activeFileId: string | null = null;

        if (persistedFiles.length > 0) {
          console.log('💾 Using persisted file data - restoring', persistedFiles.length, 'files');
          
          // Use persisted data directly without clearing and recreating
          files = persistedFiles;
          folders = persistedFolders;
          activeFileId = persistedActiveFile && files.find(f => f.id === persistedActiveFile) ? persistedActiveFile : (files.length > 0 ? files[0].id : null);
          
          // Directly populate the in-memory file system with persisted data
          // This avoids the expensive clear/recreate cycle
          const fileSystemData = {
            files: files.map(f => ({
              ...f,
              lastModified: f.lastModified || new Date(),
              unsaved: false
            })),
            folders: folders.map(f => ({
              ...f
            }))
          };
          
          try {
            await fileSystemService.importData(fileSystemData);
            console.log('✅ Successfully imported file system data');
          } catch (err) {
            console.warn('Failed to import file system data:', err);
            // This shouldn't happen, but if it does, we should still use the persisted files
            // Don't clear everything - just log the error and continue with the persisted data
            console.warn('Import failed, but continuing with persisted localStorage data');
          }
          
        } else {
          console.log('📁 No persisted files found - checking existing file system...');
          
          // No persisted data, check what's in the file system
          const existingFiles = await fileSystemService.getFiles();
          const existingFolders = await fileSystemService.getFolders();
          
          console.log('🔍 Existing in file system:', {
            files: existingFiles.length,
            folders: existingFolders.length
          });
          
          if (existingFiles.length === 0 && existingFolders.length === 0) {
            console.log('📂 No existing data found - starting with empty file explorer');
            // Start with completely empty state - no default files
            files = [];
            folders = [];
            activeFileId = null;
          } else {
            console.log('♾️ Using existing files from file system:', existingFiles.length, 'files');
            // Use existing files from the file system
            files = existingFiles;
            folders = existingFolders;
            activeFileId = files.length > 0 ? files[0].id : null;
          }
        }

        // Update store state
        set({
          files,
          folders,
          activeFileId,
          isLoading: false
        });
        
        // Persist the current state
        persistFiles(files);
        persistFolders(folders);
        persistActiveFile(activeFileId);
        
        isInitialized = true;
        console.log('✅ Desktop store initialization completed successfully');
        console.log('📊 Final state:', { filesCount: files.length, foldersCount: folders.length, activeFileId });

      } catch (error) {
        console.error('Failed to initialize studio:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize studio',
          isLoading: false 
        });
      } finally {
        isInitializing = false;
      }
    },
    
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    
    // Utility functions
    getFileExtension: (filename) => {
      const lastDot = filename.lastIndexOf('.');
      return lastDot > 0 ? filename.substring(lastDot + 1) : '';
    },
    
    getFileType: (filename) => {
      const ext = get().getFileExtension(filename).toLowerCase();
      switch (ext) {
        case 'md':
        case 'markdown':
          return 'markdown';
        default:
          return 'text';
      }
    },
    
    // File management
    createFile: async (name, type = 'markdown', folderId) => {
      try {
        set({ isLoading: true, error: null });
        
        const fileType = type || get().getFileType(name);
        const extension = fileType === 'markdown' ? '.md' : '.txt';
        
        const fileName = name.includes('.') ? name : `${name}${extension}`;
        
        const newFile = await fileSystemService.createFile({
          name: fileName,
          type: fileType,
          content: '',
          folderId
        });

        // Immediately persist a blank file to localStorage so it can be loaded later
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${FILE_CONTENT_PREFIX}${newFile.id}`, '');
          } catch (err) {
            console.warn('Failed to create localStorage entry for new file', err);
          }
        }
        
        set(state => {
          const newState = {
            files: [...state.files, newFile],
            activeFileId: newFile.id,
            isLoading: false
          };
          // Persist changes
          persistFiles(newState.files);
          persistActiveFile(newState.activeFileId);
          return newState;
        });
      } catch (error) {
        console.error('Failed to create file:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create file',
          isLoading: false 
        });
      }
    },
    
    openFile: (fileId) => {
      // Attempt to hydrate file content from localStorage (if it exists)
      const state = get();
      const fileToOpen = state.files.find(f => f.id === fileId);

      if (fileToOpen && typeof window !== 'undefined') {
        try {
          const storedContent = localStorage.getItem(`${FILE_CONTENT_PREFIX}${fileId}`);
          if (storedContent !== null && storedContent !== fileToOpen.content) {
            // Update the in-memory file with the persisted content
            set(current => ({
              files: current.files.map(f =>
                f.id === fileId ? { ...f, content: storedContent, unsaved: false } : f
              )
            }));
          }
        } catch (err) {
          console.warn('Failed to load file from localStorage', err);
        }
      }

      // Finally set the active file
      set({ activeFileId: fileId });
      
      // Persist active file change
      persistActiveFile(fileId);
    },
    
    saveFile: async (fileId, content) => {
      try {
        set({ isLoading: true, error: null });

        // Persist to in-memory file system
        const updatedFile = await fileSystemService.updateFile(fileId, { content });

        // Persist to localStorage so that future sessions load the latest content
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${FILE_CONTENT_PREFIX}${fileId}`, content);
          } catch (err) {
            console.warn('Failed to persist file to localStorage', err);
          }
        }

        set(state => {
          const newFiles = state.files.map(file =>
            file.id === fileId ? { ...updatedFile, unsaved: false } : file
          );
          // Persist changes
          persistFiles(newFiles);
          return {
            files: newFiles,
            isLoading: false
          };
        });
      } catch (error) {
        console.error('Failed to save file:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to save file',
          isLoading: false 
        });
        throw error;
      }
    },
    
    saveFileToDisk: async (fileId, filePath) => {
      try {
        await fileSystemService.saveFileToDisk(fileId, filePath);
        console.log('File saved to disk successfully');
      } catch (error) {
        console.error('Failed to save file to disk:', error);
        throw error;
      }
    },
    
    openFileFromDisk: async (filePath) => {
      try {
        const file = await fileSystemService.openFileFromDisk(filePath);
        set(state => ({
          files: [...state.files, file],
          activeFileId: file.id
        }));
      } catch (error) {
        console.error('Failed to open file from disk:', error);
        throw error;
      }
    },
    
    deleteFile: async (fileId) => {
      try {
        await fileSystemService.deleteFile(fileId);
        
        // Remove from localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`${FILE_CONTENT_PREFIX}${fileId}`);
          } catch (err) {
            console.warn('Failed to remove file from localStorage', err);
          }
        }
        
        set(state => {
          const newFiles = state.files.filter(f => f.id !== fileId);
          
          let newActiveFileId = state.activeFileId;
          
          // If we're deleting the active file, switch to another file
          if (state.activeFileId === fileId) {
            if (newFiles.length > 0) {
              newActiveFileId = newFiles[0].id;
            } else {
              newActiveFileId = null;
            }
          }
          
          // Persist changes
          persistFiles(newFiles);
          persistActiveFile(newActiveFileId);
          
          return {
            files: newFiles,
            activeFileId: newActiveFileId
          };
        });
      } catch (error) {
        console.error('Failed to delete file:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete file' });
      }
    },
    
    renameFile: async (fileId, newName) => {
      try {
        const updatedFile = await fileSystemService.updateFile(fileId, { name: newName });
        
        set(state => {
          const newFiles = state.files.map(file =>
            file.id === fileId ? updatedFile : file
          );
          // Persist changes
          persistFiles(newFiles);
          return {
            files: newFiles
          };
        });
      } catch (error) {
        console.error('Failed to rename file:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to rename file' });
      }
    },
    
    uploadFile: async (file, folderId) => {
      try {
        set({ isLoading: true, error: null });
        
        const content = await file.text();
        const fileType = get().getFileType(file.name);
        
        const newFile = await fileSystemService.createFile({
          name: file.name,
          type: fileType,
          content,
          folderId
        });
        
        // Persist new file content to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${FILE_CONTENT_PREFIX}${newFile.id}`, newFile.content);
          } catch (err) {
            console.warn('Failed to persist uploaded file to localStorage', err);
          }
        }
        
        set(state => {
          const newFiles = [...state.files, newFile];
          // Persist changes
          persistFiles(newFiles);
          persistActiveFile(newFile.id);
          return {
            files: newFiles,
            activeFileId: newFile.id,
            isLoading: false
          };
        });
      } catch (error) {
        console.error('Failed to upload file:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to upload file',
          isLoading: false 
        });
      }
    },
    
    downloadFile: (fileId) => {
      const file = get().files.find(f => f.id === fileId);
      if (!file) return;
      
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    
    // Folder management
    createFolder: async (name, parentId) => {
      try {
        const newFolder = await fileSystemService.createFolder({ 
          name, 
          parentId,
          isExpanded: false
        });
        
        set(state => {
          const newFolders = [...state.folders, newFolder];
          // Persist changes
          persistFolders(newFolders);
          return {
            folders: newFolders
          };
        });
      } catch (error) {
        console.error('Failed to create folder:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to create folder' });
      }
    },
    
    deleteFolder: async (folderId) => {
      try {
        await fileSystemService.deleteFolder(folderId);
        
        // Refresh files and folders to get the updated state
        const [files, folders] = await Promise.all([
          fileSystemService.getFiles(),
          fileSystemService.getFolders()
        ]);
        
        // Persist changes
        persistFiles(files);
        persistFolders(folders);
        
        set({ files, folders });
      } catch (error) {
        console.error('Failed to delete folder:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete folder' });
      }
    },
    
    renameFolder: async (folderId, newName) => {
      try {
        const updatedFolder = await fileSystemService.updateFolder(folderId, { name: newName });
        
        set(state => {
          const newFolders = state.folders.map(folder =>
            folder.id === folderId ? updatedFolder : folder
          );
          // Persist changes
          persistFolders(newFolders);
          return {
            folders: newFolders
          };
        });
      } catch (error) {
        console.error('Failed to rename folder:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to rename folder' });
      }
    },
    
    toggleFolder: async (folderId) => {
      try {
        const updatedFolder = await fileSystemService.toggleFolderExpansion(folderId);
        
        set(state => {
          const newFolders = state.folders.map(folder =>
            folder.id === folderId ? updatedFolder : folder
          );
          // Persist changes
          persistFolders(newFolders);
          return {
            folders: newFolders
          };
        });
      } catch (error) {
        console.error('Failed to toggle folder:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to toggle folder' });
      }
    },
    
    moveFile: async (fileId, folderId) => {
      try {
        const updatedFile = await fileSystemService.moveFile(fileId, folderId);
        
        set(state => {
          const newFiles = state.files.map(file =>
            file.id === fileId ? updatedFile : file
          );
          // Persist changes
          persistFiles(newFiles);
          return {
            files: newFiles
          };
        });
      } catch (error) {
        console.error('Failed to move file:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to move file' });
      }
    },
    
    moveFolder: async (folderId, parentId) => {
      try {
        const updatedFolder = await fileSystemService.moveFolder(folderId, parentId);
        
        set(state => {
          const newFolders = state.folders.map(folder =>
            folder.id === folderId ? updatedFolder : folder
          );
          // Persist changes
          persistFolders(newFolders);
          return {
            folders: newFolders
          };
        });
      } catch (error) {
        console.error('Failed to move folder:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to move folder' });
      }
    },
    
    // Content actions (work with active file)
    setContent: (content) => {
      const activeFileId = get().activeFileId;
      if (!activeFileId) return;
      
      const currentFile = get().files.find(f => f.id === activeFileId);
      if (!currentFile || currentFile.content === content) return; // Skip if no change
      
      set(state => {
        const newFiles = state.files.map(file =>
          file.id === activeFileId
            ? { ...file, content, unsaved: true }
            : file
        );
        // Persist file structure (not content yet as it's unsaved)
        persistFiles(newFiles);
        return {
          files: newFiles
        };
      });
    },
    
    getActiveFileContent: () => {
      const activeFileId = get().activeFileId;
      if (!activeFileId) return '';
      
      const file = get().files.find(f => f.id === activeFileId);
      return file?.content || '';
    },
    
    // Basic actions
    setProvider: (provider) => set({ provider }),
    setModel: (model) => set({ model }),
    setTestInput: (testInput) => set({ testInput }),
    addResult: (result) => set(state => ({ results: [...state.results, result] })),
    setSidebarTab: (sidebarTab) => set({ sidebarTab }),
    
    // Experiment actions
    updateExperimentConfig: (config) => set(state => ({
      experimentConfig: { ...state.experimentConfig, ...config }
    })),
    setQuickTestLoading: (isQuickTestLoading) => set({ isQuickTestLoading }),
    setQuickTestStatus: (quickTestStatus) => set({ quickTestStatus }),
    setLastTestResult: (lastTestResult) => set({ lastTestResult }),
    
    runSingleTest: async () => {
      try {
        set({ isQuickTestLoading: true, quickTestStatus: 'sending' });
        
        const state = get();
        const activeFile = state.files.find(f => f.id === state.activeFileId);
        
        if (!activeFile) {
          throw new Error('No active file selected');
        }
        
        // Here you would implement the actual test logic
        // For now, just simulate success
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set({ 
          isQuickTestLoading: false, 
          quickTestStatus: 'completed',
          lastTestResult: {
            content: 'Test completed successfully',
            model: state.model,
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            finish_reason: 'stop'
          }
        });
        
        return { success: true };
      } catch (error) {
        set({ 
          isQuickTestLoading: false, 
          quickTestStatus: 'error',
          error: error instanceof Error ? error.message : 'Test failed'
        });
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Test failed' 
        };
      }
    },

    // Folder utility functions
    getFilesInFolder: (folderId) => {
      const { files } = get();
      return files.filter(file => file.folderId === folderId);
    },

    getRootFolders: () => {
      const { folders } = get();
      return folders.filter(folder => !folder.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    getChildFolders: (parentId) => {
      const { folders } = get();
      return folders.filter(folder => folder.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    getFolderPath: async (folderId) => {
      try {
        return await fileSystemService.getFolderPath(folderId);
      } catch (error) {
        console.error('Failed to get folder path:', error);
        return '';
      }
    },
  };
}); 