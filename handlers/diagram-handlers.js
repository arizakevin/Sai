const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate Mermaid diagram
async function generateMermaidDiagram(description) {
  try {
    // Ask GPT to generate Mermaid syntax
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a diagram expert. Generate valid Mermaid.js syntax for the requested diagram. Only output the diagram code, nothing else. Ensure the syntax is correct and properly formatted.",
        },
        {
          role: "user",
          content: description,
        },
      ],
    });

    const mermaidSyntax = response.choices[0].message.content;
    return mermaidSyntax;
  } catch (error) {
    console.error("Error generating diagram:", error);
    throw error;
  }
}

// Handle diagram command
async function handleDiagramCommand({ command, ack, respond }) {
  try {
    await ack();
    const description = command.text;

    if (!description) {
      await respond(
        "Please provide a description for the diagram. Example: `/diagram sequence diagram for user login`"
      );
      return;
    }

    const mermaidSyntax = await generateMermaidDiagram(description);

    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Here's your diagram:",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "```mermaid\n" + mermaidSyntax + "\n```",
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error generating diagram:", error);
    await respond(
      "Sorry, I encountered an error while generating the diagram."
    );
  }
}

module.exports = {
  handleDiagramCommand,
  generateMermaidDiagram,
};
