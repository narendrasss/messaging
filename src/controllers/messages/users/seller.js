const { db } = require("../../../db");
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
 * Tells the seller that this is their own listing and gives them options about how to manage it:
 * 1. See the queue
 * 2. Remove item from listings
 * 3. Quit
 *
 * @param {object} client
 * @param {object} recipient
 * @param {array} queue
 */
function promptSellerListing(client, recipient, queue) {
  const text = t.seller.own_listing;
  const replies = [
    {
      content_type: "text",
      title: t.seller.see_queue,
      payload: ""
    },
    {
      content_type: "text",
      title: t.seller.item_sold,
      payload: ""
    },
    {
      content_type: "text",
      title: t.seller.quit,
      payload: ""
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
      payload: JSON.stringify({
        setupQueue: true,
        sellerId: recipient.id,
        listingId
      })
    },
    {
      content_type: "text",
      title: t.queue.no_setup,
      payload: JSON.stringify({
        setupQueue: false,
        sellerId: recipient.id,
        listingId
      })
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

module.exports = {
  addListing,
  createListing,
  promptSellerListing,
  promptSetupQueue
};
