const { db } = require("../../db");
const { getListingId, stringTemplateParser } = require("./helpers");
const { promptStart, promptUserCategorization } = require("./users/user");
const {
  addListing,
  createListing,
  promptInterestedBuyer,
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
        if (has_queue) {
          promptInterestedBuyer(client, recipient, listingId, queue);
        } else {
          // TODO: prompt user to message seller
        }
      } else {
        // TODO: user is seller
      }
    } else {
      promptUserCategorization(client, recipient, listingId);
    }
  });
}

function handleQuickReply(client, recipient, message) {
  const payload = JSON.parse(message.quick_reply.payload);
  const { buyerId, setupQueue, type } = payload;
  const { listingId, sellerId, option } = payload;

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
              sendText(client, recipient, "You've been added to the queue!");
            } else {
              const position = queue.indexOf(buyerId) + 1;
              const text = stringTemplateParser(
                "You're already in the queue! You are number {{position}} in line.",
                { position }
              );
              sendText(client, recipient, text);
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
}

module.exports = {
  handleAttachments,
  handleDebug,
  handleText,
  handleListing,
  handleQuickReply
};
