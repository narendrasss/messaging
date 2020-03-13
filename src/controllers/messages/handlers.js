const { db } = require("../../db");
const { getContext, setContext, state } = require("../../context");
const { getUserProfile, send } = require("../../client");
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
const listings = require("../../db/listings");
const t = require("../../copy.json");

async function handleText(recipient, message) {
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
        const { first_name } = await getUserProfile(recipient, ["first_name"]);
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

    const { first_name } = await getUserProfile(seller, ["first_name"]);
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

function handleListing(recipient, message) {
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
            return promptInterestedBuyer(recipient, q);
          }
          return notifyBuyerStatus(recipient, q);
        }
        return send.text(recipient, t.buyer.no_queue);
      } else {
        if (has_queue) {
          return promptSellerListing(recipient, listing);
        }
        return promptSetupQueue(recipient);
      }
    }
    setContext(recipient.id, state.CATEGORIZE, { listingId, title });
    return promptUserCategorization(recipient, listingId);
  });
}

function handleQuickReply(recipient, message) {
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
        return promptSetupQueue(recipient);
      case "setup-faq":
        return setupFAQ(recipient, listingId);
      case "skip-faq":
        return promptStart(recipient, t.faq.no_faq + t.general.next);
      case "setup-queue":
        setQueue(listingId, true);
        await send.text(recipient, "A queue has been sucessfuly set up.");
        return promptSetupFAQ(recipient);
      case "add-queue":
        return addUserToQueue(recipient, listingId);
      case "display-queue":
        return displayQueue(recipient, listing.queue);
      case "skip-queue":
        return promptSetupFAQ(recipient);
      case "leave-queue":
        return removeUserFromQueue(recipient, listingId, title);
      case "remove-listing":
        listings.removeListing(recipient.id, listingId);
        return promptStart(recipient, t.seller.remove_listing);
      case "show-listings":
        return showListings(recipient);
      case "show-interests":
        return showInterests(recipient);
      case "show-faq":
        const { queue = [], faq = [] } = listing;
        await send.text(recipient, formatFAQ(faq));
        return promptInterestedBuyer(recipient, queue);
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
  handleText,
  handleListing,
  handleQuickReply
};
