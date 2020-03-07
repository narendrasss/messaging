const handlers = require("./handlers");
const { getMessageType, messageTypes } = require("./helpers");

const handlerMap = {
  [messageTypes.TEXT]: handlers.handleText,
  [messageTypes.DEBUG]: handlers.handleDebug,
  [messageTypes.ATTACHMENT]: handlers.handleAttachments
};

function messagesController(client) {
  return function handleMessages(event_type, sender_info, webhook_event) {
    const { message } = webhook_event;
    const recipient = { id: sender_info.value };
    const handler = handlerMap[getMessageType(message)];
    if (!handler) {
      return client.sendText(recipient, "Sorry, we don't support that action.");
    }
    return handler(client, recipient, message);
  };
}

module.exports = messagesController;
