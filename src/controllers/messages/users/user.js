const { db } = require("../../../db");
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

/**
 * Displays the listings that a user is on a queue for.
 *
 * @param {object} client
 * @param {object} recipient
 */
function showInterests(client, recipient) {
  const user = db.ref(`users/${recipient.id}`);
  user.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      const { listings_buy } = val;
      const template = _constructTemplate(listings_buy, "generic");
      return client.sendTemplate(recipient, template);
    }
  });
}

/**
 * Displays the listings that a user has a queue set up for.
 *
 * @param {object} client
 * @param {object} recipient
 */
function showListings(client, recipient) {
  const user = db.ref(`users/${recipient.id}`);
  user.once("value", snapshot => {
    const val = snapshot.val();
    if (val) {
      const { listings_sale } = val;
      const template = _constructTemplate(listings_sale, "generic");
      return client.sendTemplate(recipient, template);
    }
  });
}

/**
 * Private helper that constructs a template object to be used for client.sendTemplate.
 *
 * @param {array} listings
 * @param {string} template_type
 */
function _constructTemplate(listings, template_type) {
  const elements = [];
  for (const listing of listings) {
    const title = listing.title;
    const id = listing.listingId;
    elements.push({
      title,
      default_action: {
        type: "web_url",
        url: `https://www.facebook.com/marketplace/item/${id}/`
      },
      buttons: [
        {
          type: "web_url",
          url: `https://www.facebook.com/marketplace/item/${id}/`,
          title: "View Listing"
        }
      ]
    });
  }
  return { template_type, elements };
}

module.exports = {
  promptStart,
  promptUserCategorization,
  showInterests,
  showListings
};
