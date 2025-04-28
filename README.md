# Sai

AI assistant directly into your Slack workspace.

Sai is your versatile multi-model AI assistant that seamlessly integrates with your Slack workspace.

## Key Features

• Flexible Models: Connect to various AI systems including GPT and self-hosted Ollama models
• Instant Answers: Get quick responses to your questions in any channel
• Context-Aware: Maintains conversation threads for coherent discussions
• Natural Language: Communicate naturally as you would with a team member
• Versatile Assistance:

- Answer questions and provide explanations
- Help with code and technical queries
- Assist with writing and editing
- Summarize text and discussions
- Analyze files and images

## Perfect for

• Development teams needing quick code explanations
• Writers seeking editorial assistance
• Teams looking for quick answers to questions
• Organizations wanting to leverage both cloud and self-hosted AI models
• Anyone wanting powerful AI assistance within their Slack workflow

## Setup

1. Create a new Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. In your app settings, go to "App Manifest" and replace the content with the provided manifest configuration from `manifest.json`
3. Enable Socket Mode in your app settings
4. Generate an App-Level Token with `connections:write` scope
5. Install the app to your workspace and get the Bot User OAuth Token
6. Get an OpenAI API key from [OpenAI](https://platform.openai.com/api-keys)
7. Create a `.env` file with the following variables:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   OPENAI_API_KEY=your-openai-api-key
   ```
8. Install dependencies:
   ```bash
   npm install
   ```
9. Start the app:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

1. Simply mention @Prompty in any channel
2. Ask your question or request assistance
3. Get instant, thoughtful responses right in your thread

### Available Commands

- `/ask` - Ask GPT any question directly
- `/explain` - Get an explanation of code snippets
- `/improve` - Improve or rewrite text
- `/diagram` - Generate a diagram from text description
- `/analyze` - Analyze images or PDF files

### Global Shortcuts

- **Ask GPT** - Quick access to GPT assistance
- **Writing Assistant** - Get help with writing and editing
- **Summarize Text** - Create concise summaries of content
- **Simplify Code** - Refactor and improve code snippets
- **Explain Code** - Get detailed code explanations

## Features

- Multimodal capabilities:
  - Image generation and processing
  - PDF parsing and analysis
  - Mermaid diagram generation
- Thread-based conversations
- Context awareness
- Error handling and graceful fallbacks
- Socket Mode for secure local development

## Dependencies

- @slack/bolt: Slack app framework
- openai: OpenAI API client
- pdf-parse: PDF document parsing
- sharp: Image processing
- dotenv: Environment variable management
- node-fetch: HTTP client

## Development

The project uses nodemon for development, which automatically restarts the server when files change. To start in development mode:

```bash
npm run dev
```

## About

Built by Kevin Ariza. The assistant maintains conversation context within threads and provides detailed, helpful responses while staying within your Slack workflow.
