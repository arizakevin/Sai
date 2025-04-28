const { OpenAI } = require("openai");
const { formatSlackContent } = require("../utils/formatters");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle improve text command
async function handleImproveCommand({ command, ack, respond }) {
  try {
    await ack();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a writing assistant. Improve the text to be more clear, concise, and professional while maintaining its core message. Format your responses for Slack with these guidelines:\n" +
            "1. Use *bold* for important points and _italic_ for emphasis\n" +
            "2. Use numbered lists (1. Item) for sequences and bullet points (• Item) for key points\n" +
            "3. Use clear section headers formatted in *bold*\n" +
            "4. If referencing code, use ```language\ncode``` syntax with proper language name\n" +
            "5. Maintain good paragraph spacing for readability",
        },
        {
          role: "user",
          content: `Please improve this text:\n${command.text}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const blocks = formatSlackContent(content);

    await respond({
      blocks: blocks,
    });
  } catch (error) {
    console.error("Error:", error);
    await respond(
      "Sorry, I encountered an error while processing your request."
    );
  }
}

// Handle writing assistant shortcut
async function handleWritingAssistantShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    console.log(
      "✏️ Received writing assistant shortcut:",
      JSON.stringify(shortcut, null, 2)
    );

    // Get the message content from the shortcut payload
    let initialValue = "";
    if (shortcut.message?.text) {
      initialValue = shortcut.message.text;
    }

    // Enhanced channel detection - prioritize direct channel ID access
    let channelId = "";
    let contextSource = "unknown";

    // First check direct channel access (as shown in the example)
    if (shortcut.channel?.id) {
      channelId = shortcut.channel.id;
      contextSource = "channel.id";
    }
    // If no direct channel, check other sources as fallbacks
    else if (shortcut.conversation_id) {
      channelId = shortcut.conversation_id;
      contextSource = "conversation_id";
    } else if (shortcut.message?.channel_id) {
      channelId = shortcut.message.channel_id;
      contextSource = "message.channel_id";
    }

    // Log channel source for debugging
    console.log(
      `📋 Channel context: ID: ${channelId}, Source: ${contextSource}`
    );

    // Save channel and thread information for later use
    const metadata = JSON.stringify({
      channel: channelId,
      thread_ts: shortcut.message?.ts || null,
      user: shortcut.user?.id || "",
      // Track if this was triggered from a message for better context handling
      has_message_context: !!shortcut.message,
    });

    console.log("📝 Writing assistant metadata:", metadata);

    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: "modal",
        callback_id: "writing_assistant_modal",
        private_metadata: metadata,
        title: {
          type: "plain_text",
          text: "Writing Assistant",
        },
        submit: {
          type: "plain_text",
          text: "Improve",
        },
        blocks: [
          {
            type: "input",
            block_id: "text_block",
            element: {
              type: "plain_text_input",
              action_id: "text",
              multiline: true,
              initial_value: initialValue,
              placeholder: {
                type: "plain_text",
                text: "Enter your text here",
              },
            },
            label: {
              type: "plain_text",
              text: "Text",
            },
          },
          {
            type: "input",
            block_id: "style_block",
            element: {
              type: "static_select",
              action_id: "style",
              placeholder: {
                type: "plain_text",
                text: "Select writing style",
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Professional",
                  },
                  value: "professional",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Casual",
                  },
                  value: "casual",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Technical",
                  },
                  value: "technical",
                },
              ],
            },
            label: {
              type: "plain_text",
              text: "Style",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error in writing assistant shortcut handler:", error);

    // Try to notify the user if the shortcut fails
    if (shortcut?.user?.id) {
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, I encountered an error opening the writing assistant. Please try again.",
        });
      } catch (dmError) {
        console.error("Error sending error notification:", dmError);
      }
    }
  }
}

// Handle summarize text shortcut
async function handleSummarizeShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    console.log(
      "📝 Received summarize shortcut:",
      JSON.stringify(shortcut, null, 2)
    );

    // Get the message content from the shortcut payload
    let initialValue = "";
    if (shortcut?.message?.text) {
      initialValue = shortcut.message.text;
    }

    // Enhanced channel detection - prioritize direct channel ID access
    let channelId = "";
    let contextSource = "unknown";

    // First check direct channel access (as shown in the example)
    if (shortcut?.channel?.id) {
      channelId = shortcut.channel.id;
      contextSource = "channel.id";
    }
    // If no direct channel, check other sources as fallbacks
    else if (shortcut?.conversation_id) {
      channelId = shortcut.conversation_id;
      contextSource = "conversation_id";
    } else if (shortcut?.message?.channel_id) {
      channelId = shortcut.message.channel_id;
      contextSource = "message.channel_id";
    }

    // Log channel source for debugging
    console.log(
      `📋 Channel context: ID: ${channelId}, Source: ${contextSource}`
    );

    // Save channel and thread information for later use
    const metadata = JSON.stringify({
      channel: channelId,
      thread_ts: shortcut.message?.ts || null,
      user: shortcut.user?.id || "",
      // Track if this was triggered from a message for better context handling
      has_message_context: !!shortcut.message,
    });

    console.log("📝 Summarize text metadata:", metadata);

    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: "modal",
        callback_id: "summarize_modal",
        private_metadata: metadata,
        title: {
          type: "plain_text",
          text: "Summarize Text",
        },
        submit: {
          type: "plain_text",
          text: "Summarize",
        },
        blocks: [
          {
            type: "input",
            block_id: "text_block",
            element: {
              type: "plain_text_input",
              action_id: "text",
              multiline: true,
              initial_value: initialValue,
              placeholder: {
                type: "plain_text",
                text: "Paste the text you want to summarize",
              },
            },
            label: {
              type: "plain_text",
              text: "Text",
            },
          },
          {
            type: "input",
            block_id: "length_block",
            element: {
              type: "static_select",
              action_id: "length",
              placeholder: {
                type: "plain_text",
                text: "Select summary length",
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Brief",
                  },
                  value: "brief",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Detailed",
                  },
                  value: "detailed",
                },
              ],
            },
            label: {
              type: "plain_text",
              text: "Summary Length",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error in summarize shortcut handler:", error);

    // Try to notify the user if the shortcut fails
    if (shortcut?.user?.id) {
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, I encountered an error opening the summarize text modal. Please try again.",
        });
      } catch (dmError) {
        console.error("Error sending error notification:", dmError);
      }
    }
  }
}

function getSystemPrompt(type) {
  switch (type) {
    case "summarize":
      return (
        "You are a text summarization assistant. Summarize the following text concisely while preserving the key points. Format your responses for Slack with these guidelines:\n" +
        "1. Use *bold* for important concepts and _italic_ for emphasis\n" +
        "2. Use numbered lists (1. Item) for key points\n" +
        "3. Use clear section headers formatted in *bold*\n" +
        "4. Keep the summary clear and professional\n" +
        "5. Maintain the original meaning while being concise"
      );
    case "writing":
      return (
        "You are a writing assistant. Improve the following text while maintaining its meaning. Format your responses for Slack with these guidelines:\n" +
        "1. Use *bold* for important concepts and _italic_ for emphasis\n" +
        "2. Use numbered lists (1. Item) for key points and bullet points (• Item) for details\n" +
        "3. Use clear section headers formatted in *bold* if appropriate\n" +
        "4. Separate paragraphs with a blank line\n" +
        "5. Maintain professional formatting appropriate to the content"
      );
    case "rewrite":
      return (
        "You are a text rewriting assistant. Rewrite the following text while preserving the core meaning. Format your responses for Slack with these guidelines:\n" +
        "1. Use *bold* for important concepts and _italic_ for emphasis\n" +
        "2. Use numbered lists (1. Item) for sequences and bullet points (• Item) for key points\n" +
        "3. Use clear section headers formatted in *bold* if appropriate\n" +
        "4. Separate paragraphs with a blank line\n" +
        "5. Maintain appropriate tone and formatting for the requested style"
      );
    default:
      return (
        "You are a helpful assistant. Format your responses for Slack with these guidelines:\n" +
        "1. Use *bold* for important concepts and _italic_ for emphasis\n" +
        "2. Use numbered lists (1. Item) for sequences and bullet points (• Item) for key points\n" +
        "3. Use clear section headers formatted in *bold* if appropriate\n" +
        "4. Separate paragraphs with a blank line\n" +
        "5. Maintain appropriate tone and formatting"
      );
  }
}

function getTextType(type) {
  switch (type) {
    case "summarize":
      return "summary";
    case "rewrite":
      return "rewritten text";
    default:
      return "improved text";
  }
}

async function getChannelInfo(client, channelId) {
  try {
    return await client.conversations.info({ channel: channelId });
  } catch (error) {
    console.error(`Channel info error: ${error.message}`, error.data);
    throw error;
  }
}

async function sendToDMChannel(client, user, blocks, thread_ts) {
  try {
    const dmOpenResult = await client.conversations.open({ users: user });
    await client.chat.postMessage({
      channel: dmOpenResult.channel.id,
      blocks,
      thread_ts,
    });
    return true;
  } catch (error) {
    console.error("Error sending to DM:", error);
    return false;
  }
}

async function sendToRegularChannel(
  client,
  channel,
  blocks,
  thread_ts,
  user,
  type
) {
  try {
    await client.conversations.info({ channel });
    await client.chat.postMessage({ channel, blocks, thread_ts });
    await client.chat.postMessage({
      channel: user,
      text: `I've posted the ${getTextType(type)} in the channel.`,
    });
    return true;
  } catch (error) {
    console.error("Error sending to channel:", error);
    return false;
  }
}

