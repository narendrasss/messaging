const { db } = require("../../db");
const send = require("../../send");

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

async function sendMessage(roomId, from, to, text) {
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

module.exports = {
  activateRoom,
  deactivateRoom,
  makeRoom,
  getRoom,
  sendMessage
};
