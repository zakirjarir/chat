const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json"); // JSON key from Firebase

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

function listAllUsers(nextPageToken) {
    admin
        .auth()
        .listUsers(1000, nextPageToken)
        .then((listUsersResult) => {
            listUsersResult.users.forEach((userRecord) => {
                console.log("User:", userRecord.toJSON());
            });

            if (listUsersResult.pageToken) {
                listAllUsers(listUsersResult.pageToken); // Recursive call
            }

        })
        .catch((error) => {
            console.log("Error listing users:", error);
        });
    return "Users listed successfully";
};

