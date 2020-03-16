const { db } = require("../../../db");
const { send } = require("../../../client");
const seller = require("./seller");
const t = require("../../../copy.json");

// AUTOMATED REPLIES

/**
 * Asks the user if they are the seller or buyer of the given item.
 *
 * @param {object} recipient
 */
function promptUserCategorization(recipient) {
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
 * @param {object} recipient
 */
async function showInterests(recipient) {
  const interestsRef = db.ref(`users/${recipient.id}/listings_buy`);
  interestsRef.once("value", async snapshot => {
    const listings_buy = snapshot.val();
    if (listings_buy) {
      return _constructTemplate(listings_buy, "generic")
        .then(template => send.template(recipient, template))
        .then(() => seller.promptStart(recipient, t.general.next))
        .catch(err => console.error(err));
    }
    return send
      .text(recipient, t.seller.no_interests)
      .then(() => seller.promptStart(recipient, t.general.next))
      .catch(err => console.error(err));
  });
}

/**
 * Displays the listings that a user has a queue set up for.
 *
 * @param {object} recipient
 */
async function showListings(recipient) {
  const saleRef = db.ref(`users/${recipient.id}/listings_sale`);
  saleRef.once("value", async snapshot => {
    const listings_sale = snapshot.val();
    if (listings_sale) {
      return _constructTemplate(listings_sale, "generic")
        .then(template => send.template(recipient, template))
        .then(() => seller.promptStart(recipient, t.general.next))
        .catch(err => console.error(err));
    }
    return send
      .text(recipient, t.seller.no_sale)
      .then(() => seller.promptStart(recipient, t.general.next))
      .catch(err => console.error(err));
  });
}

/**
 * Private helper that constructs a template object to be used for send.template..
 *
 * @param {array} listings
 * @param {string} template_type
 */
async function _constructTemplate(listings, template_type) {
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
