const t = require("../../../copy.json");

// AUTOMATED REPLIES

/**
 * Asks the user what they would like to do next.
 *
 * @param {object} client
 * @param {object} recipient
 * @param {string} text
 */
function promptStart(client, recipient, text) {
  const replies = [
    {
      content_type: "text",
      title: t.start.show_listings,
      payload: ""
    },
    {
      content_type: "text",
      title: t.start.show_interested,
      payload: ""
    },
    {
      content_type: "text",
      title: t.start.quit,
      payload: ""
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

/**
 * Asks the user if they are the seller or buyer of the given item.
 *
 * @param {object} client
 * @param {object} recipient
 */
function promptUserCategorization(client, recipient, listingId) {
  const text = t.user_categorization.question;
  const replies = [
    {
      content_type: "text",
      title: t.user_categorization.is_seller,
      payload: {
        type: "seller",
        listingId
      }
    },
    {
      content_type: "text",
      title: t.user_categorization.is_buyer,
      payload: {
        type: "buyer",
        listingId
      }
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

module.exports = { promptStart, promptUserCategorization };
