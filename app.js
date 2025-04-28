require("dotenv").config();
const { App } = require("@slack/bolt");
const { OpenAI } = require("openai");

// Import handlers
const {
  handleExplainCommand,
  handleExplainCodeShortcut,
  handleSimplifyCodeShortcut,
  handleCodeModal,
} = require("./handlers/code-handlers");

const {
  handleImproveCommand,
  handleWritingAssistantShortcut,
  handleSummarizeShortcut,
  handleTextModal,
  handleAskCommand,
  handleAskModal,
  handleAskShortcut,
} = require("./handlers/text-handlers");

const { handleDiagramCommand } = require("./handlers/diagram-handlers");
const {
  handleAnalyzeCommand,
  handleAnalyzeFileModal,
} = require("./handlers/file-handlers");
const {
  handleAppMention,
  sendDM,
  processMessageWithOpenAI,
  addReaction,
  handleChannelAccess,
  handleChannelJoin,
} = require("./handlers/message-handlers");
const {
  handleMemberJoinedChannel,
  handleChannelError,
} = require("./handlers/channel-handlers");
const {
  loggingMiddleware,
  commandLoggingMiddleware,
  actionLoggingMiddleware,
  messageLoggingMiddleware,
  eventLoggingMiddleware,
  viewLoggingMiddleware,
} = require("./middleware/logging");

// Import formatters
const { formatSlackContent } = require("./utils/formatters");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: "DEBUG",
});

// Add global middleware for logging
app.use(loggingMiddleware);

// Add app-level listeners
app.error((error) => {
  console.error("❌ An error occurred:", error);
  console.error("Error stack:", error.stack);
});

// Handle messages in channels and DMs
app.message(async ({ message, say, client }) => {
  if (message.subtype || message.bot_id) return;

  try {
    const auth = await client.auth.test();
    const botUserId = auth.user_id;
    const isDM = message.channel_type === "im";
    const mentionRegex = new RegExp(`<@${botUserId}>|@SAI`, "i");
    const isMentioned = message.text && mentionRegex.test(message.text);

    if (!isDM && !isMentioned) return;

    if (
      !isDM &&
      !(await handleChannelAccess(client, message.channel, message.user))
    ) {
      return;
    }

    const messageText = isMentioned
      ? message.text.replace(mentionRegex, "").trim()
      : message.text.trim();

    if (!messageText) {
      await say({ text: "Hello! How can I assist you today?" });
      return;
    }

    await addReaction(client, message.channel, message.ts, "eyes");
    const content = await processMessageWithOpenAI(openai, messageText);
    const blocks = formatSlackContent(content);

    await say({ blocks, thread_ts: message.thread_ts || message.ts });
    await addReaction(client, message.channel, message.ts, "white_check_mark");
  } catch (error) {
    console.error("Error processing message:", error);
    const errorMessage = error.message || "An unexpected error occurred";

    try {
      await say({ text: `Sorry, I encountered an error: ${errorMessage}` });
    } catch (sayError) {
      console.error("Failed to send error message:", sayError);
      await sendDM(message.user, `I encountered an error: ${errorMessage}`);
    }
  }
});

// Add member_joined_channel handler
app.event("member_joined_channel", async ({ event, client }) => {
  await handleMemberJoinedChannel({ event, client });
});

// Add channel_join handler
app.event("channel_join", async ({ event, client }) => {
  await handleChannelJoin({ event, client });
});

// Add error handler for channel-related errors
app.error(async (error) => {
  await handleChannelError(error, app);
});

// Register command handlers
app.command("/ask", async ({ command, ack, respond }) => {
  await handleAskCommand({ command, ack, respond });
});

// Register command handlers
app.command("/explain", async ({ command, ack, respond }) => {
  await handleExplainCommand({ command, ack, respond });
});

app.command("/improve", async ({ command, ack, respond }) => {
  await handleImproveCommand({ command, ack, respond });
});

app.command("/diagram", async ({ command, ack, respond }) => {
  await handleDiagramCommand({ command, ack, respond });
});

app.command("/analyze", async ({ command, ack, respond, client }) => {
  await handleAnalyzeCommand({ command, ack, respond, client });
});

// Handle analyze file modal submission
app.view("analyze_file_modal", async ({ ack, body, view, client }) => {
  await handleAnalyzeFileModal({ ack, body, view, client });
});

// Handle shortcuts
app.shortcut("ask_shortcut", async ({ shortcut, ack, client }) => {
  await handleAskShortcut({ shortcut, ack, client });
});

// Register shortcut handlers
app.shortcut("explain_code_shortcut", async ({ shortcut, ack, client }) => {
  await handleExplainCodeShortcut({ shortcut, ack, client });
});

app.shortcut("simplify_code_shortcut", async ({ shortcut, ack, client }) => {
  await handleSimplifyCodeShortcut({ shortcut, ack, client });
});

app.shortcut(
  "writing_assistant_shortcut",
  async ({ shortcut, ack, client }) => {
    console.log("👀 Writing assistant shortcut received");
    await handleWritingAssistantShortcut({ shortcut, ack, client });
  }
);

app.shortcut("summarize_text_shortcut", async ({ shortcut, ack, client }) => {
  await handleSummarizeShortcut({ shortcut, ack, client });
});

// Handle modal submissions
app.view("ask_modal", async ({ ack, body, view, client }) => {
  await handleAskModal({ ack, body, view, client });
});

// Register modal submission handlers
app.view("explain_code_modal", async ({ ack, body, view, client }) => {
  await handleCodeModal({ view, ack, body, client, type: "explain" });
});

app.view("simplify_code_modal", async ({ ack, body, view, client }) => {
  await handleCodeModal({ view, ack, body, client, type: "simplify" });
});

app.view("writing_assistant_modal", async ({ ack, body, view, client }) => {
  console.log("👀 Writing assistant modal received");
  await handleTextModal({ view, ack, body, client, type: "writing" });
});

app.view("summarize_modal", async ({ ack, body, view, client }) => {
  await handleTextModal({ view, ack, body, client, type: "summarize" });
});

app.view("rewrite_modal", async ({ ack, body, view, client }) => {
  await handleTextModal({ view, ack, body, client, type: "rewrite" });
});

// Handle app mentions specifically
app.event("app_mention", async ({ event, client, say, logger }) => {
  await handleAppMention({ event, client, say, logger });
});

// Add logging middleware for slash commands
app.command(/.*/, commandLoggingMiddleware);

// Add logging middleware for interactive actions
app.action(/.*/, actionLoggingMiddleware);

// Add catch-all message listener
app.message(messageLoggingMiddleware);

// Add catch-all event listener for events that aren't explicitly handled
app.event(/.*/, eventLoggingMiddleware);

// Add logging middleware for views
app.view(/.*/, viewLoggingMiddleware);

// Start the app
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log("⚡️ SAI app is running!");
    console.log("🔌 Socket Mode is enabled");
    console.log("🎨 Multimodal support enabled");
    console.log("📊 Mermaid diagrams support enabled");

    // Test the connection
    const auth = await app.client.auth.test();
    console.log("🤖 Bot User ID:", auth.user_id);
    console.log("✅ Connected to Slack!");
  } catch (error) {
    console.error("❌ Error starting app:", error);
    process.exit(1);
  }
})();
