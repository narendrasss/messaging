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
  displayQueue,
  promptSellerListing,
  promptSetupQueue,
  promptStart
} = require("./users/seller");
const { makeRoom, sendMessage } = require("./rooms");
const t = require("../../copy.json");

async function handleText(client, recipient, message) {
  const ctx = context.getContext(recipient.id);
  if (ctx && ctx.state === "chatting") {
    const { to } = ctx.data;
    return sendMessage(recipient.id, to, message.text);
  }
  if (message.text === "message seller") {
    const { data } = context.getContext(recipient.id);
    const { listingId } = data;
    const snapshot = await db.ref(`listings/${listingId}`).once("value");
    const { seller } = snapshot.val();

    await makeRoom(listingId, [seller, recipient.id]);
    const { first_name } = await client.getUserProfile(seller, ["first_name"]);
    return sendText(
      client,
      recipient,
      `You are now connected with ${first_name}!`
    ).then(() => {
      context.setContext(recipient.id, "chatting", { to: seller });
      context.setContext(seller, "chatting", { to: recipient.id });
    });
  }
  return client.sendText(recipient, message.text);
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

  listingRef.once("value", snapshot => {
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
          title: data.title
        });
        return promptStart(client, recipient, t.queue.did_add);
      case "add-queue":
        return addUserToQueue(client, recipient, listingId);
      case "display-queue": {
        const { queue } = snapshot.val();
        return displayQueue(client, recipient, queue);
      }
      case "skip-queue": {
        const { queue } = snapshot.val();
        return promptInterestedBuyer(client, recipient, queue);
      }
      case "leave-queue":
        return removeUserFromQueue(client, recipient, listingId);
      case "remove-listing":
        // TODO
        sendText(client, recipient, "Not implemented.");
        break;
      case "show-listings":
        return showListings(client, recipient);
      case "show-interests":
        return showInterests(client, recipient);
      case "show-faq": {
        const { queue, faq } = snapshot.val();
        sendText(client, recipient, formatFAQ(faq || []));
        return promptInterestedBuyer(client, recipient, queue || []);
      }
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
