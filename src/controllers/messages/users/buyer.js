const {
  getQueueMessage,
  getUpdatedQueueMessage,
  getUpdatedSellerQueueMessage
} = require("../helpers");
const { send } = require("../../../client");
const { db } = require("../../../db");
const t = require("../../../copy.json");

async function promptNextAction(recipient, listingId) {
  const listingRef = db.ref(`listings/${listingId}`);
  const snapshot = await listingRef.once("value");
  const listing = snapshot.val();
  const replies = [
    {
      content_type: "text",
      title: "Message seller",
      payload: "message-seller"
    }
  ];
  if (listing.faq) {
    replies.push({
      content_type: "text",
      title: t.buyer.show_faq,
      payload: "show-faq"
    });
  }
  return send.quickReplies(recipient, replies, t.general.next);
}

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
 * @param {object} recipient
 * @param {array} queue
 */
function promptInterestedBuyer(recipient, queue) {
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

async function promptInterestedBuyerNoQueue(recipient, listingId) {
  await send.text(recipient, t.buyer.no_queue);
  return promptNextAction(recipient, listingId);
}

async function notifyBuyerStatus(recipient, queue) {
  await send.text(recipient, getQueueMessage(recipient.id, queue));
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

async function addUserToQueue(recipient, listingId) {
  const listingRef = db.ref(`listings/${listingId}`);
  const userRef = db.ref(`users/${recipient.id}`);
  const [listingSnapshot, userSnapshot] = await Promise.all([
    listingRef.once("value"),
    userRef.once("value")
  ]);
  const { queue = [], seller, title } = listingSnapshot.val();
  const { listings_buy: interests = [] } = userSnapshot.val();

  const updates = [];
  if (!queue.includes(recipient.id)) {
    queue.push(recipient.id);
    updates.push(listingRef.child("queue").set(queue));
  }

  if (!interests.includes(listingId)) {
    interests.push(listingId);
    updates.push(userRef.child("listings_buy").set(interests));
  }

  await Promise.all(updates);
  promptNextAction(recipient, listingId);
  await send.text({ id: seller }, `Someone joined the queue for ${title}!`);
  return send.text({ id: seller }, getUpdatedSellerQueueMessage(queue, title));
}

/**
 * If the user is in the queue, removes them from the queue and
 * notifies all other users in the queue of their updated position.
 * Otherwise, queue remains intact.
 *
 * @param {object} recipient
 * @param {string} listingId
 * @param {string} title
 */
async function removeUserFromQueue(recipient, listingId, title) {
  const listingRef = db.ref(`listings/${listingId}`);
  const snapshot = await listingRef.once("value");
  const { queue = [], seller } = snapshot.val();
  const position = queue.indexOf(recipient.id);
  if (position < 0) {
    send.text(recipient, t.buyer.not_in_queue);
  } else {
    queue.splice(position, 1);
    const updates = [];
    updates.push(
      send
        .text(
          { id: seller },
          "Someone from one of your listings has left the queue."
        )
        .then(() =>
          send.text({ id: seller }, getUpdatedSellerQueueMessage(queue, title))
        )
    );

    updates.push(send.text(recipient, t.buyer.remove_queue));
    for (const id of queue) {
      const user = { id };
      const text = getUpdatedQueueMessage(id, queue, title);
      updates.push(
        send
          .text(
            user,
            "Someone from one of the listings you're watching has left the queue."
          )
          .then(() => send.text(user, text))
      );
    }
    await Promise.all(updates);
    listingRef.child("queue").set(queue);
  }
}

module.exports = {
  addUserToQueue,
  formatFAQ,
  notifyBuyerStatus,
  promptInterestedBuyer,
  promptInterestedBuyerNoQueue,
  removeUserFromQueue
};