async function handleTextModal({ view, ack, body, client, type }) {
  try {
    await ack();
    const text = view.state.values.text_block.text.value;
    const user = body.user.id;
    let channel = user;
    let thread_ts = null;

    try {
      if (view.private_metadata) {
        const metadata = JSON.parse(view.private_metadata);
        channel = metadata.channel || user;
        thread_ts = metadata.thread_ts || null;
      }
    } catch (error) {
      console.error("Error parsing metadata:", error);
    }

    const systemPrompt = getSystemPrompt(type);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const content = response.choices[0].message.content;
    const blocks = formatSlackContent(content);

    const isDMChannel = !channel || channel === user || channel.startsWith("D");

    if (isDMChannel) {
      await sendToDMChannel(client, user, blocks, thread_ts);
    } else if (channel?.startsWith("C")) {
      if (
        !(await sendToRegularChannel(
          client,
          channel,
          blocks,
          thread_ts,
          user,
          type
        ))
      ) {
        await sendToDMChannel(client, user, blocks, thread_ts);
      }
    } else {
      await sendToDMChannel(client, user, blocks, thread_ts);
    }
  } catch (error) {
    console.error("Error in handleTextModal:", error);
    await client.chat.postMessage({
      channel: body.user.id,
      text: `Sorry, I encountered an error: ${
        error.message || "Unknown error"
      }`,
    });
  }
}

