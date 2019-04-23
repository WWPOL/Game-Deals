// Initialize Firebase
var config = {
    apiKey: "AIzaSyCmE__wXbMOsoM4_xey2a__Ikc589_jWCg",
    authDomain: "ollyg-game-deals.firebaseapp.com",
    databaseURL: "https://ollyg-game-deals.firebaseio.com",
    projectId: "ollyg-game-deals",
    storageBucket: "ollyg-game-deals.appspot.com",
    messagingSenderId: "887268788986"
};
firebase.initializeApp(config);

const messaging = firebase.messaging();

// Get FCM registration token
var fcmToken = null;

// Elements
var subscribeButton = document.getElementById("subscribe-button");

// Game Deals API
function apiSubscribe() {
    // Check fcmToken exists
    if (fcmToken === null) {
	return Promise.reject("fcmToken not set");
    }
    
    return fetch("/api/v0/subscriptions", {
	method: "POST",
	body: JSON.stringify({
	    "subscription": {
		"registration_token": fcmToken
	    }
	})
    }).then(function(res) {
	body = res.json();
	
	if (!res.ok) {
	    return Promise.reject(body.error)
	}

	return Promise.resolve();
    });
}

// Events
subscribeButton.onclick = function() {
    // Get Notfication permissions
    messaging.requestPermission()
	.then(function() {
	    console.log("got notification permissions");
	    return Promise.resolve();
	}).catch(function(err) {
	    console.error("failed to get notification permissions", err);
	}).then(function() { // Get FCM registration token
	    return messaging.getToken();
	}).then(function(token) {
	    fcmToken = token;
	    return Promise.resolve();
	}).catch(function(err) {
	    console.error("failed to get messaging token", err);
	}).then(function() { // Register subscription with API
	    return apiSubscribe();
	}).catch(function(err) {
	    console.error("failed to subscribe via API", err);
	}).then(function() {
	    console.log("subscribed");
	});
};
