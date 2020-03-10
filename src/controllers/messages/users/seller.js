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
 * Asks the seller if they would like to setup a queue for the given listing.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} sellerId
 * @param {string} listingId
 */
function promptSetupQueue(client, recipient, sellerId, listingId) {
  const text = t.queue.question;
  const replies = [
    {
      content_type: "text",
      title: t.queue.setup,
      payload: JSON.stringify({
        setupQueue: true,
        sellerId,
        listingId
      })
    },
    {
      content_type: "text",
      title: t.queue.no_setup,
      payload: JSON.stringify({
        setupQueue: false,
        sellerId,
        listingId
      })
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

module.exports = { addListing, createListing, promptSetupQueue };
