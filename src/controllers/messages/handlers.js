const { db } = require("../../db");
const { getListingId, sendText } = require("./helpers");
const { promptStart, promptUserCategorization } = require("./users/user");
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
    if (snapshot.val()) {
      const { seller, has_queue, queue } = snapshot.val();
      if (seller !== recipient.id) {
        has_queue
          ? promptInterestedBuyer(client, recipient, queue)
          : sendText(client, recipient, t.buyer.no_queue);
      } else {
        // TODO: user is seller
      }
    } else {
      promptUserCategorization(client, recipient, listingId);
    }
  });
}

function handleQuickReply(client, recipient, message) {
  const { listingId, sellerId, setupQueue, type } = JSON.parse(
    message.quick_reply.payload
  );

  if (type !== undefined) {
    if (type === "buyer") {
      sendText(client, recipient, t.buyer.no_queue);
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
      : sendText(client, recipient, t.queue.did_not_add);
  }
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
