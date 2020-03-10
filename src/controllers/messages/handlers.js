const { db } = require("../../db");
const context = require("../../context");
const { getListingId } = require("./helpers");
const { promptStart, promptUserCategorization } = require("./users/user");
const { addUserToQueue, promptInterestedBuyer } = require("./users/buyer");
const {
  addListing,
  createListing,
  promptSetupQueue
} = require("./users/seller");
const t = require("../../copy.json");

function handleText(client, recipient, message) {
  client.sendText(recipient, message.text);
}

function handleDebug(client, recipient, message) {
  client.sendTemplate(recipient, {
    template_type: "button",
    text: "DEBUG",
    buttons: [
      {
        type: "postback",
        title: "Get started",
        payload: "get-started"
      }
    ]
  });
}

function handleAttachments(client, recipient, message) {
  const { url } = message.attachments[0].payload;
  const template = {
    template_type: "generic",
    elements: [
      {
        title: "Is this the right picture?",
        subtitle: "Tap a button to answer.",
        image_url: url,
        buttons: [
          {
            type: "postback",
            title: "Yes!",
            payload: "yes"
          },
          {
            type: "postback",
            title: "No!",
            payload: "no"
          }
        ]
      }
    ]
  };
  client.sendTemplate(recipient, template);
}

function handleListing(client, recipient, message) {
  const listings = db.ref("listings");
  const listingId = getListingId(message);
  listings.child(listingId).once("value", snapshot => {
    const listing = snapshot.val();
    if (listing) {
      const { seller, has_queue, queue } = listing;
      if (seller !== recipient.id) {
        if (has_queue) {
          context.setContext(recipient.id, "buyer-add-queue", { listingId });
          promptInterestedBuyer(client, recipient, queue);
        } else {
        }
      }
    } else {
      promptUserCategorization(client, recipient, listingId);
    }
  });
}

function handleQuickReply(client, recipient, message) {
  const { payload } = message.quick_reply;

  if (payload === "add-queue") {
    const ctx = context.getContext(recipient.id);
    if (ctx) {
      return addUserToQueue(client, recipient, ctx.data.listingId);
    }
  }

  const { listingId, sellerId, setupQueue, type } = JSON.parse(payload);

  if (type !== undefined) {
    if (type === "buyer") {
      client.sendText(recipient, t.buyer.no_queue);
    } else if (type === "seller") {
      addListing(recipient.id, listingId);
      promptSetupQueue(client, recipient, recipient.id, listingId);
    } else {
      // TODO: implement default case
    }
  } else if (setupQueue !== undefined) {
    const listing = {
      seller: sellerId,
      has_queue: setupQueue,
      queue: [],
      faq: [],
      price: 0
    };
    createListing(listingId, listing);

    listing.has_queue
      ? promptStart(client, recipient, t.queue.did_add)
      : client
          .sendText(recipient, t.queue.did_not_add)
          .catch(err => console.error(err));
  }
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
