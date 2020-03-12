const Messenger = require("messenger-node");
require("dotenv").config();

const messagesController = require("./controllers/messages");
const postbacksController = require("./controllers/postbacks");
const { client } = require("./client");

const Webhook = new Messenger.Webhook({
  verify_token: process.env.VERIFY_TOKEN
});

Webhook.on("messages", messagesController(client));
Webhook.on("messaging_postbacks", postbacksController(client));
