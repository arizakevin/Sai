const { OpenAI } = require("openai");
const fetch = require("node-fetch");
const sharp = require("sharp");
const pdf = require("pdf-parse");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to download files from Slack
async function downloadFile(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  });
  return Buffer.from(await response.arrayBuffer());
}

// Handle analyze command
async function handleAnalyzeCommand({ command, ack, respond, client }) {
  try {
    await ack();

    // Check if command was invoked from a thread
    if (command.thread_ts) {
      await respond({
        response_type: "ephemeral",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "The `/analyze` command cannot be used in threads. Instead, you can:\n1️⃣ Upload the file in the main channel and mention me (@SAI)\n2️⃣ Send me the file in a direct message",
            },
          },
        ],
      });
      return;
    }

    // Open modal for file upload
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "analyze_file_modal",
        title: {
          type: "plain_text",
          text: "Analyze File",
        },
        submit: {
          type: "plain_text",
          text: "Analyze",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Upload a file to analyze. Supported formats:\n• Images (PNG, JPG, JPEG)\n• PDF documents",
            },
          },
          {
            type: "input",
            block_id: "file_block",
            element: {
              type: "file_input",
              action_id: "file_input",
              filetypes: ["pdf", "png", "jpg", "jpeg"],
            },
            label: {
              type: "plain_text",
              text: "Upload a file",
            },
          },
          {
            type: "input",
            block_id: "prompt_block",
            optional: true,
            element: {
              type: "plain_text_input",
              action_id: "prompt",
              placeholder: {
                type: "plain_text",
                text: "What would you like to know about this file?",
              },
            },
            label: {
              type: "plain_text",
              text: "Analysis Prompt (optional)",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error with analyze command:", error);
    await respond({
      response_type: "ephemeral",
      text: "Sorry, I encountered an error while processing your request.",
    });
  }
}

// Handle analyze file modal submission
async function handleAnalyzeFileModal({ ack, body, view, client }) {
  try {
    await ack();
    const user = body.user.id;
    const fileId = view.state.values.file_block.file_input.files[0];
    const prompt =
      view.state.values.prompt_block.prompt.value || "Please analyze this file";

    // Get file info with proper authorization
    const fileInfo = await client.files.info({
      file: fileId,
      token: process.env.SLACK_BOT_TOKEN, // Explicitly use bot token
    });

    if (!fileInfo.ok) {
      throw new Error(`Failed to get file info: ${fileInfo.error}`);
    }

    const file = fileInfo.file;

    // Process the file
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      try {
        const fileBuffer = await downloadFile(file.url_private);
        let response;

        if (file.mimetype.startsWith("image/")) {
          // Process image with sharp
          const processedImage = await sharp(fileBuffer)
            .resize(1024, 1024, { fit: "inside" })
            .toBuffer();

          // Analyze image with GPT-4 Vision
          const visionResponse = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${
                        file.mimetype
                      };base64,${processedImage.toString("base64")}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 500,
          });
          response = visionResponse.choices[0].message.content;
        } else {
          // Process PDF
          const pdfData = await pdf(fileBuffer);
          const pdfResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `${prompt}\n\nDocument content: ${pdfData.text}`,
              },
            ],
          });
          response = pdfResponse.choices[0].message.content;
        }

        // Send response back to user
        await client.chat.postMessage({
          channel: user,
          text: response,
        });
      } catch (downloadError) {
        console.error("Error downloading or processing file:", downloadError);
        await client.chat.postMessage({
          channel: user,
          text: "Sorry, I encountered an error while accessing the file. Please make sure I have permission to access it and try again.",
        });
      }
    } else {
      await client.chat.postMessage({
        channel: user,
        text: "Sorry, I can only analyze PDF documents and images (PNG, JPG, JPEG).",
      });
    }
  } catch (error) {
    console.error("Error handling file analysis:", error);
    try {
      await client.chat.postMessage({
        channel: body.user.id,
        text: "Sorry, I encountered an error while analyzing the file. Please make sure I have permission to access it and try again.",
      });
    } catch (msgError) {
      console.error("Error sending error message:", msgError);
    }
  }
}

module.exports = {
  handleAnalyzeCommand,
  handleAnalyzeFileModal,
  downloadFile,
};
