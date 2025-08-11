import { TestCaseTemplate } from '../types/inference';

export const TEST_CASE_TEMPLATES: TestCaseTemplate[] = [
  {
    id: 'simple-qa',
    name: 'Simple Q&A',
    description: 'Basic question and answer format',
    category: 'simple',
    messages: [
      {
        role: 'user',
        content: 'Ask your question here...',
      }
    ]
  },
  {
    id: 'multi-turn',
    name: 'Multi-turn Conversation',
    description: 'Extended back-and-forth conversation',
    category: 'multi-turn',
    messages: [
      {
        role: 'user',
        content: 'Start the conversation with an opening question...',
      },
      {
        role: 'assistant',
        content: 'Assistant responds here...',
      },
      {
        role: 'user',
        content: 'Follow-up question or comment...',
      }
    ]
  },
  {
    id: 'few-shot',
    name: 'Few-shot Examples',
    description: 'Provide examples before the main question',
    category: 'few-shot',
    messages: [
      {
        role: 'user',
        content: 'Example 1: [Provide first example here]',
      },
      {
        role: 'assistant',
        content: 'Expected response to example 1...',
      },
      {
        role: 'user',
        content: 'Example 2: [Provide second example here]',
      },
      {
        role: 'assistant',
        content: 'Expected response to example 2...',
      },
      {
        role: 'user',
        content: 'Now the actual question: [Your main question here]',
      }
    ]
  },
  {
    id: 'system-prompt-test',
    name: 'System Prompt Test',
    description: 'Test system behavior and instructions',
    category: 'system',
    messages: [
      {
        role: 'user',
        content: 'Test how well the system follows its instructions with this scenario...',
      }
    ]
  },
  {
    id: 'role-play',
    name: 'Role-play Scenario',
    description: 'Test assistant in a specific role or character',
    category: 'custom',
    messages: [
      {
        role: 'user',
        content: 'You are a [specific role]. Please respond as that character to this situation: [describe scenario]',
      }
    ]
  },
  {
    id: 'error-handling',
    name: 'Error Handling',
    description: 'Test how assistant handles edge cases and errors',
    category: 'custom',
    messages: [
      {
        role: 'user',
        content: 'Test with potentially problematic input: [ambiguous/incomplete/conflicting request]',
      }
    ]
  },
  {
    id: 'creative-task',
    name: 'Creative Task',
    description: 'Test creative and generative capabilities',
    category: 'custom',
    messages: [
      {
        role: 'user',
        content: 'Create something original: [story/poem/code/design/etc.]',
      }
    ]
  },
  {
    id: 'analytical-task',
    name: 'Analytical Task',
    description: 'Test reasoning and analysis capabilities',
    category: 'custom',
    messages: [
      {
        role: 'user',
        content: 'Analyze this scenario and provide insights: [provide data/situation to analyze]',
      }
    ]
  }
];

export const getTemplatesByCategory = (category: TestCaseTemplate['category']) => {
  return TEST_CASE_TEMPLATES.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return TEST_CASE_TEMPLATES.find(template => template.id === id);
};