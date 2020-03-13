const handlers = require("./handlers");
const { getMessageType, messageTypes } = require("./helpers");

const handlerMap = {
  [messageTypes.TEXT]: handlers.handleText,
  [messageTypes.LISTING]: handlers.handleListing,
  [messageTypes.QUICK_REPLY]: handlers.handleQuickReply
};

function messagesController(client) {
  return function handleMessages(event_type, sender_info, webhook_event) {
    const { message } = webhook_event;
    console.log(message);
    const recipient = { id: sender_info.value };
    const handler = handlerMap[getMessageType(message)];
    if (!handler) {
      return send.text(recipient, "Sorry, we don't support that action.");
    }
    try {
      return handler(recipient, message);
    } catch (err) {
      console.error(err);
      return send.text(recipient, "Oops, something went wrong.");
    }
  };
}

module.exports = messagesController;
