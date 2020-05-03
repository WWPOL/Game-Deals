const url = require("url");
const appIcon = "https://oliversgame.deals/icons/icon-192x192.png";

// Setup Firebase SDK
const functions = require("firebase-functions");
const admin = require("firebase-admin");

let emulated = process.env.FIREBASE_EMULATED === "true";

if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
  var serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp();
}

const topic = emulated === true ? "deals-dev" : "deals";

/**
 * Subscribe a client to the deals FCM topic.
 * Uses the request context to know the user's FCM token.
 */
exports.subscribe = functions.https.onCall((data, context) => {
  const fcmToken = context.instanceIdToken;

  return admin.messaging().subscribeToTopic(fcmToken, topic)
    .then((resp) => {
      return Promise.resolve({});
    }).catch((error) => {
      console.error("Failed to subscribe client", error);
      throw new functions.https.HttpsError("internal", "Failed to subscribe");
    });
});

/**
 * Unsubscribe a client from the deals FCM topic.
 * Uses the request context to know the user's FCM token.
 */
exports.unsubscribe = functions.https.onCall((data, context) => {
  const fcmToken = context.instanceIdToken;

  return admin.messaging().unsubscribeFromTopic(fcmToken, topic)
    .then((resp) => {
      return Promise.resolve({});
    }).catch((error) => {
      console.error("Failed to unsubscribe client", error);
      throw new functions.https.HttpsError("internal", "Failed to unsubscribe");
    });
});

/**
 * Send a notification about a new game deal to clients subscribed to the 
 * deals topic.
 * Data must be { dealId: string, confirmResend: bool }, where dealId is the ID of 
 * the deals document and confirmResend is set to true if you want to send a 
 * notification for a deal which has already had a notification sent, this key
 * is optional.
 */
exports.notify = functions.https.onCall((data, context) => {
  // Determine if admin
  const uid = context.auth.uid;

  if (uid === null) {
    throw new functions.https.HttpsError("unauthenticated", "Not logged in");
  }

  // Get deal from database
  const dealId = data.dealId;
  const confirmResend = data.confirmResend || false;
  
  admin.firestore().collection("deals").doc(dealId).get().catch((error) => {
    console.error("Failed to get deal to send notification for", error);
    throw new functions.https.HttpsError("internal",
                                         "Failed to retrieve deal");
  }).then((deal) => {
    if (deal.notificationSent === true && confirmResend === false) {
      throw new functions.https.HttpsError("already-exists",
                                           "Notification already sent for " +
                                           "this deal")
    }
    
    const dealLink = url.parse(deal.link);
    const dealPrice = deal.isFree === true ? "free" : deal.price;

    return admin.messaging().sendToTopic(topic, {
      notification: {
        title: `Deal on ${deal.name} (${dealPrice})`,
        body: `${deal.name} is now available at ${dealLink.hostname} for ${dealPrice}`,
        icon: appIcon,
        image: deal.image,
      },
    }, {
      collapseKey: "new-deal",
    });
  }).then(() => {
    return Promise.resolve({});
  }).catch((error) => {
    console.error("Failed to send notification message", error);
    throw new functions.https.HttpsError("internal",
                                         "Failed to send notification message");
  });
});

// !!!FOR LOCAL DEVELOPMENT USE ONLY!!!
// If firebase is being emulated expose some development utility functions
if (emulated === true) {
  /**
   * Makes the current user an admin. Useful for setting up the local database with
   * the correct admin users.
   * Data must be the user's ID (uid).
   */
  exports.devMakeUserAdmin = functions.https.onCall((data, context) => {
    return admin.firestore().collection("admins").doc(data).set({
      admin: true,
    }).catch((error) => {
      throw new functions.https.HttpsError("internal",
                                           "Failed to make user " + data +
                                           " an admin: " + error);
    });
  });

  /**
   * Removes admin status from the current user. Useful for testing how pages will
   * behave for non-admin users.
   * Data must be the user's ID (uid).
   */
  exports.devRemoveUserAdmin = functions.https.onCall((data, context) => {
    return admin.firestore().collection("admins").doc(data).delete()
      .catch((error) => {
        throw new functions.https.HttpsError("internal",
                                             "Failed to remove admin" +
                                             "priviledges from user " + data +
                                             ": " + error);
      });
  });
}
