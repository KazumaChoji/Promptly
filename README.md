# Promptly

![Promptly Logo](public/promptly_horizontal.svg)

**An open-source prompt engineering platform for creating and testing system prompts.**

I got tired of copying prompts between different AI chat interfaces and losing track of what worked. Use Promptly to iterate on your system prompts when building AI agents. Promptly lets you use AI to write prompts, test them across multiple AI models, and actually see what changes when you iterate.

## What it does

**Prompt editing** - Write your system prompts.

**Multi-model testing** - Run the same prompt against GPT, Claude, or Gemini. See how different models respond to identical inputs.

**Batch testing** - Set up test cases once, run them repeatedly. Great for checking if your prompt improvements actually do anything.

**Version comparison** - Side-by-side diff view so you can see exactly what changed between prompt versions when asking for AI edits (kinda like Cursor's inline red/green system).

**Local storage** - Everything stays in your browser. Your prompts, test results, API keys - none of it gets sent to my servers because I don't wanna pay for servers.

**AI assistance** - Highlight and Right-click on text to get quick suggestions for improving your prompts. Just for small improvements.

## Supported models

**OpenAI**: GPT-5, GPT-4.1, o3, o3-mini, o4-mini, plus the various GPT-5 variants
**Anthropic**: Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet  
**Google**: Gemini 2.5 Pro/Flash, Gemini 2.0 Flash, Gemini 1.5 Pro

## Getting started

You'll need Node.js 18+ and API keys from whichever AI providers you want to use.

```bash
git clone https://github.com/KazumaChoji/promptly.git
cd promptly
npm install
npm run dev
```

Open http://localhost:3000 and you're good to go.

## API keys

Promptly needs API keys to actually talk to the AI models. Get them from:

- **OpenAI**: [platform.openai.com](https://platform.openai.com/) → API Keys
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/) → API Keys  
- **Google**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

In Promptly, click the settings gear → API Keys tab → paste your keys. They're stored locally in your browser and never sent anywhere else.

## How to use it

1. **Write a prompt** - Use the editor to write your system prompt. Hit save.

2. **Create test cases** - Make a batch (like "Customer Service") and add test cases with different user inputs you want to try.

3. **Run tests** - Pick your models and hit "Run Test." Watch the responses come in.


## Built with

Next.js 14, React 18, TypeScript, CodeMirror for the editor, Zustand for state, Tailwind + Radix UI for the interface. Material-UI and Framer Motion too.

---

If this helps with your prompt engineering workflow, please star the repo!
