const { db } = require("../../db");
const { getContext, setContext, state } = require("../../state/context");
const { send } = require("../../client");
const { getListingId } = require("./helpers");
const commandHandlers = require("./commands/handlers");
const stateHandlers = require("../../state/handlers");
const user = require("./users/user");
const buyer = require("./users/buyer");
const seller = require("./users/seller");
const listings = require("../../db/listings");
const t = require("../../copy.json");

async function handleText(recipient, message) {
  const ctx = getContext(recipient.id);

  if (ctx) {
    if (message.text.startsWith("\\")) {
      // Handle commands here
      const command = message.text.substring(1).toLowerCase();
      switch (command) {
        case "q":
        case "quit":
          return commandHandlers.handleQuit(ctx, recipient);
        case "message seller":
          return commandHandlers.handleMessageSeller(ctx, recipient);
        default:
          // TODO
          return send.text(recipient, "Not implemented.");
      }
    }

    switch (ctx.state) {
      case state.CHATTING:
        return stateHandlers.chatting(recipient, message);
      case state.FAQ_SETUP:
        return stateHandlers.faqSetup(recipient, message);
      default:
        // TODO
        return send.text(recipient, "Not implemented.");
    }
  }

  return send.text(recipient, "Not implemented.");
}

function handleListing(recipient, message) {
  db.ref(`users/${recipient.id}`).once("value", async snapshot => {
    if (!snapshot.val()) {
      const user = { listings_sale: [], listings_buy: [] };
      await db.ref(`users/${recipient.id}`).set(user);
    }

    const listingsRef = db.ref("listings");
    const { title } = message.attachments[0].payload;
    const listingId = getListingId(message);
    listingsRef.child(listingId).once("value", snapshot => {
      setContext(recipient.id, "", { listingId, title });
      const listing = snapshot.val();
      if (listing) {
        const { seller: sellerId, has_queue, queue = [] } = listing;
        if (sellerId !== recipient.id) {
          if (has_queue) {
            if (!queue.includes(recipient.id)) {
              return buyer.promptInterestedBuyer(recipient, queue);
            }
            return buyer.notifyBuyerStatus(recipient, queue);
          }
          return buyer.promptInterestedBuyerNoQueue(recipient, listingId);
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
  });
}

function handleQuickReply(recipient, message) {
  const { payload } = message.quick_reply;
  const { data } = getContext(recipient.id);
  const { listingId, title } = data;

  switch (payload) {
    case "buyer":
      return send.text(recipient, t.buyer.no_share);
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
    default:
      break;
  }

  const listingRef = db.ref(`listings/${listingId}`);

  listingRef.once("value", async snapshot => {
    const listing = snapshot.val();

    switch (payload) {
      case "setup-faq":
        return seller.setupFAQ(recipient);
      case "skip-faq":
        return seller.promptStart(
          recipient,
          `${t.faq.no_faq} ${t.general.next}`
        );
      case "setup-queue":
        listings.createQueue(listingId);
        await send.text(recipient, "A queue has been successfully set up.");
        return seller.promptSetupFAQ(recipient);
      case "add-queue":
        return buyer.addUserToQueue(recipient, listingId);
      case "display-queue":
        return seller.displayQueue(recipient, listing.queue);
      case "skip-queue":
        return seller.promptSetupFAQ(recipient);
      case "leave-queue":
        return buyer.removeUserFromQueue(recipient, listingId, title);
      case "message-seller":
        return handleText(recipient, { text: "\\message seller" });
      case "remove-listing":
        listings.removeListing(recipient.id, listingId);
        return seller.promptStart(recipient, t.seller.remove_listing);
      case "show-listings":
        return user.showListings(recipient);
      case "show-interests":
        return user.showInterests(recipient);
      case "show-faq": {
        const { queue = [], faq = [] } = listing;
        await send.text(recipient, buyer.formatFAQ(faq));
        if (!queue.includes(recipient.id)) {
          return buyer.promptInterestedBuyer(recipient, queue);
        }
        return buyer.notifyBuyerStatus(recipient, queue);
      }
      case "quit":
        setContext(recipient.id, state.DONE, { ...data });
        return send.text(recipient, t.general.done);
      default:
        return send.text(recipient, "Not supported.");
    }
  });
}

module.exports = {
  handleText,
  handleListing,
  handleQuickReply
};
