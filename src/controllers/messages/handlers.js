const { db } = require("../../db");
const { getContext, setContext, state } = require("../../state/context");
const { send } = require("../../client");
const { getListingId } = require("./helpers");
const commandHandlers = require("./commands/handlers");
const stateHandlers = require("../../state/handlers");
const { buyerService } = require("../../state/machine");
const user = require("./users/user");
const buyer = require("./users/buyer");
const seller = require("./users/seller");
const listings = require("../../db/listings");
const t = require("../../copy.json");

async function handleText(recipient, message) {
  const ctx = getContext(recipient.id);
  if (message.text.startsWith("\\")) {
    // Handle commands here
    const command = message.text.substring(1).toLowerCase();
    switch (command) {
      case "q":
      case "quit":
        return commandHandlers.handleQuit(ctx, message);
      case "message seller":
        return commandHandlers.handleMessageSeller(ctx, message);
      default:
        return;
    }
  }

  if (ctx) {
    switch (ctx.state) {
      case state.CHATTING:
        return stateHandlers.chatting(recipient, message);
      case state.FAQ_SETUP:
        return stateHandlers.faqSetup(recipient, message);
      default:
        return;
    }
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
      const { seller: sellerId, has_queue, queue = [] } = listing;
      if (sellerId !== recipient.id) {
        if (has_queue) {
          if (!queue.includes(recipient.id)) {
            return buyer.promptInterestedBuyer(recipient, queue);
          }
          return buyer.notifyBuyerStatus(recipient, queue);
        }
        return buyer.promptInterestedBuyerNoQueue(recipient, listing);
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

  // needed for integration of xstate with current handlers
  switch (payload) {
    case "accept-seller-offer":
      buyerService.send("OFFER");
      break;
    case "wait":
      buyerService.send("WAIT");
      break;
    default:
      break;
  }

  const {
    context: { currentState }
  } = buyerService;

  if (currentState) {
    // checks to see if we're using xstate to maintain state
    switch (currentState) {
      case "accept-offer":
        console.log("accept-offer");
        return;
      case "wait":
        console.log("wait");
        return;
      default:
        return;
    }
  }

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
        return seller.setupFAQ(recipient, listingId);
      case "skip-faq":
        return seller.promptStart(recipient, t.faq.no_faq + t.general.next);
      case "setup-queue":
        listings.setQueue(listingId, true);
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
      case "show-faq": {
        const { queue = [], faq = [] } = listing;
        await send.text(recipient, buyer.formatFAQ(faq));
        return buyer.promptInterestedBuyer(recipient, queue);
      }
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
