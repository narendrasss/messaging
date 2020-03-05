function messagesController(client) {
  return function handleMessages(event_type, sender_info, webhook_event) {
    const { message } = webhook_event;
    const recipient = { id: sender_info.value };
    if (message.text) {
      client.sendText(recipient, webhook_event.message.text);
    } else if (message.attachments) {
      const { url } = message.attachments[0].payload;
      const template = {
        template_type: "generic",
        elements: [
          {
            title: "Is this the right picture?",
            subtitle: "Tap a button to answer.",
            image_url: url,
            buttons: [
              {
                type: "postback",
                title: "Yes!",
                payload: "yes"
              },
              {
                type: "postback",
                title: "No!",
                payload: "no"
              }
            ]
          }
        ]
      };
      client.sendTemplate(recipient, template);
    }
  };
}

module.exports = messagesController;
