const { db } = require("../../../db");
const { getSellerStatusMessage, sendText } = require("../helpers");
const t = require("../../../copy.json");

/**
 * Adds listingId to array of listings associated with seller given by userId
 *
 * @param {string} userId
 * @param {string} listingId
 */
function addListing(userId, listingId) {
  const users = db.ref("users");
  users.child(userId).once("value", snapshot => {
    if (snapshot.val()) {
      // if the seller exists in the db
      const { listings_sale } = snapshot.val();
      const user = users.child(userId);
      user.set({
        ...snapshot.val(),
        listings_sale: [...listings_sale, listingId]
      });
    } else {
      // if the seller doesn't exist in the db
      users.child(userId).set({
        listings_sale: [listingId],
        listings_buy: []
      });
    }
  });
}

/**
 * Removes listing from list of listings and also from seller's list of listings.
 *
 * @param {string} userId
 * @param {string} listingId
 */
function removeListing(userId, listingId) {
  // remove listing from list of listings
  const listingsRef = db.ref("listings");
  listingsRef.once("value", snapshot => snapshot.child(listingId).remove());

  // remove listing from user's listings_sale array
  const listings_sale = db.ref(`users/${userId}/listings_sale`);
  listings_sale.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      const index = val.indexOf(listingId);
      if (index >= 0) {
        val.splice(index, 1);
        listings_sale.set(val);
      }
    }
  });
}

/**
 * Creates listing object in database
 *
 * @param {string} listingId
 * @param {object} listing
 */
function createListing(listingId, listing) {
  db.ref("listings")
    .child(listingId)
    .set(listing);
}

// AUTOMATED REPLIES

/**
 * Formats and sends a message containing the current queue to the seller.
 *
 * @param {*} client
 * @param {*} recipient
 * @param {*} queue
 */
function displayQueue(client, recipient, queue) {
  const q = queue || [];
  let message =
    "There " +
    (q.length === 1 ? "is 1 person" : `are ${q.length} people `) +
    "in the queue.\n";

  for (const psid of q) {
    const { first_name, last_name } = client
      .getUserProfile(psid, ["first_name", "last_name"])
      .then(() => (message += `${first_name} ${last_name}\n`))
      .catch(err => console.error(err));
  }
  sendText(client, recipient, message.substring(0, message.length - 1));
}

/**
 * Asks the user what they would like to do next.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} text
 */
function promptStart(client, recipient, text) {
  const replies = [
    {
      content_type: "text",
      title: t.start.show_listings,
      payload: "show-listings"
    },
    {
      content_type: "text",
      title: t.start.show_interested,
      payload: "show-interests"
    },
    {
      content_type: "text",
      title: t.start.quit,
      payload: "quit"
    }
  ];
  client
    .sendQuickReplies(recipient, replies, text)
    .catch(err => console.error(err));
}

/**
 * Tells the seller that this is their own listing and gives them options about how to manage it:
 * 1. See the queue
 * 2. Remove item from listings
 * 3. Quit
 *
 * @param {object} client
 * @param {object} recipient
 * @param {array} queue
 */
function promptSellerListing(client, recipient, listing) {
  const text = getSellerStatusMessage(listing);
  const replies = [
    {
      content_type: "text",
      title: t.seller.see_queue,
      payload: "display-queue"
    },
    {
      content_type: "text",
      title: t.seller.item_sold,
      payload: "remove-listing"
    },
    {
      content_type: "text",
      title: t.seller.quit,
      payload: "quit"
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

/**
 * Asks the seller if they would like to setup a queue for the given listing.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} listingId
 */
function promptSetupQueue(client, recipient, listingId) {
  const text = t.queue.question;
  const replies = [
    {
      content_type: "text",
      title: t.queue.setup,
      payload: "setup-queue"
    },
    {
      content_type: "text",
      title: t.queue.no_setup,
      payload: "skip-queue"
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

module.exports = {
  addListing,
  createListing,
  removeListing,
  displayQueue,
  promptSellerListing,
  promptSetupQueue,
  promptStart
};
