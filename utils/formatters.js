/**
 * Utility functions for formatting text for Slack
 */

/**
 * Format content for Slack, handling code blocks, diagrams, and formatting
 * @param {string} content - The content to format
 * @returns {Array} - Array of Slack blocks
 */
function formatSlackContent(content) {
  // Extract code blocks and other content
  const parts = extractContentParts(content);
  const blocks = [];

  for (const part of parts) {
    if (part.type === "code") {
      // Handle code blocks with proper language formatting
      // Add a divider before code blocks for better visual separation
      if (blocks.length > 0) {
        blocks.push({ type: "divider" });
      }

      // Add a context block with the language name if available
      if (part.language) {
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*Language: ${part.language}*`,
            },
          ],
        });
      }

      // Add the code block itself
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`${part.language || ""}\n${part.content}\n\`\`\``,
        },
      });
    } else if (part.type === "mermaid") {
      // Handle mermaid diagrams with clear separation
      if (blocks.length > 0) {
        blocks.push({ type: "divider" });
      }

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "*Mermaid Diagram*",
          },
        ],
      });

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`mermaid\n${part.content}\n\`\`\``,
        },
      });
    } else {
      // Handle regular text with enhanced markdown processing
      const formattedText = formatMarkdown(part.content);
      const textChunks = splitTextToChunks(formattedText, 2900); // Slightly smaller limit to account for formatting

      for (const chunk of textChunks) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: chunk,
          },
        });
      }
    }
  }

  return blocks;
}

/**
 * Format markdown text for better rendering in Slack
 * @param {string} text - The markdown text to format
 * @returns {string} - Formatted text for Slack
 */
function formatMarkdown(text) {
  // First pass: handle headings for better visibility
  let formatted = text
    // Format headings properly
    .replace(/^### (.*?)$/gm, "*$1*") // h3 -> bold
    .replace(/^## (.*?)$/gm, "*$1*") // h2 -> bold
    .replace(/^# (.*?)$/gm, "*$1*\n") // h1 -> bold with extra newline

    // Ensure proper spacing for lists
    .replace(/^(\d+)\. (.*?)$/gm, "$1. $2") // Numbered lists
    .replace(/^- (.*?)$/gm, "• $1") // Bullet lists with proper bullets

    // Ensure emphasis is formatted correctly
    .replace(/\*\*(.*?)\*\*/g, "*$1*") // Convert ** to * for bold
    .replace(/__(.*?)__/g, "_$1_"); // Convert __ to _ for italic

  // Second pass: ensure paragraph spacing
  formatted = formatted
    .replace(/\n\n+/g, "\n\n") // Normalize multiple newlines to exactly two
    .trim();

  return formatted;
}

/**
 * Extract different content parts from text (code blocks, mermaid diagrams, regular text)
 * @param {string} text - The text to parse
 * @returns {Array} - Array of content parts with type and content
 */
function extractContentParts(text) {
  const parts = [];
  let currentIndex = 0;

  // Regular expression to match code blocks with optional language
  const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > currentIndex) {
      parts.push({
        type: "text",
        content: text.substring(currentIndex, match.index),
      });
    }

    // Check if this is a mermaid diagram
    const language = match[1].trim().toLowerCase();
    if (language === "mermaid") {
      parts.push({
        type: "mermaid",
        content: match[2],
      });
    } else {
      parts.push({
        type: "code",
        language: language,
        content: match[2],
      });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (currentIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(currentIndex),
    });
  }

  return parts;
}

/**
 * Split text into chunks to avoid Slack's size limits
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum length of each chunk
 * @returns {Array} - Array of text chunks
 */
function splitTextToChunks(text, maxLength = 3000) {
  const chunks = [];

  if (text.length <= maxLength) {
    return [text];
  }

  // Try to split at paragraph breaks
  const paragraphs = text.split("\n\n");
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxLength) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If a single paragraph is too long, split it further
      if (paragraph.length > maxLength) {
        const sentences = paragraph.split(". ");
        currentChunk = "";

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 2 <= maxLength) {
            currentChunk += (currentChunk ? ". " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk + ".");
            }
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Add a context block to improve separation between sections
 * @param {string} title - The context title
 * @returns {Object} - A Slack context block
 */
function createContextBlock(title) {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*${title}*`,
      },
    ],
  };
}

module.exports = {
  formatSlackContent,
};
