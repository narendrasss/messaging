const { getQueueMessage } = require("../helpers");
const { db } = require("../../../db");
const t = require("../../../copy.json");

/**
 * Asks the buyer what they would like to do next. Provides three options:
 * 1. Add self to queue
 * 2. See frequently asked questions of item
 * 3. Quit
 *
 * @param {object} client
 * @param {object} recipient
 * @param {array} queue
 */
function promptInterestedBuyer(client, recipient, queue) {
  const q = queue || [];
  const text = getQueueMessage(q.length);
  const replies = [
    {
      content_type: "text",
      title: t.buyer.add_queue,
      payload: "add-queue"
    },
    {
      content_type: "text",
      title: t.buyer.dont_add_queue,
      payload: "skip-queue"
    }
  ];
  client
    .sendQuickReplies(recipient, replies, text)
    .catch(err => console.error(err));
}

function addUserToQueue(client, recipient, listingId) {
  const queue = db.ref(`listings/${listingId}/queue`);
  const interests = db.ref(`users/${recipient.id}/listings_buy`);
  interests.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      val.push(listingId);
      interests.set(val);
    } else {
      interests.set([listingId]);
    }
  });
  queue.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      val.push(recipient.id);
      queue.set(val);
    } else {
      queue.set([recipient.id]);
    }
    client.sendText(recipient, "Great! You've been added to the queue.");
  });
}

module.exports = { addUserToQueue, promptInterestedBuyer };
