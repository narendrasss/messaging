const Messenger = require("messenger-node");
const firebase = require("firebase-admin");
require("dotenv").config();

const messagesController = require("./controllers/messages");
const postbacksController = require("./controllers/postbacks");

firebase.initializeApp({
  credential: firebase.credential.applicationDefault(),
  databaseURL: "https://fb-messenger-14e07.firebaseio.com"
});

const database = firebase.database();

/**
 * Example firebase usage:
 *  - `database.ref("listings")` means move to the listings object of the schema
 *  - `listings.set({})` means set the listings object to an empty object
 */
const listings = database.ref("listings");
listings.set({});

const Webhook = new Messenger.Webhook({
  verify_token: process.env.VERIFY_TOKEN
});

const Client = new Messenger.Client({
  page_token: process.env.PAGE_ACCESS_TOKEN
});

Client.setMessengerProfile({
  get_started: {
    payload: "get-started"
  }
});

Webhook.on("messages", messagesController(Client));
Webhook.on("messaging_postbacks", postbacksController(Client));
