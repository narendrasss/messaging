const { getQueueMessage, getUpdatedQueueMessage } = require("../helpers");
const send = require("../../../send");
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
  send
    .text(recipient, text)
    .then(() => send.quickReplies(recipient, replies, t.queue.buyer_question));
}

function notifyBuyerStatus(client, recipient, queue) {
  send.text(recipient, getQueueMessage(recipient.id, queue));
  send.quickReplies(
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
  queue.once("value", async snapshot => {
    const val = snapshot.val();
    if (val) {
      if (!val.includes(recipient.id)) {
        val.push(recipient.id);
        queue.set(val);
      } else {
        const message = getQueueMessage(recipient.id, val);
        await send.text(recipient, message);
      }
    } else {
      queue.set([recipient.id]);
    }
    send.text(recipient, t.buyer.success_add_queue);
  });
}

/**
 * If the user is in the queue, removes them from the queue and
 * notifies all other users in the queue of their updated position.
 * Otherwise, queue remains intact.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} listingId
 * @param {string} title
 */
function removeUserFromQueue(client, recipient, listingId, title) {
  const queue = db.ref(`listings/${listingId}/queue`);
  queue.once("value", async snapshot => {
    const val = snapshot.val();
    if (val) {
      const position = val.indexOf(recipient.id);
      if (position < 0) {
        send.text(recipient, t.buyer.not_in_queue);
      } else {
        val.splice(position, 1);
        queue.set(val);
        await send.text(recipient, t.buyer.remove_queue);

        for (const id of val) {
          const user = { id };
          const text = getUpdatedQueueMessage(id, val, title);
          await send.text(
            user,
            "Someone from one of the listings you're watching has left the queue."
          );
          await send.text(user, text);
        }
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
