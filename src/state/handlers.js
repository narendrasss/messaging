const { db } = require("../db/index");
const { getContext, setContext, state } = require("../state/context");
const { send } = require("../client");
const t = require("../copy.json");
const rooms = require("../controllers/messages/rooms");
const seller = require("../controllers/messages/users/seller");

function chatting(recipient, message) {
  const { listingId, to, roomId } = getContext(recipient.id).data;
  return rooms.sendMessage(listingId, roomId, recipient.id, to, message.text);
}

function faqSetup(recipient, message) {
  const { data, listingId } = getContext(recipient.id);
  // if the user is currently setting up their FAQ
  const answeredQuestions = data.questions;
  setContext(recipient.id, state.FAQ_SETUP, {
    ...data,
    questions: answeredQuestions + 1
  });

  // 1. Price
  const price = parseInt(message.text);
  if (isNaN(price)) {
    return send.text(
      recipient,
      "Oops, I don't understand that. Please type in a number."
    );
  }
  const listingRef = db.ref(`listings/${listingId}`);
  listingRef.once("value", snapshot => {
    const listing = snapshot.val();
    const faq = listing ? listing.faq : [];

    faq.push(message.text);
    listingRef.set({ ...listing, faq, price });
  });

  if (answeredQuestions < t.faq.questions.length) {
    // if the user hasn't answered all the questions
    const currentQuestion = t.faq.questions[answeredQuestions];
    return send.text(recipient, currentQuestion);
  } else {
    // if the user has answered all the questions
    setContext(recipient.id, state.FAQ_DONE, { ...data });
    return seller.promptStart(recipient, `${t.faq.finish} ${t.general.next}`);
  }
}

module.exports = { chatting, faqSetup };
