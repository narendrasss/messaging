const { db } = require("../../db");
const {
  getContext,
  setContext,
  removeContext,
  state
} = require("../../state/context");
const { getUserProfile, send } = require("../../client");
const { getListingId } = require("./helpers");
const handlers = require("../../state/handlers");
const user = require("./users/user");
const buyer = require("./users/buyer");
const seller = require("./users/seller");
const listings = require("../../db/listings");
const rooms = require("./rooms");
const t = require("../../copy.json");

async function handleText(recipient, message) {
  const ctx = getContext(recipient.id);
  const {
    data: { to, roomId }
  } = ctx;
  if (message.text.startsWith("\\")) {
    // Handle commands here
    const command = message.text.substring(1);
    switch (command) {
      case "q":
      case "quit":
        if (!ctx || ctx.state !== state.CHATTING) {
          return send.text(
            recipient,
            "It doesn't look like you're messaging anyone."
          );
        }
        return rooms
          .deactivateRoom(roomId)
          .then(() => {
            removeContext(to);
            removeContext(recipient.id);
            return getUserProfile(recipient, ["first_name"]);
          })
          .then(({ first_name }) =>
            send.text({ id: to }, `${first_name} has left the chat.`)
          )
          .then(() => send.text(recipient, "Successfully disconnected."))
          .catch(err => console.error(err));
      default:
        return;
    }
  }

  if (ctx) {
    switch (ctx.state) {
      case state.CHATTING:
        handlers.chatting(recipient, message);
        break;
      case state.FAQ_SETUP:
        handlers.faqSetup(recipient, message);
        break;
      default:
        break;
    }
  }

  if (message.text === "message seller") {
    const { data } = ctx;
    const { listingId } = data;
    const snapshot = await db.ref(`listings/${listingId}`).once("value");
    const { seller } = snapshot.val();

    let roomId = await rooms.getRoom(seller, recipient.id);
    if (!roomId) {
      roomId = await rooms.makeRoom(listingId, [seller, recipient.id]);
    } else {
      await rooms.activateRoom(roomId);
    }

    const { first_name } = await getUserProfile(seller, ["first_name"]);
    setContext(recipient.id, "chatting", { to: seller, roomId });
    setContext(seller, "chatting", { to: recipient.id, roomId });
    return send.text(
      recipient,
      `You are now connected with ${first_name}! You can disconnect any time by typing \\q or \\quit.`
    );
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
      const { seller, has_queue, queue = [] } = listing;
      if (seller !== recipient.id) {
        if (has_queue) {
          if (!queue.includes(recipient.id)) {
            return buyer.promptInterestedBuyer(recipient, queue);
          }
          return buyer.notifyBuyerStatus(recipient, queue);
        }
        return send.text(recipient, t.buyer.no_queue);
      } else {
        if (has_queue) {
          return seller.promptSellerListing(recipient, listing);
        }
        return seller.promptSetupQueue(recipient);
      }
    }
    setContext(recipient.id, state.CATEGORIZE, { listingId, title });
    return user.promptUserCategorization(recipient);
  });
}

function handleQuickReply(recipient, message) {
  const { payload } = message.quick_reply;
  const { data } = getContext(recipient.id);
  const { listingId, title } = data;

  const listingRef = db.ref(`listings/${listingId}`);

  listingRef.once("value", async snapshot => {
    const listing = snapshot.val();
    const { queue = [], faq = [] } = listing;

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
        return seller.promptSetupQueue(recipient);
      case "setup-faq":
        return seller.setupFAQ(recipient, listingId);
      case "skip-faq":
        return seller.promptStart(recipient, t.faq.no_faq + t.general.next);
      case "setup-queue":
        seller.setQueue(listingId, true);
        await send.text(recipient, "A queue has been sucessfuly set up.");
        return seller.promptSetupFAQ(recipient);
      case "add-queue":
        return buyer.addUserToQueue(recipient, listingId);
      case "display-queue":
        return seller.displayQueue(recipient, listing.queue);
      case "skip-queue":
        return seller.promptSetupFAQ(recipient);
      case "leave-queue":
        return buyer.removeUserFromQueue(recipient, listingId, title);
      case "remove-listing":
        listings.removeListing(recipient.id, listingId);
        return seller.promptStart(recipient, t.seller.remove_listing);
      case "show-listings":
        return user.showListings(recipient);
      case "show-interests":
        return user.showInterests(recipient);
      case "show-faq":
        await send.text(recipient, buyer.formatFAQ(faq));
        return buyer.promptInterestedBuyer(recipient, queue);
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
  handleText,
  handleListing,
  handleQuickReply
};
