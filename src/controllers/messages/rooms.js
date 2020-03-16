const { db } = require("../../db");
const { send } = require("../../client");
const buyer = require("./users/buyer");
const t = require("../../copy.json");

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
  return db.ref(`rooms/${roomId}/is_active`).set(false);
}

function handleTimers(listingId, roomId, from, to) {
  // delay should actually be 48 hours in production, but is 30s for testing
  const DELAY = 1000 * 30;

  // we need to figure out if it's a buyer or if it's a seller
  db.ref(`listings/${listingId}`, async snapshot => {
    const { sellerId, title } = snapshot.val();
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
    const lastMessageSnapshot = await db
      .ref(`rooms/${roomId}/last_message`)
      .once("value");
    if (lastMessageSnapshot.val()) {
      let { warning_timeout, timeout } = lastMessageSnapshot.val();
      clearTimeout(warning_timeout);
      clearTimeout(timeout);
    }

    // create the new timeout objects
    const warning_timeout = setTimeout(() => {
      send.text({ id: to }, warningMessage);
    }, DELAY / 2);
    const timeout = setTimeout(() => {
      send.text({ id: to }, dangerMessage);
      // if the message is going to the buyer, we need to kick them out of the queue
      if (sellerId != to) {
        buyer.removeUserFromQueue({ id: to }, listingId, title);
      }
    }, DELAY);

    // persist the timeout objects to the database
    const lastMessage = { from, warning_timeout, timeout };
    await db
      .ref(`rooms/${roomId}/last_message`)
      .once("value")
      .set(lastMessage);
  });
}

module.exports = {
  activateRoom,
  deactivateRoom,
  makeRoom,
  getRoom,
  sendMessage
};
