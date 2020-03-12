const { db } = require("../../db");
const context = require("../../context");
const { getListingId, sendText } = require("./helpers");
const {
  promptUserCategorization,
  showInterests,
  showListings
} = require("./users/user");
const {
  addUserToQueue,
  notifyBuyerStatus,
  promptInterestedBuyer,
  removeUserFromQueue
} = require("./users/buyer");
const {
  addListing,
  createListing,
  removeListing,
  displayQueue,
  promptSellerListing,
  promptSetupQueue,
  promptStart,
  setQueue
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
  const { title } = message.attachments[0].payload;
  const listingId = getListingId(message);
  listings.child(listingId).once("value", snapshot => {
    context.setContext(recipient.id, "", { listingId, title });
    const listing = snapshot.val();
    if (listing) {
      const { seller, has_queue, queue } = listing;
      if (seller !== recipient.id) {
        if (has_queue) {
          const q = queue || [];
          if (!q.includes(recipient.id)) {
            return promptInterestedBuyer(client, recipient, q);
          }
          return notifyBuyerStatus(client, recipient, q);
        }
        return sendText(client, recipient, t.buyer.no_queue);
      } else {
        if (has_queue) {
          return promptSellerListing(client, recipient, listing);
        }
        return promptSetupQueue(client, recipient, listingId);
      }
    }
    context.setContext(recipient.id, "categorize", { listingId, title });
    return promptUserCategorization(client, recipient, listingId);
  });
}

function handleQuickReply(client, recipient, message) {
  const { payload } = message.quick_reply;
  const { data } = context.getContext(recipient.id);
  const { listingId } = data;

  const listingRef = db.ref(`listings/${listingId}`);

  listingRef.once("value", async snapshot => {
    const listing = snapshot.val();

    switch (payload) {
      case "buyer":
        return sendText(client, recipient, t.buyer.no_queue);
      case "seller":
        addListing(recipient.id, listingId);
        createListing(listingId, {
          seller: recipient.id,
          has_queue: false,
          queue: [],
          faq: [],
          price: 0,
          title: data.title
        });
        return promptSetupQueue(client, recipient, listingId);
      case "setup-queue":
        setQueue(listingId, true);
        return promptStart(client, recipient, t.queue.did_add);
      case "add-queue":
        return addUserToQueue(client, recipient, listingId);
      case "display-queue":
        return displayQueue(client, recipient, listing.queue);
      case "skip-queue":
        // TODO
        return sendText(client, recipient, "Not implemented.");
      case "leave-queue":
        return removeUserFromQueue(client, recipient, listingId);
      case "remove-listing":
        removeListing(recipient.id, listingId);
        return promptStart(client, recipient, t.seller.remove_listing);
      case "show-listings":
        return showListings(client, recipient);
      case "show-interests":
        return showInterests(client, recipient);
      case "show-faq":
        const { queue = [], faq = [] } = listing;
        sendText(client, recipient, formatFAQ(faq));
        return promptInterestedBuyer(client, recipient, queue);
      case "quit":
        // TODO
        sendText(client, recipient, "Not implemented.");
        break;
      default:
        // TODO
        sendText(client, recipient, "Not implemented.");
        break;
    }
  });
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
