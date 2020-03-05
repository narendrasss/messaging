function postbacksController(client) {
  return function handlePostback(event_type, sender_info, webhook_event) {
    const { postback } = webhook_event;
    const recipient = { id: sender_info.value };
    switch (postback.payload) {
      case "get-started":
        client.getUserProfile(recipient.id, ["first_name"]).then(profile => {
          const text = `Hi ${profile.first_name}, how can I help you today?`;
          const replies = [
            {
              content_type: "text",
              title: "Sell item",
              payload: "sell-item"
            },
            {
              content_type: "text",
              title: "Buy item",
              payload: "buy-item"
            }
          ];
          client.sendQuickReplies(recipient, replies, text);
        });
        break;
      default:
        break;
    }
  };
}

module.exports = postbacksController;
