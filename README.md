# Promptly

![Promptly Logo](public/promptly_horizontal.svg)

**An open-source prompt engineering platform. Create, test, and optimize your system prompts using AI!**

Promptly provides an intuitive interface for prompt engineering workflows with advanced features like multi-provider support, batch testing, visual diff comparison, and AI-powered assistance. It's like Cursor, but for system prompts!

---

## ✨ Features

### 🎯 **Advanced Prompt Engineering**
- **Agent P System** - Elite prompt design assistant for creating sophisticated system prompts
- **Visual Diff Viewer** - Compare prompt versions and see changes side-by-side
- **Right Click AI Assistance** - Get quick intelligent suggestions while crafting prompts by highlighting and right-clicking

### 🚀 **Multi-Provider AI Support**
- **OpenAI Models**: GPT-5, GPT-5 Mini/Nano/Pro/Thinking, o3, o3-mini, o4-mini, GPT-4.1
- **Anthropic Models**: Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet
- **Google Models**: Gemini 2.5 Pro/Flash/Flash Lite, Gemini 2.0 Flash/Flash Lite, Gemini 1.5 Pro

### 🔬 **Testing & Evaluation**
- **Batch Testing** - Run multiple test cases simultaneously across different models
- **Test Case Management** - Organize and reuse test scenarios

### 🔒 **Privacy & Security**
- **Local-First Architecture** - All data stored in your browser, nothing sent to external servers
- **Secure API Key Storage** - Keys stored locally, never transmitted or logged
- **No Telemetry** - Complete privacy with no usage tracking
- **Open Source** - Full transparency with complete source code available

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys from your preferred AI providers

### Installation

```bash
# Clone the repository
git clone https://github.com/KazumaChoji/promptly.git
cd promptly

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and start prompt engineering!

---

## 🔑 API Key Setup

Promptly requires API keys from AI providers to function. These are stored securely in your browser's local storage.

### Getting API Keys

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign in and navigate to API Keys
3. Create a new secret key
4. Copy the key (starts with `sk-`)

#### Anthropic
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign in and go to API Keys
3. Create a new key
4. Copy the key (starts with `sk-ant-`)

#### Google (Gemini)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key (starts with `AIza`)

### Adding Keys to Promptly

1. Open Promptly in your browser
2. Navigate to **Settings** (gear icon in top bar)
3. Go to the **API Keys** tab
4. Paste your keys into the respective fields
5. Click **Save Changes**

Your keys are encrypted and stored locally - they never leave your browser.

---

## 📖 Usage Guide

### Basic Prompt Testing

1. **Create a Prompt**
   - Open the Studio interface
   - Write your system prompt in the main editor
   - Make sure to click the "save" button next to your file name in the file explorer!

2. **Test Your Prompt**
   - Create a batch, and form test cases within each batch (e.g. a Customer Service batch with different customer service request test cases)
   - Select your preferred AI model and provider
   - Click "Run Test" to see results

3. **Iterate and improve**
   - Run the same prompt across different models
   - Iterate on your system prompts to improve performance

---

## 🛠 Development

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code engine)
- **State Management**: Zustand
- **Storage**: Browser localStorage (local-first)
- **AI Integration**: Direct API calls to OpenAI, Anthropic, Google

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Happy prompt engineering! Star this repo if this was useful!**
</div>