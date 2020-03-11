const { db } = require("../../db");
const context = require("../../context");
const { getListingId, getQueueMessage, sendText } = require("./helpers");
const {
  promptStart,
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
  displayQueue,
  promptSellerListing,
  promptSetupQueue,
  promptStart
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
    const listing = snapshot.val();
    if (listing) {
      const { seller, has_queue, queue } = listing;
      if (seller !== recipient.id) {
        if (has_queue) {
          const q = queue || [];
          if (!q.includes(recipient.id)) {
            context.setContext(recipient.id, "buyer-add-queue", {
              title,
              listingId
            });
            return promptInterestedBuyer(client, recipient, q);
          }
          context.setContext(recipient.id, "buyer-status", {
            title,
            listingId
          });
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
    return promptUserCategorization(client, recipient, listingId);
  });
}

function handleQuickReply(client, recipient, message) {
  const { payload } = message.quick_reply;
  const { data } = context.getContext(recipient.id);
  const { listingId } = data;
  const { queue, faq } = db.ref(`listings/${listingId}`);
  switch (payload) {
    case "buyer":
      return sendText(client, recipient, t.buyer.no_queue);
    case "seller":
      addListing(recipient.id, listingId);
      return promptSetupQueue(client, recipient, listingId);
    case "setup-queue":
      createListing(listingId, {
        seller: recipient.id,
        has_queue: true,
        queue: [],
        faq: [],
        price: 0,
        title: title
      });
      return promptStart(client, recipient, t.queue.did_add);
    case "add-queue":
      if (!queue.includes(recipient.id)) {
        addUserToQueue(client, recipient, listingId);
      } else {
        const message = getQueueMessage(recipient.id, queue);
        sendText(client, recipient, message);
      }
      return promptInterestedBuyer(client, recipient, queue);
    case "display-queue":
      return displayQueue(client, recipient, queue);
    case "skip-queue":
      return promptInterestedBuyer(client, recipient, queue);
    case "leave-queue":
      return removeUserFromQueue(client, recipient, listingId);
    case "remove-listing":
      // TODO
      sendText(client, recipient, "Not implemented.");
      break;
    case "show-listings":
      return showListings(recipient);
    case "show-interests":
      return showInterests(recipient);
    case "show-faq":
      const formattedMessage = faq.length > 0 ? formatFAQ(faq) : t.buyer.no_faq;
      sendText(client, recipient, formattedMessage);
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
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
