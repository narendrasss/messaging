const { getContext, setContext, state } = require("../state/context");
const { send, getUserProfile } = require("../client");
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

async function offerSeller(recipient, message, listing) {
  const price = parseInt(message.text);
  if (isNaN(price)) {
    return send.text(
      recipient,
      "Oops, I don't understand that. Please type in a number."
    );
  }

  const { first_name } = await getUserProfile(recipient, ["first_name"]);
  const { seller, title } = listing;
  setContext(recipient.id, state.WAIT, listing);
  setContext(seller, "offer", { listing, buyer: recipient.id });
  await send.quickReplies(
    { id: seller },
    [
      {
        content_type: "text",
        title: "Accept offer",
        payload: "accept-buyer-offer"
      },
      {
        content_type: "text",
        title: "Counter offer",
        payload: "counter-buyer-offer"
      },
      {
        content_type: "text",
        title: "Decline offer",
        payload: "decline-buyer-offer"
      },
      {
        content_type: "text",
        title: "Put on hold",
        payload: "hold"
      }
    ],
    `${first_name} offered ${price} for your item, ${title}.`
  );
  return send.text(recipient, "Thanks, I've notified the seller.");
}

async function offerBuyer(recipient, message, data) {
  const price = parseInt(message.text);
  if (isNaN(price)) {
    return send.text(
      recipient,
      "Oops, I don't understand that. Please type in a number."
    );
  }
  const { listing, buyer } = data;
  const { title } = listing;
  setContext(recipient.id, state.WAIT, listing);
  setContext(buyer, "offer", listing);
  await send.quickReplies(
    { id: buyer },
    [
      {
        content_type: "text",
        title: "Accept offer",
        payload: "accept-seller-offer"
      },
      {
        content_type: "text",
        title: "Decline offer",
        payload: "decline-seller-offer"
      }
    ],
    `The seller of ${title} offered ${price}.`
  );
  return send.text(recipient, "Thanks, I've send the buyer the offer.");
}

module.exports = { chatting, faqSetup, offerSeller, offerBuyer };
