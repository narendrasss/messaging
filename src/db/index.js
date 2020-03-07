const firebase = require("firebase-admin");

firebase.initializeApp({
  credential: firebase.credential.applicationDefault(),
  databaseURL: process.env.DB_URL
});

module.exports = {
  db: firebase.database()
};
