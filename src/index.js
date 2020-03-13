const Messenger = require("messenger-node");
require("dotenv").config();

const messagesController = require("./controllers/messages");
const { client } = require("./client");

const Webhook = new Messenger.Webhook({
  verify_token: process.env.VERIFY_TOKEN
});

Webhook.on("messages", messagesController(client));
