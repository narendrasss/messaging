function postbacksController(client) {
  return function handlePostback(event_type, sender_info, webhook_event) {
    const { postback } = webhook_event;
    const recipient = { id: sender_info.value };
    if (postback.payload === "yes") {
      client.sendText(recipient, "Thanks!");
    } else if (postback.payload === "no") {
      client.sendText(recipient, "Oops, send me another picture.");
    }
  };
}

module.exports = postbacksController;
