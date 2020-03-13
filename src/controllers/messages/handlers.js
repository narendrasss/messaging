const { db } = require("../../db");
const { getContext, setContext, state } = require("../../context");
const send = require("../../send");
const { getListingId } = require("./helpers");
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
  displayQueue,
  setupFAQ,
  promptSellerListing,
  promptSetupFAQ,
  promptSetupQueue,
  promptStart,
  setQueue
} = require("./users/seller");
const listings = require("./db/listingss");
const t = require("../../copy.json");

async function handleText(client, recipient, message) {
  const ctx = getContext(recipient.id);
  if (message.text.startsWith("\\")) {
    // Handle commands here
    const command = message.text.substring(1);
    switch (command) {
      case "q":
      case "quit":
        if (!ctx || ctx.state !== "chatting") {
          return send.text(
            recipient,
            "It doesn't look like you're messaging anyone."
          );
        }
        const {
          data: { to, roomId }
        } = ctx;
        await deactivateRoom(roomId);
        removeContext(to);
        removeContext(recipient.id);
        const { first_name } = await client.getUserProfile(recipient.id, [
          "first_name"
        ]);
        await send.text({ id: to }, `${first_name} has left the chat.`);
        return send.text(recipient, "Successfully disconnected.");
      default:
        return;
    }
  }
  if (ctx && ctx.state === "chatting") {
    const { to, roomId } = ctx.data;
    return sendMessage(roomId, recipient.id, to, message.text);
  }
  if (ctx && ctx.state === state.FAQ_SETUP) {
    const { data } = ctx;
    // if the user is currently setting up their FAQ
    const answeredQuestions = getContext(recipient.id).data.questions;
    setContext(recipient.id, state.FAQ_SETUP, {
      ...getContext(recipient.id).data,
      questions: answeredQuestions + 1
    });

    // 1. Price
    const price = parseInt(message.text);
    if (isNaN(price)) {
      return send.text(
        recipient,
        "Oops, I don't understand that. Please type in a number."
      );
    }
    listings.setSellerPrice(data.listingId, price);

    if (answeredQuestions < t.faq.questions.length) {
      // if the user hasn't answered all the questions
      const currentQuestion = t.faq.questions[answeredQuestions];
      return send.text(recipient, currentQuestion);
    } else {
      // if the user has answered all the questions
      setContext(recipient.id, state.FAQ_DONE, {
        ...getContext(recipient.id).data
      });
      return send.text(recipient, "Thanks! A FAQ has been set up.");
    }
  }
  if (message.text === "message seller") {
    const { data } = ctx;
    const { listingId } = data;
    const snapshot = await db.ref(`listings/${listingId}`).once("value");
    const { seller } = snapshot.val();

    let roomId = await getRoom(seller, recipient.id);
    if (!roomId) {
      roomId = await makeRoom(listingId, [seller, recipient.id]);
    } else {
      await activateRoom(roomId);
    }

    const { first_name } = await client.getUserProfile(seller, ["first_name"]);
    return send
      .text(
        recipient,
        `You are now connected with ${first_name}! You can disconnect any time by typing \\q or \\quit.`
      )
      .then(() => {
        setContext(recipient.id, "chatting", { to: seller, roomId });
        setContext(seller, "chatting", { to: recipient.id, roomId });
      });
  }
  return send.text(recipient, message.text);
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
  const listingsRef = db.ref("listings");
  const { title } = message.attachments[0].payload;
  const listingId = getListingId(message);
  listingsRef.child(listingId).once("value", snapshot => {
    setContext(recipient.id, "", { listingId, title });
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
        return send.text(recipient, t.buyer.no_queue);
      } else {
        if (has_queue) {
          return promptSellerListing(client, recipient, listing);
        }
        return promptSetupQueue(client, recipient);
      }
    }
    setContext(recipient.id, state.CATEGORIZE, { listingId, title });
    return promptUserCategorization(client, recipient, listingId);
  });
}

function handleQuickReply(client, recipient, message) {
  const { payload } = message.quick_reply;
  const { data } = getContext(recipient.id);
  const { listingId, title } = data;

  const listingRef = db.ref(`listings/${listingId}`);

  listingRef.once("value", async snapshot => {
    const listing = snapshot.val();

    switch (payload) {
      case "buyer":
        return send.text(recipient, t.buyer.no_queue);
      case "seller":
        listings.addListing(recipient.id, listingId);
        listings.createListing(listingId, {
          seller: recipient.id,
          has_queue: false,
          queue: [],
          faq: [],
          price: 0,
          title
        });
        return promptSetupQueue(client, recipient);
      case "setup-faq":
        return setupFAQ(client, recipient, listingId);
      case "skip-faq":
        return promptStart(client, recipient, t.faq.no_faq + t.general.next);
      case "setup-queue":
        setQueue(listingId, true);
        await send.text(recipient, "A queue has been sucessfuly set up.");
        return promptSetupFAQ(client, recipient);
      case "add-queue":
        return addUserToQueue(client, recipient, listingId);
      case "display-queue":
        return displayQueue(client, recipient, listing.queue);
      case "skip-queue":
        return promptSetupFAQ(client, recipient);
      case "leave-queue":
        return removeUserFromQueue(client, recipient, listingId, title);
      case "remove-listing":
        listings.removeListing(recipient.id, listingId);
        return promptStart(client, recipient, t.seller.remove_listing);
      case "show-listings":
        return showListings(client, recipient);
      case "show-interests":
        return showInterests(client, recipient);
      case "show-faq":
        const { queue = [], faq = [] } = listing;
        await send.text(recipient, formatFAQ(faq));
        return promptInterestedBuyer(client, recipient, queue);
      case "quit":
        // TODO
        send.text(recipient, "Not implemented.");
        break;
      default:
        // TODO
        send.text(recipient, "Not implemented.");
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
