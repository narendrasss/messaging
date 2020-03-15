const { db } = require(".");
const { send } = require("../client");

const prevMessaged = {};

/**
 * Adds listingId to array of listings associated with seller given by userId
 *
 * @param {string} userId
 * @param {string} listingId
 */
function addListing(userId, listingId) {
  const userRef = db.ref(`users/${userId}`);
  userRef.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      // if the seller exists in the db
      const { listings_sale = [] } = val;
      if (!listings_sale.includes(listingId)) {
        // if this listing doesn't already exist in the user's listings
        userRef.update({
          listings_sale: [...listings_sale, listingId]
        });
      }
    } else {
      // if the seller doesn't exist in the db
      userRef.set({
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
  listingsRef.once("value", snapshot => snapshot.child(listingId).ref.remove());

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
  const listingRef = db.ref(`listings/${listingId}`);
  listingRef.once("value", snapshot => {
    if (!snapshot.val()) {
      listingRef.set(listing);
    }
  });
}

/**
 * Sets the price on a listing
 *
 * @param {string} listingId
 * @param {string} price
 */
function setSellerPrice(listingId, price) {
  return db.ref(`listings/${listingId}/price`).set(price);
}

async function createQueue(listingId) {
  const listingSnapshot = await db.ref(`listings/${listingId}`).once("value");
  listingSnapshot.child("has_queue").ref.set(true);

  const queueRef = listingSnapshot.child("queue").ref;
  queueRef.on("value", snapshot => {
    const queue = snapshot.val();
    if (queue) {
      const firstInLine = queue[0];
      if (!prevMessaged[listingId] || prevMessaged[listingId] !== firstInLine) {
        const user = { id: firstInLine };
        prevMessaged[listingId] = firstInLine;
        send
          .text(
            user,
            `You're now first in line for ${listingSnapshot.val().title}!`
          )
          .then(() =>
            send.text(
              user,
              "Please make sure to message the seller within the next 48 hours to keep your place in line. You can do that any time by typing in '\\message seller'."
            )
          );
      }
    }
  });
}

module.exports = {
  addListing,
  removeListing,
  createListing,
  setSellerPrice,
  createQueue
};
