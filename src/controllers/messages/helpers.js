const messageTypes = {
  DEBUG: "debug",
  TEXT: "text",
  MULTIPLE: "multiple",
  LISTING: "listing",
  ATTACHMENT: "attachment",
  UNSUPPORTED: "unsupported"
};

function getMessageType(message) {
  if (message.text) {
    if (message.text.toLowerCase() === "debug") {
      return messageTypes.DEBUG;
    }
    return messageTypes.TEXT;
  }
  if (message.attachments) {
    if (message.attachments.length > 1) {
      return messageTypes.MULTIPLE;
    }
    const payload = message.attachments[0].payload;
    if (payload.url.includes("marketplace/item")) {
      return messageTypes.LISTING;
    }
    return messageTypes.ATTACHMENT;
  }
  return messageTypes.UNSUPPORTED;
}

module.exports = { getMessageType, messageTypes };
