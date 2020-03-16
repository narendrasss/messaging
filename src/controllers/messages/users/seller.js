const { getUserProfile, send } = require("../../../client");
const { getContext, setContext, state } = require("../../../state/context");
const { getSellerStatusMessage } = require("../helpers");
const t = require("../../../copy.json");

// AUTOMATED REPLIES

/**
 * Formats and sends a message containing the current queue to the seller.
 *
 * @param {*} recipient
 * @param {*} queue
 */
async function displayQueue(recipient, queue) {
  const q = queue || [];
  let message =
    "There " +
    (q.length === 1 ? "is 1 person" : `are ${q.length} people `) +
    " in the queue.\n";

  for (const psid of q) {
    const user = await getUserProfile({ id: psid }, [
      "first_name",
      "last_name"
    ]);
    message += `${user.first_name} ${user.last_name}\n`;
  }
  send.text(recipient, message.substring(0, message.length - 1));
}

/**
 * Asks the user the first question in the list of FAQ.
 *
 * @param {object} recipient
 */
function setupFAQ(recipient) {
  setContext(recipient.id, state.FAQ_SETUP, {
    ...getContext(recipient.id).data,
    question: 0
  });
  send.text(recipient, t.faq.questions[0]);
}

/**
 * Asks the user what they would like to do next.
 *
 * @param {object} recipient
 * @param {string} text
 */
function promptStart(recipient, text) {
  const replies = [
    {
      content_type: "text",
      title: t.start.show_listings,
      payload: "show-listings"
    },
    {
      content_type: "text",
      title: t.start.show_interested,
      payload: "show-interests"
    },
    {
      content_type: "text",
      title: t.general.quit,
      payload: "quit"
    }
  ];
  return send.quickReplies(recipient, replies, text);
}

/**
 * Tells the seller that this is their own listing and gives them options about how to manage it:
 * 1. See the queue
 * 2. Remove item from listings
 * 3. Quit
 *
 * @param {object} recipient
 * @param {array} queue
 */
function promptSellerListing(recipient, listing) {
  const text = getSellerStatusMessage(listing);
  const replies = [
    {
      content_type: "text",
      title: t.seller.see_queue,
      payload: "display-queue"
    },
    {
      content_type: "text",
      title: t.seller.item_sold,
      payload: "remove-listing"
    },
    {
      content_type: "text",
      title: t.general.quit,
      payload: "quit"
    }
  ];
  send.quickReplies(recipient, replies, text);
}

/**
 * Asks the seller if they would like to setup a FAQ for their listing.
 *
 * @param {object} recipient
 */
function promptSetupFAQ(recipient) {
  const text = t.faq.question;
  const replies = [
    {
      content_type: "text",
      title: t.faq.setup,
      payload: "setup-faq"
    },
    {
      content_type: "text",
      title: t.faq.skip,
      payload: "skip-faq"
    }
  ];
  send.quickReplies(recipient, replies, text);
}

/**
 * Asks the seller if they would like to setup a queue for their listing.
 *
 * @param {object} recipient
 */
function promptSetupQueue(recipient) {
  const text = t.queue.question;
  const replies = [
    {
      content_type: "text",
      title: t.queue.setup,
      payload: "setup-queue"
    },
    {
      content_type: "text",
      title: t.queue.no_setup,
      payload: "skip-queue"
    }
  ];
  send.quickReplies(recipient, replies, text);
}

module.exports = {
  displayQueue,
  setupFAQ,
  promptSellerListing,
  promptSetupFAQ,
  promptSetupQueue,
  promptStart
};
