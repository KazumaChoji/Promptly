import * as monaco from 'monaco-editor';

export type EditInstruction =
  | { type: 'replace'; target: string; replacement: string }
  | { type: 'insert_before' | 'insert_after'; target: string; content: string }
  | { type: 'delete'; target: string };

// Extract edit blocks from AI responses
export function extractEditBlock(text: string): string | null {
  // First try to find edit block with new unique delimiters
  const newDelimiterMatch = text.match(/<\|PROMPTLY_EDIT_START\|>([\s\S]*?)<\|PROMPTLY_EDIT_END\|>/);
  if (newDelimiterMatch) {
    return newDelimiterMatch[1].trim();
  }
  
  // Fallback: try old ```edit wrapper for backward compatibility
  const wrappedMatch = text.match(/```edit\n([\s\S]*?)```/);
  if (wrappedMatch) {
    return wrappedMatch[1].trim();
  }
  
  // If no wrapper found, check if the text contains edit instructions directly
  if (text.includes('replace:') && text.includes('with:')) {
    return text.trim();
  }
  
  return null;
}

export function parseEditBlock(raw: string): EditInstruction[] {
  const lines = raw.trim().split('\n');
  const edits: EditInstruction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle single-line format: replace: "old" with: "new"
    const singleLineMatch = line.match(/replace:\s*"([^"]+)"\s+with:\s*"([^"]+)"/);
    if (singleLineMatch) {
      edits.push({ type: 'replace', target: singleLineMatch[1], replacement: singleLineMatch[2] });
      continue;
    }

    // Handle multi-line format
    if (line.startsWith('replace:')) {
      const target = line.slice(8).trim().replace(/^"|"$/g, '');
      const withLine = lines[i + 1] || '';
      if (!withLine.startsWith('with:')) continue;
      const replacement = withLine.slice(5).trim().replace(/^"|"$/g, '');
      edits.push({ type: 'replace', target, replacement });
      i++; // skip the next line
    } else if (line.startsWith('insert before:')) {
      const target = line.slice(14).trim().replace(/^"|"$/g, '');
      const contentLine = lines[i + 1] || '';
      if (!contentLine.startsWith('content:')) continue;
      const content = contentLine.slice(8).trim().replace(/^"|"$/g, '');
      edits.push({ type: 'insert_before', target, content });
      i++;
    } else if (line.startsWith('insert after:')) {
      const target = line.slice(13).trim().replace(/^"|"$/g, '');
      const contentLine = lines[i + 1] || '';
      if (!contentLine.startsWith('content:')) continue;
      const content = contentLine.slice(8).trim().replace(/^"|"$/g, '');
      edits.push({ type: 'insert_after', target, content });
      i++;
    } else if (line.startsWith('delete:')) {
      const target = line.slice(7).trim().replace(/^"|"$/g, '');
      edits.push({ type: 'delete', target });
    }
  }

  return edits;
}

export function applyEditsToMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: EditInstruction[]
) {
  if (!editor || typeof editor.getModel !== 'function') {
    console.error('Invalid editor instance passed to applyEditsToMonaco');
    return;
  }
  
  const model = editor.getModel();
  if (!model) {
    console.error('Editor model is null in applyEditsToMonaco');
    return;
  }

  const content = model.getValue();
  const newOperations: monaco.editor.IIdentifiedSingleEditOperation[] = [];

  for (const edit of edits) {
    const index = content.indexOf(edit.target);
    if (index === -1) {
      // Fallback: if target not found, insert at cursor or append to end
      console.warn(`Target text not found: "${edit.target}"`);
      continue;
    }

    const startPos = model.getPositionAt(index);
    const endPos = model.getPositionAt(index + edit.target.length);
    const range = new monaco.Range(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column
    );

    if (edit.type === 'replace') {
      newOperations.push({ range, text: edit.replacement, forceMoveMarkers: true });
    } else if (edit.type === 'insert_before') {
      newOperations.push({
        range: new monaco.Range(startPos.lineNumber, 1, startPos.lineNumber, 1),
        text: edit.content + '\n',
        forceMoveMarkers: true,
      });
    } else if (edit.type === 'insert_after') {
      newOperations.push({
        range: new monaco.Range(endPos.lineNumber + 1, 1, endPos.lineNumber + 1, 1),
        text: edit.content + '\n',
        forceMoveMarkers: true,
      });
    } else if (edit.type === 'delete') {
      newOperations.push({ range, text: '', forceMoveMarkers: true });
    }
  }

  if (newOperations.length > 0) {
    editor.executeEdits('promptcraft', newOperations);
  }
}

// Fallback function for when target text is not found
export function fallbackInsert(
  editor: monaco.editor.IStandaloneCodeEditor,
  text: string,
  position: 'cursor' | 'end' = 'end'
) {
  if (!editor || typeof editor.getModel !== 'function') {
    console.error('Invalid editor instance passed to fallbackInsert');
    return;
  }
  
  const model = editor.getModel();
  if (!model) {
    console.error('Editor model is null');
    return;
  }

  let range: monaco.Range;
  
  if (position === 'cursor') {
    const pos = editor.getPosition();
    if (!pos) {
      // Fallback to end if position is null
      const lastLine = model.getLineCount();
      const lastLineLength = model.getLineLength(lastLine);
      range = new monaco.Range(lastLine, lastLineLength + 1, lastLine, lastLineLength + 1);
    } else {
      range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1);
    }
  } else {
    // Insert at the end
    const lastLine = model.getLineCount();
    const lastLineLength = model.getLineLength(lastLine);
    range = new monaco.Range(lastLine, lastLineLength + 1, lastLine, lastLineLength + 1);
  }

  editor.executeEdits('fallback', [{
    range,
    text: text + '\n',
    forceMoveMarkers: true
  }]);
}

// Main function to process AI responses with edit blocks
export function processAIResponseWithEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  response: string
): { hasEdits: boolean; conversationalContent: string } {
  if (!editor || typeof editor.getModel !== 'function') {
    console.error('Invalid editor instance passed to processAIResponseWithEdits');
    return { hasEdits: false, conversationalContent: response };
  }
  
  const editBlock = extractEditBlock(response);
  
  if (editBlock) {
    const editInstructions = parseEditBlock(editBlock);
    if (editInstructions.length > 0) {
      applyEditsToMonaco(editor, editInstructions);
      
      // Remove edit block from conversational content (try new delimiters first, then old)
      let conversationalContent = response.replace(/<\|PROMPTLY_EDIT_START\|>[\s\S]*?<\|PROMPTLY_EDIT_END\|>/g, '').trim();
      if (conversationalContent === response) {
        // Fallback to old delimiter removal
        conversationalContent = response.replace(/```edit\n[\s\S]*?```/g, '').trim();
      }
      return { hasEdits: true, conversationalContent };
    }
  }
  
  return { hasEdits: false, conversationalContent: response };
} 