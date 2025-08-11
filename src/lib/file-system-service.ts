export interface FileSystemFile {
  id: string;
  name: string;
  content: string;
  type: 'markdown' | 'text';
  lastModified: Date;
  path?: string; // Actual file path on filesystem
  unsaved?: boolean;
  folderId?: string; // Parent folder ID for nesting
}

export interface FileSystemFolder {
  id: string;
  name: string;
  path?: string; // Actual folder path on filesystem
  color?: string;
  parentId?: string; // Parent folder ID for nesting
  isExpanded?: boolean; // UI state for folder expansion
}

export class FileSystemService {
  private static instance: FileSystemService;
  private files: Map<string, FileSystemFile> = new Map();
  private folders: Map<string, FileSystemFolder> = new Map();

  private constructor() {}

  static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * Create a new file in memory (will be saved to disk when user saves)
   */
  async createFile(file: Omit<FileSystemFile, 'id' | 'lastModified'>): Promise<FileSystemFile> {
    const newFile: FileSystemFile = {
      ...file,
      id: crypto.randomUUID(),
      lastModified: new Date(),
      unsaved: true
    };

    this.files.set(newFile.id, newFile);
    return newFile;
  }

  /**
   * Save a file to the filesystem
   */
  async saveFileToDisk(fileId: string, filePath?: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // In a real desktop app, this would use Electron's fs module
    // For now, we'll simulate the file system operation
    const path = filePath || file.path || `${file.name}`;
    
    // Simulate file system save
    console.log(`Saving file to: ${path}`);
    
    // Update file metadata
    file.path = path;
    file.lastModified = new Date();
    file.unsaved = false;
    
    this.files.set(fileId, file);
  }

  /**
   * Open a file from the filesystem
   */
  async openFileFromDisk(filePath: string): Promise<FileSystemFile> {
    // In a real desktop app, this would read from the actual filesystem
    // For now, we'll simulate the file system operation
    console.log(`Opening file from: ${filePath}`);
    
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Untitled';
    const fileType = this.getFileType(fileName);
    
    const file: FileSystemFile = {
      id: crypto.randomUUID(),
      name: fileName,
      content: '', // In real app, this would read the actual file content
      type: fileType,
      lastModified: new Date(),
      path: filePath,
      unsaved: false
    };

    this.files.set(file.id, file);
    return file;
  }

  /**
   * Get all files currently in memory
   */
  async getFiles(): Promise<FileSystemFile[]> {
    return Array.from(this.files.values());
  }

  /**
   * Get a specific file by ID
   */
  async getFile(id: string): Promise<FileSystemFile | null> {
    return this.files.get(id) || null;
  }

