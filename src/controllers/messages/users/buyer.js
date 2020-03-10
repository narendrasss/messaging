const { stringTemplateParser } = require("../helpers");
const t = require("../../../copy.json");

// AUTOMATED REPLIES

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
  const numPeople = queue.length;
  const text = stringTemplateParser(t.buyer.has_queue, { numPeople });
  const replies = [
    {
      content_type: "text",
      title: t.buyer.add_self,
      payload: ""
    },
    {
      content_type: "text",
      title: t.buyer.show_faq,
      payload: ""
    },
    {
      content_type: "text",
      title: t.buyer.quit,
      payload: ""
    }
  ];
  client.sendQuickReplies(recipient, replies, text);
}

export { promptInterestedBuyer };
