// Global middleware for logging
async function loggingMiddleware({ context, next }) {
  // Log the entire raw payload
  console.log(
    "🔍 Raw Incoming Payload:",
    JSON.stringify(
      {
        body: context.body,
        payload: context.payload,
        event: context.event,
        type: context.type,
        subtype: context.subtype,
        command: context.command,
        action: context.action,
        shortcut: context.shortcut,
        view: context.view,
      },
      null,
      2
    )
  );

  const startTime = new Date();

  // Get the actual event type and payload
  const eventType = context.event?.type || context.type;
  const event = context.event || context.payload;

  console.log("Raw event:", event);
  console.log("🔍 Incoming Event:", {
    type: eventType,
    subtype: event?.subtype,
    channel: event?.channel,
    user: event?.user,
    text: event?.text,
    time: startTime.toISOString(),
  });

  try {
    await next();
    const endTime = new Date();
    console.log(`✨ Event processed in ${endTime - startTime}ms`);
  } catch (error) {
    console.error("❌ Error in middleware:", error);
    throw error;
  }
}

// Add logging middleware for slash commands
async function commandLoggingMiddleware({ command, next }) {
  console.log("⚡ Slash command received:", JSON.stringify(command, null, 2));
  await next();
}

// Add logging middleware for interactive actions
async function actionLoggingMiddleware({ action, next }) {
  console.log(
    "🔄 Interactive action received:",
    JSON.stringify(action, null, 2)
  );
  await next();
}

// Add catch-all message listener
async function messageLoggingMiddleware({ message, next }) {
  console.log(
    "📨 Catch-all message received:",
    JSON.stringify(message, null, 2)
  );
  await next();
}

// Add catch-all event listener for events that aren't explicitly handled
async function eventLoggingMiddleware({ event, context, next }) {
  try {
    console.log("📣 Unhandled event received:", {
      type: event.type,
      subtype: event.subtype,
      channel: event.channel || "unknown",
      user: event.user || "unknown",
      timestamp: event.ts || "unknown",
      thread_ts: event.thread_ts || "unknown",
      event_time: new Date().toISOString(),
      details: JSON.stringify(event, null, 2),
    });

    // Log any context metadata that might be helpful
    if (context && Object.keys(context).length > 0) {
      console.log(
        "🔍 Event context:",
        JSON.stringify(
          {
            type: context.type,
            subtype: context.subtype,
            botId: context.botId,
            botUserId: context.botUserId,
          },
          null,
          2
        )
      );
    }

    await next();
  } catch (error) {
    console.error("❌ Error in catch-all event handler:", error);
    console.error(
      "Event that caused the error:",
      JSON.stringify(event, null, 2)
    );
    // Continue to next middleware despite the error
    await next();
  }
}

// Add logging middleware for views
async function viewLoggingMiddleware({ view, next }) {
  console.log("👁️ View submission received:", JSON.stringify(view, null, 2));
  await next();
}

module.exports = {
  loggingMiddleware,
  commandLoggingMiddleware,
  actionLoggingMiddleware,
  messageLoggingMiddleware,
  eventLoggingMiddleware,
  viewLoggingMiddleware,
};