// Handle rewrite shortcut
async function handleRewriteShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    console.log(
      "🔄 Received rewrite shortcut:",
      JSON.stringify(shortcut, null, 2)
    );

    // Get the message content from the shortcut payload
    let initialValue = "";
    if (shortcut.message?.text) {
      initialValue = shortcut.message.text;
    }

    // Enhanced channel detection - prioritize direct channel ID access
    let channelId = "";
    let contextSource = "unknown";

    // First check direct channel access (as shown in the example)
    if (shortcut.channel?.id) {
      channelId = shortcut.channel.id;
      contextSource = "channel.id";
    }
    // If no direct channel, check other sources as fallbacks
    else if (shortcut.conversation_id) {
      channelId = shortcut.conversation_id;
      contextSource = "conversation_id";
    } else if (shortcut.message?.channel_id) {
      channelId = shortcut.message.channel_id;
      contextSource = "message.channel_id";
    }

    // Log channel source for debugging
    console.log(
      `📋 Channel context: ID: ${channelId}, Source: ${contextSource}`
    );

    // Save channel and thread information for later use
    const metadata = JSON.stringify({
      channel: channelId,
      thread_ts: shortcut.message?.ts || null,
      user: shortcut.user?.id || "",
    });

    console.log("📝 Rewrite text metadata:", metadata);

    try {
      await client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: "modal",
          callback_id: "rewrite_modal",
          private_metadata: metadata,
          title: {
            type: "plain_text",
            text: "Rewrite Text",
          },
          submit: {
            type: "plain_text",
            text: "Rewrite",
          },
          blocks: [
            {
              type: "input",
              block_id: "text_block",
              element: {
                type: "plain_text_input",
                action_id: "text",
                multiline: true,
                initial_value: initialValue,
                placeholder: {
                  type: "plain_text",
                  text: "Enter your text here",
                },
              },
              label: {
                type: "plain_text",
                text: "Text",
              },
            },
            {
              type: "input",
              block_id: "style_block",
              element: {
                type: "static_select",
                action_id: "style",
                placeholder: {
                  type: "plain_text",
                  text: "Select rewriting style",
                },
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Professional",
                    },
                    value: "professional",
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Casual",
                    },
                    value: "casual",
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Technical",
                    },
                    value: "technical",
                  },
                ],
              },
              label: {
                type: "plain_text",
                text: "Style",
              },
            },
          ],
        },
      });
    } catch (viewError) {
      console.error("Error opening rewrite modal:", viewError);

      // Try to send a DM to the user if modal fails
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, I encountered an error while opening the rewrite modal. Please try again.",
        });
      } catch (dmError) {
        console.error("Error sending DM:", dmError);
      }
    }
  } catch (error) {
    console.error("Error in rewrite shortcut handler:", error);
  }
}

