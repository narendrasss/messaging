const { db } = require("../../../db");
const { removeContext, setContext, state } = require("../../state/context");
const { getUserProfile, send } = require("../../client");
const rooms = require("./rooms");

async function handleMessageSeller(ctx, recipient) {
  const { data } = ctx;
  const { listingId } = data;
  const snapshot = await db.ref(`listings/${listingId}`).once("value");
  const { seller } = snapshot.val();

  let roomId = await rooms.getRoom(seller, recipient.id);
  if (!roomId) {
    roomId = await rooms.makeRoom(listingId, [seller, recipient.id]);
  } else {
    await rooms.activateRoom(roomId);
  }

  const { first_name } = await getUserProfile(seller, ["first_name"]);
  setContext(recipient.id, "chatting", { to: seller, roomId });
  setContext(seller, "chatting", { to: recipient.id, roomId });
  return send.text(
    recipient,
    `You are now connected with ${first_name}! You can disconnect any time by typing \\q or \\quit.`
  );
}

async function handleQuit(ctx, recipient) {
  const {
    data: { to, roomId }
  } = ctx;

  if (!ctx || ctx.state !== state.CHATTING) {
    return send.text(
      recipient,
      "It doesn't look like you're messaging anyone."
    );
  }

  return rooms
    .deactivateRoom(roomId)
    .then(() => {
      removeContext(to);
      removeContext(recipient.id);
      return getUserProfile(recipient, ["first_name"]);
    })
    .then(({ first_name }) =>
      send.text({ id: to }, `${first_name} has left the chat.`)
    )
    .then(() => send.text(recipient, "Successfully disconnected."))
    .catch(err => console.error(err));
}

module.exports = { handleMessageSeller, handleQuit };
