const { db } = require("../../db");
const { send } = require("../../client");
const listings = require("../../db/listings");
const t = require("../../copy.json");

const TIMEOUTS = {};

async function makeRoom(listingId, members) {
  const roomsRef = db.ref("rooms");
  const roomRef = await roomsRef.push({
    is_active: true,
    listingId,
    members
  });
  const snapshot = await roomRef.once("value");
  const [user1, user2] = members;
  db.ref(`users/${user1}/rooms/${user2}`).set(snapshot.key);
  db.ref(`users/${user2}/rooms/${user1}`).set(snapshot.key);
  return snapshot.key;
}

async function getRoom(user1, user2) {
  const snapshot = await db.ref(`users/${user1}/rooms/${user2}`).once("value");
  return snapshot.val();
}

async function sendMessage(listingId, roomId, from, to, text) {
  handleTimers(listingId, roomId, from, to);
  const messageObj = {
    timestamp: new Date().toISOString(),
    from,
    to,
    text
  };
  const messageRef = await db.ref("messages").push(messageObj);
  db.ref(`rooms/${roomId}/messages/${messageRef.key}`).set(true);
  send.text({ id: to }, text);
}

async function activateRoom(roomId) {
  return db.ref(`rooms/${roomId}/is_active`).set(true);
}

async function deactivateRoom(roomId) {
  await clearTimeouts(roomId);
  return db.ref(`rooms/${roomId}/is_active`).set(false);
}

function handleTimers(listingId, roomId, from, to) {
  // delay should actually be 48 hours in production, but is 30s for testing
  const DELAY = 1000 * 30;

  // we need to figure out if it's a buyer or if it's a seller
  db.ref(`listings/${listingId}/seller`).once("value", async snapshot => {
    const sellerId = snapshot.val();
    let warningMessage, dangerMessage;
    if (from == sellerId) {
      // if the person sending the message is the seller
      warningMessage = t.chat.buyer_warning;
      dangerMessage = t.chat.buyer_danger;
    } else {
      // if the person sending the message is the buyer
      warningMessage = t.chat.seller_warning;
      dangerMessage = t.chat.seller_danger;
    }

    // we need to clear the stored timeouts
    clearTimeouts(roomId);

    // create the new timeout objects
    const warning_timeout = setTimeout(() => {
      send.text({ id: to }, warningMessage);
    }, DELAY / 2);
    const timeout = setTimeout(() => {
      send.text({ id: to }, dangerMessage);
      // if the message is going to the buyer, we need to kick them out of the queue
      if (sellerId != to) {
        listings.removeUserFromQueue(listingId, { id: to });
      }
    }, DELAY);

    // persist the timeout objects to RAM
    const lastMessage = { from, warning_timeout, timeout };
    TIMEOUTS[roomId] = lastMessage;
  });
}

async function clearTimeouts(roomId) {
  const lastMessage = TIMEOUTS[roomId];
  if (lastMessage) {
    const { warning_timeout, timeout } = lastMessage;
    clearTimeout(warning_timeout);
    clearTimeout(timeout);
  }
}

module.exports = {
  activateRoom,
  deactivateRoom,
  makeRoom,
  getRoom,
  sendMessage
};
