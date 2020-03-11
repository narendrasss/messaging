const context = require("../../../context");
const t = require("../../../copy.json");

// AUTOMATED REPLIES

/**
 * Asks the user if they are the seller or buyer of the given item.
 *
 * @param {object} client
 * @param {object} recipient
 */
function promptUserCategorization(client, recipient, listingId) {
  context.setContext(recipient.id, "categorize", { listingId });
  const text = t.user_categorization.question;
  const replies = [
    {
      content_type: "text",
      title: t.user_categorization.is_seller,
      payload: "seller"
    },
    {
      content_type: "text",
      title: t.user_categorization.is_buyer,
      payload: "buyer"
    }
  ];
  client
    .sendQuickReplies(recipient, replies, text)
    .catch(err => console.error(err));
}

module.exports = { promptUserCategorization };
