const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
require("dotenv").config();

const PORT = process.env.PORT || 9000;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const app = express().use(bodyParser.json());

app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "HELLO";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Verified webhook");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

app.post("/webhook", (req, res) => {
  const { body } = req;
  if (body.object === "page") {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      const senderId = webhookEvent.sender.id;
      console.log("Sender PSID: " + senderId);

      if (webhookEvent.message) {
        handleMessage(senderId, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderId, webhookEvent.postback);
      }
    });
    res.status(200).send("Event received");
  } else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

function handleMessage(senderId, receivedMessage) {
  let response;
  if (receivedMessage.text) {
    response = {
      text: `You said: ${receivedMessage.text}`
    };
  } else if (receivedMessage.attachments) {
    const url = receivedMessage.attachments[0].payload.url;
    response = {
      attachment: {
        type: "template",
        payload: {
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
        }
      }
    };
  }
  sendMessage(senderId, response);
}

function handlePostback(senderId, receivedPostback) {
  let response;
  const { payload } = receivedPostback;
  if (payload === "yes") {
    response = { text: "Thanks!" };
  } else if (payload === "no") {
    response = { text: "Oops, send me another image." };
  }
  sendMessage(senderId, response);
}

function sendMessage(senderId, response) {
  const body = {
    recipient: {
      id: senderId
    },
    message: response
  };
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: body
    },
    err => {
      if (err) {
        console.error(`Unable to send message: ${err}`);
      } else {
        console.log("Successfuly sent message");
      }
    }
  );
}
