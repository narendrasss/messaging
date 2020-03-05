const Messenger = require("messenger-node");
require("dotenv").config();

const Webhook = new Messenger.Webhook({
  verify_token: process.env.VERIFY_TOKEN
});

const Client = new Messenger.Client({
  page_token: process.env.PAGE_ACCESS_TOKEN
});

Webhook.on("messages", (_, sender_info, webhook_event) => {
  const { message } = webhook_event;
  const recipient = { id: sender_info.value };
  if (message.text) {
    Client.sendText(recipient, webhook_event.message.text);
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
    Client.sendTemplate(recipient, template);
  }
});

Webhook.on("messaging_postbacks", (_, sender_info, webhook_event) => {
  const { postback } = webhook_event;
  const recipient = { id: sender_info.value };
  if (postback.payload === "yes") {
    Client.sendText(recipient, "Thanks!");
  } else if (postback.payload === "no") {
    Client.sendText(recipient, "Oops, send me another picture.");
  }
});
