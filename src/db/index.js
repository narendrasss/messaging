const firebase = require("firebase-admin");

const key = process.env.FIREBASE_PRIVATE_KEY;

firebase.initializeApp({
  credential: firebase.credential.cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: key.replace(/\\n/g, "\n"),
    projectId: process.env.FIREBASE_PROJECT_ID
  }),
  databaseURL: process.env.FIREBASE_DB_URL
});

module.exports = {
  db: firebase.database()
};
