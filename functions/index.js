const functions = require("firebase-functions");

// TODO: Subscribe and unsubscribe users to / from topics instead of using firestore

exports.subscribe = functions.https.onCall((data, context) => {
  const fcmId = context.instanceIdToken;

  return firestore.collection("subscriptions").doc(fcmId).set({
    subscribed: true,
  }).then(() => {
    return Promise.resolve({});
  }).catch((err) => {
    console.error("Failed to set subscription", err);
    
    return Promise.resolve({
      userError: "Failed to record subscription",
      internalError: err,
    });
  });
});

exports.unsubscribe = functions.https.onCall((data, context) => {
  const fcmId = context.instanceIdToken;

  return firestore.collection("subscriptions").doc(fcmId).delete().then(() => {
      return Promise.resolve({});
  }).catch((err) => {
    console.error("Failed to delete subscription", err);

    return Promise.resolve({
      userError: "Failed to delete subscription",
      internalError: err,
    });
  });
});
