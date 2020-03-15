const { db } = require("../../db");
const { getContext, setContext, state } = require("../../state/context");
const { send, getUserProfile } = require("../../client");
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
      case state.BUYER_SETUP_OFFER:
        return stateHandlers.offerSeller(recipient, message, ctx.data);
      case state.SELLER_SETUP_OFFER:
        return stateHandlers.offerBuyer(recipient, message, ctx.data);
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
        listings.createQueue(listingId);
        buyer.initializeQueueHandler(listingId);
        await send.text(recipient, "A queue has been sucessfuly set up.");
        return seller.promptSetupFAQ(recipient);
      case "add-queue":
        return buyer.addUserToQueue(recipient, listingId);
      case "display-queue":
        return seller.displayQueue(recipient, listing.queue);
      case "skip-queue":
        return seller.promptSetupFAQ(recipient);
      case "leave-queue": {
        const { seller: id } = listing;
        const queueText = await buyer.removeUserFromQueue(
          recipient,
          listingId,
          title
        );
        send
          .text({ id }, "Someone from one of your listings has left the queue.")
          .then(() => send.text({ id }, queueText));
        return send.text(recipient, t.buyer.remove_queue);
      }
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
      case "accept-buyer-offer": {
        const { buyer: buyerId } = data;
        send.text(recipient, "Great! I'll notify the buyer.");
        return getUserProfile(recipient, ["first_name"]).then(
          ({ first_name }) =>
            // TODO: Remove this later when the availability function is set up.
            send.text(
              { id: buyerId },
              `Good news! ${first_name} has accepted your offer for ${listing.item}.`
            )
        );
      }
      case "counter-buyer-offer":
        setContext(recipient.id, state.SELLER_SETUP_OFFER, {
          ...data,
          listing
        });
        return send.text(recipient, "How much would you like to offer?");
      case "decline-buyer-offer": {
        const { buyer: buyerId } = data;
        await buyer.removeUserFromQueue(
          { id: buyerId },
          listingId,
          listing.title
        );
        send.text(
          { id: buyerId },
          `You've been removed from the queue for ${listing.title}.`
        );
        return send.text(
          recipient,
          `The buyer has been kicked from the queue.`
        );
      }
      case "hold":
        // TODO
        send.text(recipient, "Not implemented.");
        break;
      case "accept-seller-offer":
        send.text(
          recipient,
          "Great! We've notified the seller of your acceptance."
        );
        return getUserProfile(recipient, ["first_name"]).then(
          ({ first_name }) =>
            // TODO: Remove this later when the availability function is set up.
            send.text(
              { id: listing.seller },
              `Good news! ${first_name} has agreed to buy ${listing.item} for your asking price.`
            )
        );
      case "decline-seller-offer":
        setContext(recipient, state.BUYER_SETUP_OFFER, listing);
        return send.text(
          recipient,
          "No worries. What would you like to offer the seller?"
        );
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
