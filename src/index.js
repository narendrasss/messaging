const Messenger = require("messenger-node");
require("dotenv").config();

const messagesController = require("./controllers/messages");
const postbacksController = require("./controllers/postbacks");

const Webhook = new Messenger.Webhook({
  verify_token: process.env.VERIFY_TOKEN
});

const Client = new Messenger.Client({
  page_token: process.env.PAGE_ACCESS_TOKEN
});

Webhook.on("messages", messagesController(Client));
Webhook.on("messaging_postbacks", postbacksController(Client));
