const { db } = require("../../db");
const { getListingId } = require("./helpers");
const { promptStart, promptUserCategorization } = require("./users/user");
const {
  addListing,
  createListing,
  promptSetupQueue
} = require("./users/seller");

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
      const { seller } = snapshot.val();
      if (seller !== recipient.id) {
        client.sendText(recipient, "You're a buyer!");
      }
    } else {
      promptUserCategorization(client, recipient, listingId);
    }
  });
}

function handleQuickReply(client, recipient, message) {
  const {
    listingId,
    sellerId,
    setupQueue,
    type
  } = message.attachments[0].payload;

  if (type) {
    if (type === "buyer") {
      client.sendText(
        recipient,
        "The seller has not yet set up a queue for this item. Please contact the seller directly."
      );
    } else if (type === "seller") {
      addListing(recipient.id, listingId);
      promptSetupQueue(client, recipient, recipient.id, listingId);
    } else {
      // TODO: implement default case
    }
  } else if (setupQueue) {
    const listing = {
      seller: sellerId,
      has_queue: setupQueue === "YES",
      queue: [],
      faq: [],
      price: 0
    };
    createListing(listingId, listing);

    if (listing.has_queue) {
      promptStart("A queue has been set up! What would you like to do next?");
    } else {
      client.sendText(
        recipient,
        "You can set up a queue any time in the future by sharing the post again."
      );
    }
  }
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
