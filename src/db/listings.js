const { db } = require(".");

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
      const { listings_sale = [] } = snapshot.val();
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
  db.ref("listings")
    .child(listingId)
    .set(listing);
}

/**
 * Sets the price on a listing
 *
 * @param {string} listingId
 * @param {string} price
 */
function setSellerPrice(listingId, price) {
  const priceRef = db.ref(`listings/${listingId}/price`);
  return priceRef.set(price);
}

module.exports = { addListing, removeListing, createListing, setSellerPrice };
