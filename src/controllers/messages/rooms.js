const { db } = require("../../db");
const { client } = require("../../client");

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
}

async function sendMessage(from, to, text) {
  const messageObj = {
    timestamp: new Date(),
    from,
    to,
    text
  };

  const messageRef = await db.ref("messages").push(messageObj);
  const roomIdSnapshot = await db
    .ref(`users/${from}/rooms/${to}`)
    .once("value");
  const roomId = roomIdSnapshot.val();
  db.ref(`rooms/${roomId}/messages/${messageRef.key}`).set(true);

  client.sendText({ id: to }, text);
}

module.exports = {
  makeRoom,
  sendMessage
};
