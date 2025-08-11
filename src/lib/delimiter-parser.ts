/**
 * Delimiter Parser Service
 * Handles parsing of AI responses with special delimiters for system prompts and edit instructions
 */

export interface ParsedResponse {
  // Content that goes to the AI sidebar (everything except parsed blocks)
  sidebarContent: string;
  // Content that goes to the text editor (system prompts or edit results)
  editorContent: string | null;
  // Type of editor content found
  editorContentType: 'system' | 'edit' | null;
  // Original edit instructions (for debugging/logging)
  editInstructions?: EditInstruction[];
}

export interface EditInstruction {
  replace: string;
  with: string;
  applied: boolean;
  error?: string;
}

export class DelimiterParser {
  /**
   * Parse AI response and extract system prompts, edit instructions, and sidebar content
   */
  static parseResponse(response: string, currentEditorContent?: string): ParsedResponse {
    const result: ParsedResponse = {
      sidebarContent: '',
      editorContent: null,
      editorContentType: null,
      editInstructions: []
    };

    // Find all code blocks with system or edit delimiters
    const codeBlockRegex = /```(system|edit)\n?([\s\S]*?)(?:```|$)/gi;
    let matches: RegExpExecArray | null;
    let lastIndex = 0;
    let sidebarParts: string[] = [];
    let systemContent: string | null = null;
    let editInstructions: EditInstruction[] = [];

    // Process each matched code block
    while ((matches = codeBlockRegex.exec(response)) !== null) {
      const [fullMatch, type, content] = matches;
      const startIndex = matches.index;

      // Add content before this code block to sidebar
      if (startIndex > lastIndex) {
        const beforeContent = response.slice(lastIndex, startIndex).trim();
        if (beforeContent) {
          sidebarParts.push(beforeContent);
        }
      }

      if (type === 'system') {
        // Extract system prompt content
        systemContent = content.trim();
        result.editorContentType = 'system';
      } else if (type === 'edit') {
        // Parse edit instructions
        const instructions = this.parseEditInstructions(content);
        editInstructions.push(...instructions);
        result.editorContentType = 'edit';
      }

      lastIndex = startIndex + fullMatch.length;
    }

    // Add any remaining content after the last code block to sidebar
    if (lastIndex < response.length) {
      const afterContent = response.slice(lastIndex).trim();
      if (afterContent) {
        sidebarParts.push(afterContent);
      }
    }

    // If no code blocks were found, everything goes to sidebar
    if (lastIndex === 0) {
      sidebarParts.push(response.trim());
    }

    // Set sidebar content
    result.sidebarContent = sidebarParts.join('\n\n').trim();

    // Handle editor content based on type
    if (result.editorContentType === 'system') {
      result.editorContent = systemContent;
    } else if (result.editorContentType === 'edit' && currentEditorContent) {
      // Apply edit instructions to current editor content
      const editResult = this.applyEditInstructions(currentEditorContent, editInstructions);
      result.editorContent = editResult.content;
      result.editInstructions = editResult.instructions;
    }

    return result;
  }

  /**
   * Parse edit instructions from content block
   */
  private static parseEditInstructions(content: string): EditInstruction[] {
    const instructions: EditInstruction[] = [];
    
    // Match replace/with patterns
    const editRegex = /replace:\s*["']([^"']+)["']\s*with:\s*["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = editRegex.exec(content)) !== null) {
      instructions.push({
        replace: match[1],
        with: match[2],
        applied: false
      });
    }

    // Also try without quotes for more flexible parsing
    if (instructions.length === 0) {
      const flexibleRegex = /replace:\s*(.+?)\s*with:\s*(.+?)(?:\n|$)/gi;
      while ((match = flexibleRegex.exec(content)) !== null) {
        const replaceText = match[1].replace(/^["']|["']$/g, '').trim();
        const withText = match[2].replace(/^["']|["']$/g, '').trim();
        
        if (replaceText && withText) {
          instructions.push({
            replace: replaceText,
            with: withText,
            applied: false
          });
        }
      }
    }

    return instructions;
  }

  /**
   * Apply edit instructions to text content
   */
  private static applyEditInstructions(
    content: string, 
    instructions: EditInstruction[]
  ): { content: string; instructions: EditInstruction[] } {
    let modifiedContent = content;
    const processedInstructions = [...instructions];

    for (const instruction of processedInstructions) {
      try {
        // Check if the text to replace exists
        if (modifiedContent.includes(instruction.replace)) {
          // Replace the text
          modifiedContent = modifiedContent.replace(instruction.replace, instruction.with);
          instruction.applied = true;
        } else {
          // Try fuzzy matching for similar text
          const fuzzyMatch = this.findFuzzyMatch(modifiedContent, instruction.replace);
          if (fuzzyMatch) {
            modifiedContent = modifiedContent.replace(fuzzyMatch, instruction.with);
            instruction.applied = true;
          } else {
            instruction.applied = false;
            instruction.error = `Text not found: "${instruction.replace}"`;
          }
        }
      } catch (error) {
        instruction.applied = false;
        instruction.error = `Error applying edit: ${error}`;
      }
    }

    return {
      content: modifiedContent,
      instructions: processedInstructions
    };
  }

  /**
   * Find fuzzy matches for text that might have slight differences
   */
  private static findFuzzyMatch(content: string, target: string): string | null {
    // Simple fuzzy matching - look for text with similar length and some matching words
    const targetWords = target.toLowerCase().split(/\s+/);
    const contentLines = content.split('\n');

    for (const line of contentLines) {
      const lineWords = line.toLowerCase().split(/\s+/);
      const matchCount = targetWords.filter(word => 
        lineWords.some(lineWord => lineWord.includes(word) || word.includes(lineWord))
      ).length;

      // If more than half the words match and length is similar, consider it a match
      if (matchCount > targetWords.length / 2 && 
          Math.abs(line.length - target.length) < target.length * 0.5) {
        return line;
      }
    }

    return null;
  }

  /**
   * Handle edge case where closing ``` might be missing due to token limits
   */
  static parseResponseWithIncompleteDelimiters(response: string, currentEditorContent?: string): ParsedResponse {
    // Check if response ends with a system or edit block that might be incomplete
    const incompleteSystemRegex = /```system\n?([\s\S]*)$/i;
    const incompleteEditRegex = /```edit\n?([\s\S]*)$/i;

    let systemMatch = response.match(incompleteSystemRegex);
    let editMatch = response.match(incompleteEditRegex);

    if (systemMatch) {
      // Everything after ```system should be the system prompt
      const beforeSystem = response.substring(0, systemMatch.index || 0).trim();
      return {
        sidebarContent: beforeSystem,
        editorContent: systemMatch[1].trim(),
        editorContentType: 'system'
      };
    }

    if (editMatch) {
      // Parse incomplete edit instructions
      const beforeEdit = response.substring(0, editMatch.index || 0).trim();
      const editContent = editMatch[1];
      const instructions = this.parseEditInstructions(editContent);
      
      if (currentEditorContent && instructions.length > 0) {
        const editResult = this.applyEditInstructions(currentEditorContent, instructions);
        return {
          sidebarContent: beforeEdit,
          editorContent: editResult.content,
          editorContentType: 'edit',
          editInstructions: editResult.instructions
        };
      }
    }

    // No incomplete delimiters found, use normal parsing
    return this.parseResponse(response, currentEditorContent);
  }
}