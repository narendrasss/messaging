const t = require("../../copy.json");

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

function getQueueMessage(id, queue) {
  const q = queue || [];
  const index = q.indexOf(id);
  const length = q.length;
  if (index < 0) {
    return `There ${length == 1 ? "is" : "are"} currently ${length} ${
      length == 1 ? "person" : "people"
    } waiting for this item.`;
  }
  if (index === 0) {
    return "You're first in line.";
  }
  return `There ${
    index === 1 ? "is 1 person" : `are ${index} people`
  } ahead of you.`;
}

function getUpdatedQueueMessage(id, queue, item) {
  const q = queue || [];
  const index = q.indexOf(id);
  const length = q.length;
  if (index < 0) {
    return `There ${length == 1 ? "is" : "are"} currently ${length} ${
      length == 1 ? "person" : "people"
    } waiting for ${item}`;
  }
  if (index === 0) {
    return `You're first in line for ${item}`;
  }
  return `You are in position ${index} out of ${length} for ${item}`;
}

function getSellerStatusMessage(listing) {
  return (
    t.seller.own_listing +
    " " +
    getQueueMessage(null, listing.queue || []) +
    " What would you like to do next?"
  );
}

function getUpdatedSellerQueueMessage(queue = [], title) {
  const length = queue.length;
  return length === 0
    ? `There's now no one waiting for ${title}.`
    : `There ${length === 1 ? "is" : "are"} now ${queue.length} ${
        length === 1 ? "person" : "people"
      } waiting for ${title}.`;
}

function sendText(client, recipient, text) {
  return client.sendText(recipient, text).catch(err => console.error(err));
}

module.exports = {
  getMessageType,
  getListingId,
  getQueueMessage,
  getUpdatedQueueMessage,
  getSellerStatusMessage,
  getUpdatedSellerQueueMessage,
  messageTypes,
  sendText
};
