const firebase = require("firebase-admin");

function init() {
  firebase.initializeApp({
    credential: firebase.credential.applicationDefault(),
    databaseURL: process.env.DB_URL
  });
  return firebase.database();
}

module.exports = {
  init
};
