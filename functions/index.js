/**
 * If an error occurs functions return with a non-200 code and the keys:userError
 * and internalError.
 */

const functions = require("firebase-functions");
//const firestore = require("firebase/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
const messagingAdmin = admin.messaging();

const topic = "deals";

/**
 * Subscribe a client to the deals FCM topic.
 */
exports.subscribe = functions.https.onCall((data, context) => {
  const fcmToken = context.instanceIdToken;

  return messagingAdmin.subscribeToTopic([fcmToken], topic).then((resp) => {
    return Promise.resolve({});
  }).catch((error) => {
    throw new HttpsError("internal", "Failed to subscribe", {
      userError: "Failed to subscribe",
      internalError: error,
    });
  });
});

exports.unsubscribe = functions.https.onCall((data, context) => {
  const fcmToken = context.instanceIdToken;

  return messagingAdmin.unsubscribeFromTopic([fcmToken], topic).then((resp) => {
    return Promise.resolve({});
  }).catch((error) => {
    throw new HttpsError("internal", "Failed to unsubscribe", {
      userError: "Failed to unsubscribe",
      internalError: error,
    });
  });
});

exports.notify = functions.https.onCall((data, context) => {
  // Determine if admin
  const uid = context.auth.uid;

  if (uid === null) {
    throw new HttpsError("unauthenticated", "Not logged in", {
      userError: "Not logged in",
      internalError: "No user ID",
    });
  }

  /*
  return firestore.document("/admins/" + uid).exists().then((res) => {
    console.log("notify, res=", res);
    return Promise.resolve({});
  }).catch((err) => {
    return Promise.resolve({
      userError: "Failed authenticate",
      internalError: err,
    });
  });
  */
  return {};
});
