const { db } = require("../../../db");
const send = require("../../../send");
const t = require("../../../copy.json");

// AUTOMATED REPLIES

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
      payload: "seller"
    },
    {
      content_type: "text",
      title: t.user_categorization.is_buyer,
      payload: "buyer"
    }
  ];
  send.quickReplies(recipient, replies, text);
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
      if (!listings_sale) {
        send.text(recipient, "You haven't shared any listings yet.");
      } else {
        _constructTemplate(listings_sale, "generic").then(template => {
          client
            .sendTemplate(recipient, template)
            .catch(err => console.error(err));
        });
      }
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
    elements.push(
      db
        .ref(`listings/${listing}`)
        .once("value")
        .then(snapshot => {
          const val = snapshot.val();
          const title = val.title;
          return {
            title,
            default_action: {
              type: "web_url",
              url: `https://www.facebook.com/marketplace/item/${listing}/`
            },
            buttons: [
              {
                type: "web_url",
                url: `https://www.facebook.com/marketplace/item/${listing}/`,
                title: "View Listing"
              }
            ]
          };
        })
    );
  }
  return Promise.all(elements).then(el => ({
    template_type,
    elements: el.filter(e => e.title !== undefined)
  }));
}

module.exports = {
  promptUserCategorization,
  showInterests,
  showListings
};
