const messageTypes = {
  DEBUG: "debug",
  TEXT: "text",
  MULTIPLE: "multiple",
  LISTING: "listing",
  ATTACHMENT: "attachment",
  UNSUPPORTED: "unsupported",
  QUICK_REPLY: "quick-reply"
};

function getMessageType(message) {
  if (message.text) {
    if (message.text.toLowerCase() === "debug") {
      return messageTypes.DEBUG;
    } else if (message.quick_reply) {
      return messageTypes.QUICK_REPLY;
    }
    return messageTypes.TEXT;
  }
  if (message.attachments) {
    if (message.attachments.length > 1) {
      return messageTypes.MULTIPLE;
    }
    const payload = message.attachments[0].payload;
    if (payload) {
      if (payload.url.includes("marketplace/item")) {
        return messageTypes.LISTING;
      }
      return messageTypes.ATTACHMENT;
    }
  }
  return messageTypes.UNSUPPORTED;
}

function getListingId(message) {
  const { url } = message.attachments[0].payload;
  const id = url.split("item/")[1];
  if (id[id.length - 1] === "/") {
    return id.slice(0, id.length - 1);
  }
  return id;
}

// source: https://stackoverflow.com/questions/43261798/javascript-how-to-use-template-literals-with-json/49369868
function stringTemplateParser(expression, valueObj) {
  const templateMatcher = /{{\s?([^{}\s]*)\s?}}/g;
  return expression.replace(templateMatcher, (...[, value]) => valueObj[value]);
}

module.exports = {
  getMessageType,
  getListingId,
  messageTypes,
  stringTemplateParser
};
