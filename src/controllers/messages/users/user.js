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
      title: "Show all your listings",
      payload: ""
    },
    {
      content_type: "text",
      title: "Show all items you're interested in",
      payload: ""
    },
    {
      content_type: "text",
      title: "Quit",
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
  const text = "Are you the seller of this item?";
  const replies = [
    {
      content_type: "text",
      title: "I am the seller!",
      payload: {
        type: "seller",
        listingId
      }
    },
    {
      content_type: "text",
      title: "I am the buyer!",
      payload: {
        type: "buyer",
        listingId
      }
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

module.exports = { promptStart, promptUserCategorization };