  /**
   * Update a file
   */
  async updateFile(id: string, updates: Partial<FileSystemFile>): Promise<FileSystemFile> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error('File not found');
    }

    const updatedFile = {
      ...file,
      ...updates,
      lastModified: new Date(),
      unsaved: true
    };

    this.files.set(id, updatedFile);
    return updatedFile;
  }

  /**
   * Delete a file
   */
  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  /**
   * Create a new folder
   */
  async createFolder(folder: Omit<FileSystemFolder, 'id'>): Promise<FileSystemFolder> {
    const newFolder: FileSystemFolder = {
      ...folder,
      id: crypto.randomUUID(),
    };

    this.folders.set(newFolder.id, newFolder);
    return newFolder;
  }

  /**
   * Get all folders
   */
  async getFolders(): Promise<FileSystemFolder[]> {
    return Array.from(this.folders.values());
  }

  /**
   * Update a folder
   */
  async updateFolder(id: string, updates: Partial<FileSystemFolder>): Promise<FileSystemFolder> {
    const folder = this.folders.get(id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const updatedFolder = {
      ...folder,
      ...updates
    };

    this.folders.set(id, updatedFolder);
    return updatedFolder;
  }

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(id: string): Promise<void> {
    // Get all child folders recursively
    const childFolders = await this.getChildFolders(id);
    const allFolderIds = [id, ...this.getAllChildFolderIds(childFolders)];
    
    // Delete all files in these folders
    const filesToDelete = Array.from(this.files.values())
      .filter(file => file.folderId && allFolderIds.includes(file.folderId));
    
    filesToDelete.forEach(file => this.files.delete(file.id));
    
    // Delete all folders
    allFolderIds.forEach(folderId => this.folders.delete(folderId));
  }

  /**
   * Export all data (for backup purposes)
   */
  async exportData(): Promise<{ files: FileSystemFile[], folders: FileSystemFolder[] }> {
    return {
      files: Array.from(this.files.values()),
      folders: Array.from(this.folders.values())
    };
  }

  /**
   * Import data (for restore purposes)
   */
  async importData(data: { files: FileSystemFile[], folders: FileSystemFolder[] }): Promise<void> {
    this.files.clear();
    this.folders.clear();

    data.files.forEach(file => {
      this.files.set(file.id, file);
    });

    data.folders.forEach(folder => {
      this.folders.set(folder.id, folder);
    });
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    this.files.clear();
    this.folders.clear();
  }

  /**
   * Get files in a specific folder
   */
  async getFilesInFolder(folderId?: string): Promise<FileSystemFile[]> {
    return Array.from(this.files.values())
      .filter(file => file.folderId === folderId);
  }

  /**
   * Get child folders of a specific folder
   */
  async getChildFolders(parentId?: string): Promise<FileSystemFolder[]> {
    return Array.from(this.folders.values())
      .filter(folder => folder.parentId === parentId);
  }

  /**
   * Get root folders (folders without parent)
   */
  async getRootFolders(): Promise<FileSystemFolder[]> {
    return this.getChildFolders(undefined);
  }

  /**
   * Move a file to a different folder
   */
  async moveFile(fileId: string, targetFolderId?: string): Promise<FileSystemFile> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Validate target folder exists (if specified)
    if (targetFolderId && !this.folders.has(targetFolderId)) {
      throw new Error('Target folder not found');
    }

    const updatedFile = {
      ...file,
      folderId: targetFolderId,
      lastModified: new Date(),
      unsaved: true
    };

    this.files.set(fileId, updatedFile);
    return updatedFile;
  }

  /**
   * Move a folder to a different parent folder
   */
  async moveFolder(folderId: string, targetParentId?: string): Promise<FileSystemFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Prevent moving folder into itself or its children
    if (targetParentId) {
      if (targetParentId === folderId) {
        throw new Error('Cannot move folder into itself');
      }
      
      const childFolders = await this.getChildFolders(folderId);
      const allChildIds = this.getAllChildFolderIds(childFolders);
      if (allChildIds.includes(targetParentId)) {
        throw new Error('Cannot move folder into its own child');
      }

      // Validate target parent exists
      if (!this.folders.has(targetParentId)) {
        throw new Error('Target parent folder not found');
      }
    }

    const updatedFolder = {
      ...folder,
      parentId: targetParentId
    };

    this.folders.set(folderId, updatedFolder);
    return updatedFolder;
  }

  /**
   * Toggle folder expansion state
   */
  async toggleFolderExpansion(folderId: string): Promise<FileSystemFolder> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const updatedFolder = {
      ...folder,
      isExpanded: !folder.isExpanded
    };

    this.folders.set(folderId, updatedFolder);
    return updatedFolder;
  }

  /**
   * Get the full path of a folder
   */
  async getFolderPath(folderId: string): Promise<string> {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    if (!folder.parentId) {
      return folder.name;
    }

    const parentPath = await this.getFolderPath(folder.parentId);
    return `${parentPath}/${folder.name}`;
  }

  /**
   * Get all child folder IDs recursively
   */
  private getAllChildFolderIds(folders: FileSystemFolder[]): string[] {
    const result: string[] = [];
    
    for (const folder of folders) {
      result.push(folder.id);
      const childFolders = Array.from(this.folders.values())
        .filter(f => f.parentId === folder.id);
      result.push(...this.getAllChildFolderIds(childFolders));
    }
    
    return result;
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): FileSystemFile['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        return 'text';
    }
  }
} 