// Handle ask command
async function handleAskCommand({ command, ack, respond }) {
  try {
    await ack();
    const response = await openai.chat.completions.create({
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
        { role: "user", content: command.text },
      ],
    });

    const content = response.choices[0].message.content;
    const blocks = formatSlackContent(content);

    await respond({
      blocks: blocks,
    });
  } catch (error) {
    console.error("Error:", error);
    await respond(
      "Sorry, I encountered an error while processing your request."
    );
  }
}

// Handle ask GPT modal submission
async function handleAskModal({ ack, body, view, client }) {
  try {
    await ack();
    const question = view.state.values.question_block.question.value;
    const user = body.user.id;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant in a Slack workspace. Be concise but informative. Use appropriate formatting like code blocks with language tags, bullet points, numbered lists, and emphasis to improve readability. Use ```language\n code here ``` syntax for code blocks, specifying the language for proper syntax highlighting.",
        },
        { role: "user", content: question },
      ],
    });

    const content = response.choices[0].message.content;
    const blocks = formatSlackContent(content);

    await client.chat.postMessage({
      channel: user,
      blocks: blocks,
    });
  } catch (error) {
    console.error("Error:", error);
    await client.chat.postMessage({
      channel: user,
      text: "Sorry, I encountered an error while processing your request.",
    });
  }
}

// Handle ask Sai shortcut
async function handleAskShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: "modal",
        callback_id: "ask_modal",
        title: {
          type: "plain_text",
          text: "Ask Sai",
        },
        submit: {
          type: "plain_text",
          text: "Ask",
        },
        blocks: [
          {
            type: "input",
            block_id: "question_block",
            element: {
              type: "plain_text_input",
              action_id: "question",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "What would you like to ask?",
              },
            },
            label: {
              type: "plain_text",
              text: "Question",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

module.exports = {
  handleImproveCommand,
  handleWritingAssistantShortcut,
  handleSummarizeShortcut,
  handleTextModal,
  handleRewriteShortcut,
  handleAskCommand,
  handleAskModal,
  handleAskShortcut,
};
