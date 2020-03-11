const { getQueueMessage, sendText } = require("../helpers");
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
  const text = getQueueMessage(recipient.id, queue);
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
  sendText(client, recipient, text);
  client
    .sendQuickReplies(
      recipient,
      replies,
      t.queue.buyer_question
    )
}

function notifyBuyerStatus(client, recipient, queue) {
  sendText(client, recipient, getQueueMessage(recipient.id, queue));
  client.sendQuickReplies(
    recipient,
    [
      {
        content_type: "text",
        title: t.buyer.show_faq,
        payload: "show-faq"
      },
      {
        content_type: "text",
        title: t.buyer.leave_queue,
        payload: "leave-queue"
      },
      {
        content_type: "text",
        title: t.buyer.quit,
        payload: "quit"
      }
    ],
    "What would you like to do?"
  );
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
    sendText(client, recipient, t.buyer.success_add_queue);
  });
}

module.exports = { addUserToQueue, notifyBuyerStatus, promptInterestedBuyer };
