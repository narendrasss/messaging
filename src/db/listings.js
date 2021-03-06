const { db } = require(".");
const { send } = require("../client");
const { setContext } = require("../state/context");
const {
  getUpdatedSellerQueueMessage,
  getUpdatedQueueMessage
} = require("../controllers/messages/helpers");
const t = require("../copy.json");

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

async function removeUserFromQueue(listingId, userId) {
  const snapshot = await db.ref(`listings/${listingId}`).once("value");
  if (snapshot.val()) {
    const { seller: sellerId, queue, title } = snapshot.val();

    const seller = { id: sellerId };
    const buyer = { id: userId };

    if (queue) {
      const pos = queue.indexOf(userId);
      queue.splice(pos, 1);

      const updates = [];
      updates.push(
        send
          .text(seller, t.chat.seller_update)
          .then(() =>
            send.text(seller, getUpdatedSellerQueueMessage(queue, title))
          )
      );

      updates.push(send.text(buyer, t.chat.buyer_danger));
      for (const id of queue) {
        const user = { id };
        updates.push(
          send
            .text(user, t.buyer.queue_update)
            .then(() =>
              send.text(user, getUpdatedQueueMessage(id, queue, title))
            )
        );
      }
      await Promise.all(updates);
      snapshot.ref.child("queue").set(queue);
    }
  }
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
  queueRef.on("value", async snapshot => {
    const queue = snapshot.val();
    if (queue) {
      const firstInLine = queue[0];
      if (!prevMessaged[listingId] || prevMessaged[listingId] !== firstInLine) {
        const user = { id: firstInLine };
        prevMessaged[listingId] = firstInLine;

        // set to 30 secs for now
        const DELAY = 1000 * 30;
        await send
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
        setContext(firstInLine, "wait-message-seller", {
          warningTimeout: setTimeout(
            () =>
              send.text(
                user,
                `${t.chat.general_warning} Message the seller soon with '\\message seller' or risk your place in line.`
              ),
            DELAY / 2
          ),
          dangerTimeout: setTimeout(() => {
            removeUserFromQueue(listingId, firstInLine).then(() =>
              send.text(
                user,
                `Since it's been 48 hours, you've been kicked out of the queue.`
              )
            );
          }, DELAY)
        });
      }
    }
  });
}

module.exports = {
  addListing,
  removeListing,
  createListing,
  setSellerPrice,
  removeUserFromQueue,
  createQueue
};
