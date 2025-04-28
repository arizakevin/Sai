// Handle member joined channel event
async function handleMemberJoinedChannel({ event, client }) {
  try {
    const auth = await client.auth.test();
    if (event.user === auth.user_id) {
      await client.chat.postMessage({
        channel: event.channel,
        text: "👋 Hello! I've joined the channel and am ready to help. You can mention me (@GPT) with any questions or use my commands like `/ask`, `/analyze`, or `/diagram`!",
      });
    }
  } catch (error) {
    console.error("Error handling member_joined_channel:", error);
  }
}

// Handle channel join event
async function handleChannelJoin({ event, client }) {
  try {
    const auth = await client.auth.test();
    if (event.user === auth.user_id) {
      console.log(`✅ Joined channel ${event.channel}`);
    }
  } catch (error) {
    console.error("Error handling channel_join:", error);
  }
}

// Handle channel-related errors
async function handleChannelError(error, app) {
  console.error("❌ An error occurred:", error);

  // Handle channel-specific errors
  if (error.data?.error === "not_in_channel") {
    try {
      await app.client.conversations.join({
        channel: error.data.channel,
      });
      console.log(`✅ Automatically joined channel ${error.data.channel}`);
    } catch (joinError) {
      console.error(`❌ Failed to join channel: ${joinError.message}`);
    }
  }
}

module.exports = {
  handleMemberJoinedChannel,
  handleChannelJoin,
  handleChannelError,
};
