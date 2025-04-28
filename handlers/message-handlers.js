const { OpenAI } = require("openai");
const { formatSlackContent } = require("../utils/formatters");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle app mention events
async function handleAppMention({ event, client, say }) {
  try {
    console.log(
      "👋 Received app_mention event:",
      JSON.stringify(event, null, 2)
    );

    await addReaction(client, event.channel, event.ts, "eyes");
    await client.auth.test();

    if (!(await handleChannelAccess(client, event.channel, event.user))) {
      return;
    }

    const messageText = event.text.replace(/<@[^>]+>/, "").trim();
    if (!messageText) {
      await say({ text: "Hello! How can I assist you today?" });
      return;
    }

    const content = await processMessageWithOpenAI(openai, messageText);
    const blocks = formatSlackContent(content);

    await say({ blocks, thread_ts: event.thread_ts || event.ts });
    await addReaction(client, event.channel, event.ts, "white_check_mark");
  } catch (error) {
    console.error("Error processing app_mention:", error);
    const errorMessage = error.message || "An unexpected error occurred";

    try {
      await say({ text: `Sorry, I encountered an error: ${errorMessage}` });
    } catch (sayError) {
      console.error("Failed to send error message:", sayError);
      await sendDM(
        client,
        event.user,
        `I encountered an error: ${errorMessage}`
      );
    }
  }
}

async function sendDM(client, userId, message) {
  try {
    const dmChannel = await client.conversations.open({ users: userId });
    await client.chat.postMessage({
      channel: dmChannel.channel.id,
      text: message,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send DM to user ${userId}:`, error.message);
    return false;
  }
}

async function processMessageWithOpenAI(openai, messageText) {
  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant in a Slack workspace. Be concise but informative. Format your responses for Slack with these guidelines:\n" +
          "1. Use ```language\ncode``` for code blocks with proper language name (python, javascript, etc.)\n" +
          "2. Use ```mermaid\n``` for diagram code\n" +
          "3. For emphasis use *bold* and _italic_\n" +
          "4. Use numbered lists (1. Item) and bullet points (• Item)\n" +
          "5. Use clear section headers formatted in *bold*",
      },
      { role: "user", content: messageText },
    ],
  });
  return chatResponse.choices[0].message.content;
}

async function addReaction(client, channel, timestamp, name) {
  try {
    await client.reactions.add({ channel, name, timestamp });
    return true;
  } catch (error) {
    console.error(`Failed to add reaction ${name} to message:`, error.message);
    return false;
  }
}

async function handleChannelJoin(client, channelId, userId) {
  try {
    await client.conversations.join({ channel: channelId });
    console.log(`✅ Joined channel ${channelId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to join channel:`, error);
    await sendDM(
      client,
      userId,
      "I couldn't join the channel. Please make sure I've been invited."
    );
    return false;
  }
}

async function handleChannelAccess(client, channelId, userId) {
  try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    if (channelInfo.channel && !channelInfo.channel.is_member) {
      return await handleChannelJoin(client, channelId, userId);
    }
    return true;
  } catch (error) {
    if (error.data?.error === "not_in_channel") {
      return await handleChannelJoin(client, channelId, userId);
    }
    console.error(`Channel access error:`, error.data);
    await sendDM(
      client,
      userId,
      "I couldn't access the channel. Please check my permissions."
    );
    return false;
  }
}

module.exports = {
  handleAppMention,
  sendDM,
  processMessageWithOpenAI,
  addReaction,
  handleChannelAccess,
  handleChannelJoin,
};
