const { db } = require("../../db");
const context = require("../../context");
const { getListingId, getQueueMessage, sendText } = require("./helpers");
const { promptStart, promptUserCategorization } = require("./users/user");
const {
  addUserToQueue,
  notifyBuyerStatus,
  promptInterestedBuyer
} = require("./users/buyer");
const {
  addListing,
  createListing,
  promptInterestedBuyer,
  promptSetupQueue,
  promptSellerListing
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
          const q = queue || [];
          if (!q.includes(recipient.id)) {
            context.setContext(recipient.id, "buyer-add-queue", { listingId });
            return promptInterestedBuyer(client, recipient, q);
          }
          context.setContext(recipient.id, "buyer-status", { listingId });
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
  switch (payload) {
    case "add-queue":
      const ctx = context.getContext(recipient.id);
      if (ctx) {
        return addUserToQueue(client, recipient, ctx.data.listingId);
      }
      break;
    case "skip-queue":
      // TODO
      sendText(client, recipient, "Not implemented.");
      break;
    case "leave-queue":
      // TODO
      sendText(client, recipient, "Not implemented.");
      break;
    case "show-faq":
      // TODO
      sendText(client, recipient, "Not implemented.");
      break;
    case "quit":
      // TODO
      sendText(client, recipient, "Not implemented.");
      break;
    default:
      const { listingId, sellerId, setupQueue, type } = JSON.parse(payload);

      if (type !== undefined) {
        if (type === "buyer") {
          sendText(client, recipient, t.buyer.no_queue);
        } else if (type === "seller") {
          addListing(recipient.id, listingId);
          promptSetupQueue(client, recipient, listingId);
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
      } else if (buyerId !== undefined) {
        switch (option) {
          case 1:
            const listings = db.ref("listings");
            listings.child(listingId).once(snapshot => {
              if (snapshot.val()) {
                const { queue } = snapshot.val();
                if (!queue.includes(buyerId)) {
                  listings.child(listingId).set({
                    ...snapshot.val(),
                    queue: [...queue, buyerId]
                  });
                  sendText(
                    client,
                    recipient,
                    "You've been added to the queue!"
                  );
                } else {
                  sendText(client, recipient, getQueueMessage(buyerId, queue));
                }
              }
            });
            promptInterestedBuyer(client, recipient, listingId, queue);
            break;
          case 2:
            db.ref("listings")
              .child(listingId)
              .once(snapshot => {
                if (snapshot.val()) {
                  const { faq } = snapshot.val();

                  let formattedMessage = "";
                  if (faq.length === 0) {
                    formattedMessage +=
                      "Seller has not set up a FAQ yet. Please contact the seller directly.";
                  } else {
                    for (const { question, answer } in faq) {
                      formattedMessage += `Question: ${question}\n`;
                      formattedmessage += `Answer: ${answer}\n`;
                    }
                  }
                  sendText(client, recipient, formattedMessage);
                }
              });
            promptInterestedBuyer(client, recipient, listingId, queue);
            break;
          case 3:
            const text = "To start another workflow, just say hello!";
            sendText(client, recipient, text);
            break;
          default:
            const text = "Sorry, we don't support that action.";
            sendText(client, recipient, text);
            break;
        }
      }
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
