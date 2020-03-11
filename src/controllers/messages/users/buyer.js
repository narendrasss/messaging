const { getQueueMessage, sendText } = require("../helpers");
const { db } = require("../../../db");
const t = require("../../../copy.json");

/**
 * Formats a string displaying the faq, given an array of objects with questions and answers.
 *
 * @param {array} faq
 */
function formatFAQ(faq) {
  let formattedMessage = "";
  for (const { question, answer } of faq) {
    formattedMessage += `Question: ${question}\n` + `Answer: ${answer}\n\n`;
  }
  return formattedMessage.substring(0, -2);
}

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
      title: t.buyer.show_faq,
      payload: "show-faq"
    },
    {
      content_type: "text",
      title: t.buyer.dont_add_queue,
      payload: "skip-queue"
    }
  ];
  sendText(text);
  client
    .sendQuickReplies(
      recipient,
      replies,
      "Would you like to be added to the queue?"
    )
    .catch(err => console.error(err));
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
      if (!val.includes(listingId)) {
        val.push(listingId);
        interests.set(val);
      }
    } else {
      interests.set([listingId]);
    }
  });
  queue.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      if (!val.includes(recipient.id)) {
        val.push(recipient.id);
        queue.set(val);
      } else {
        const message = getQueueMessage(recipient.id, val);
        sendText(client, recipient, message);
      }
    } else {
      queue.set([recipient.id]);
    }
    sendText(client, recipient, "Great! You've been added to the queue.");
  });
}

/**
 * If the user is in the queue, removes them from the queue. Otherwise, queue remains intact.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} listingId
 */
function removeUserFromQueue(client, recipient, listingId) {
  const queue = db.ref(`listings/${listingId}/queue`);
  queue.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      const position = val.indexOf(recipient.id);
      if (position < 0) {
        sendText(client, recipient, t.buyer.not_in_queue);
      } else {
        queue.set(val.splice(position, 1));
        sendText(client, recipient, t.buyer.remove_queue);
      }
    }
  });
}

module.exports = {
  addUserToQueue,
  formatFAQ,
  notifyBuyerStatus,
  promptInterestedBuyer,
  removeUserFromQueue
};
