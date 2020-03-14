const { getContext, setContext, state } = require("../state/context");
const { send } = require("../client");
const t = require("../copy.json");
const rooms = require("../controllers/messages/rooms");
const listings = require("../db/listings");

function chatting(recipient, message) {
  const { to, roomId } = getContext(recipient.id).data;
  return rooms.sendMessage(roomId, recipient.id, to, message.text);
}

function faqSetup(recipient, message) {
  const { data } = getContext(recipient.id);
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
  listings.setSellerPrice(data.listingId, price);

  if (answeredQuestions < t.faq.questions.length) {
    // if the user hasn't answered all the questions
    const currentQuestion = t.faq.questions[answeredQuestions];
    return send.text(recipient, currentQuestion);
  } else {
    // if the user has answered all the questions
    setContext(recipient.id, state.FAQ_DONE, {
      ...data
    });
    return send.text(recipient, "Thanks! A FAQ has been set up.");
  }
}

module.exports = { chatting, faqSetup };
