const { OpenAI } = require("openai");
const { formatSlackContent } = require("../utils/formatters");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle explain code command
async function handleExplainCommand({ command, ack, respond }) {
  try {
    await ack();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful coding assistant. Explain code clearly and technically. Format your responses for Slack with these guidelines:\n" +
            "1. Use ```language\ncode``` for code blocks with proper language name (python, javascript, etc.)\n" +
            "2. Use *bold* for important concepts and _italic_ for emphasis\n" +
            "3. Use numbered lists (1. Item) for steps and bullet points (• Item) for features\n" +
            "4. Use clear section headers formatted in *bold*\n" +
            "5. Always specify the language when showing code blocks",
        },
        {
          role: "user",
          content: `Please explain this code:\n${command.text}`,
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

// Handle explain code shortcut
async function handleExplainCodeShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    console.log(
      "📝 Explain code shortcut triggered:",
      JSON.stringify(
        {
          user: shortcut.user?.id,
          channel: shortcut.channel?.id,
          message_ts: shortcut.message?.ts,
          conversation_id: shortcut.conversation_id,
        },
        null,
        2
      )
    );

    // Get the message content from the shortcut payload
    let initialValue = "";

    if (shortcut.message?.text) {
      initialValue = shortcut.message.text;

      // If the message contains code blocks, try to extract them
      const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const matches = [...shortcut.message.text.matchAll(codeBlockRegex)];

      if (matches.length > 0) {
        // Use the first code block found
        initialValue = matches[0][1];
      }
    }

    // Save channel and thread information for later use
    // Use optional chaining and fallbacks for more safety
    const metadata = JSON.stringify({
      channel: shortcut.channel?.id || shortcut.conversation_id || "",
      thread_ts: shortcut.message?.ts || null,
      user: shortcut.user?.id || "",
    });

    console.log("📝 Metadata for explain code modal:", metadata);

    try {
      await client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: "modal",
          callback_id: "explain_code_modal",
          private_metadata: metadata,
          title: {
            type: "plain_text",
            text: "Explain Code",
          },
          submit: {
            type: "plain_text",
            text: "Explain",
          },
          blocks: [
            {
              type: "input",
              block_id: "code_block",
              element: {
                type: "plain_text_input",
                action_id: "code",
                multiline: true,
                initial_value: initialValue,
                placeholder: {
                  type: "plain_text",
                  text: "Paste your code here",
                },
              },
              label: {
                type: "plain_text",
                text: "Code",
              },
            },
          ],
        },
      });
    } catch (modalError) {
      console.error("Error opening explain code modal:", modalError);

      // Try to notify the user if the modal fails to open
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, I encountered an error while opening the code explanation modal. Please try again.",
        });
      } catch (dmError) {
        console.error("Error sending DM to user:", dmError);
      }
    }
  } catch (error) {
    console.error("Error in explain code shortcut handler:", error);

    // Try to notify the user about the error
    if (shortcut?.user?.id) {
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, something went wrong with the explain code feature. Please try again later.",
        });
      } catch (dmError) {
        console.error("Error sending error notification:", dmError);
      }
    }
  }
}

// Handle simplify code shortcut
async function handleSimplifyCodeShortcut({ shortcut, ack, client }) {
  try {
    await ack();
    console.log(
      "📝 Simplify code shortcut triggered:",
      JSON.stringify(
        {
          user: shortcut.user?.id,
          channel: shortcut.channel?.id,
          message_ts: shortcut.message?.ts,
          conversation_id: shortcut.conversation_id,
        },
        null,
        2
      )
    );

    // Get the message content from the shortcut payload
    let initialValue = "";

    if (shortcut.message?.text) {
      initialValue = shortcut.message.text;

      // If the message contains code blocks, try to extract them
      const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const matches = [...shortcut.message.text.matchAll(codeBlockRegex)];

      if (matches.length > 0) {
        // Use the first code block found
        initialValue = matches[0][1];
      }
    }

    // Save channel and thread information for later use
    // Use optional chaining and fallbacks for more safety
    const metadata = JSON.stringify({
      channel: shortcut.channel?.id || shortcut.conversation_id || "",
      thread_ts: shortcut.message?.ts || null,
      user: shortcut.user?.id || "",
    });

    console.log("📝 Metadata for simplify code modal:", metadata);

    try {
      await client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: "modal",
          callback_id: "simplify_code_modal",
          private_metadata: metadata,
          title: {
            type: "plain_text",
            text: "Simplify Code",
          },
          submit: {
            type: "plain_text",
            text: "Simplify",
          },
          blocks: [
            {
              type: "input",
              block_id: "code_block",
              element: {
                type: "plain_text_input",
                action_id: "code",
                multiline: true,
                initial_value: initialValue,
                placeholder: {
                  type: "plain_text",
                  text: "Paste your code here",
                },
              },
              label: {
                type: "plain_text",
                text: "Code",
              },
            },
          ],
        },
      });
    } catch (modalError) {
      console.error("Error opening simplify code modal:", modalError);

      // Try to notify the user if the modal fails to open
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, I encountered an error while opening the code simplification modal. Please try again.",
        });
      } catch (dmError) {
        console.error("Error sending DM to user:", dmError);
      }
    }
  } catch (error) {
    console.error("Error in simplify code shortcut handler:", error);

    // Try to notify the user about the error
    if (shortcut?.user?.id) {
      try {
        await client.chat.postMessage({
          channel: shortcut.user.id,
          text: "Sorry, something went wrong with the simplify code feature. Please try again later.",
        });
      } catch (dmError) {
        console.error("Error sending error notification:", dmError);
      }
    }
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
      text: `I've posted the ${
        type === "explain" ? "code explanation" : "simplified code"
      } in the channel.`,
    });
    return true;
  } catch (error) {
    console.error("Error sending to channel:", error);
    return false;
  }
}

// Handle code modal submissions
async function handleCodeModal({ view, ack, body, client, type }) {
  try {
    await ack();
    const code = view.state.values.code_block.code.value;
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

    const systemPrompt =
      type === "explain"
        ? "You are a coding assistant. Explain the following code clearly and technically. Format your responses for Slack with these guidelines:\n" +
          "1. Use ```language\ncode``` for code blocks with proper language name (python, javascript, etc.)\n" +
          "2. Use *bold* for important concepts and _italic_ for emphasis\n" +
          "3. Use numbered lists (1. Item) for steps and bullet points (• Item) for features\n" +
          "4. Use clear section headers formatted in *bold*\n" +
          "5. Always specify the language when showing code blocks"
        : "You are a coding assistant. Simplify and improve the following code while maintaining its functionality. Explain the improvements. Format your responses for Slack with these guidelines:\n" +
          "1. Use ```language\ncode``` for code blocks with proper language name (python, javascript, etc.)\n" +
          "2. Use *bold* for important concepts and _italic_ for emphasis\n" +
          "3. Use numbered lists (1. Item) for steps and bullet points (• Item) for features\n" +
          "4. Use clear section headers formatted in *bold*\n" +
          "5. Always show your improved code in a code block with the correct language specified";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: code },
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
    console.error("Error in handleCodeModal:", error);
    await client.chat.postMessage({
      channel: body.user.id,
      text: `Sorry, I encountered an error: ${
        error.message || "Unknown error"
      }`,
    });
  }
}

module.exports = {
  handleExplainCommand,
  handleExplainCodeShortcut,
  handleSimplifyCodeShortcut,
  handleCodeModal,
};
