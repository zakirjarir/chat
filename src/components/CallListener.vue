<template>
  <div style="display: none;"></div>
</template>

<script>
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebass/configration";

export default {
  name: "CallListener",
  data() {
    return {
      user: null,
      remoteDescriptionSet: false,
      callDocId: "video-call-room",
    };
  },
  methods: {
    showNotification(title, options) {
      if (Notification.permission === "granted") {
        new Notification(title, options);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, options);
          }
        });
      }
    },
    async answerCall() {
      // এখানে তোমার আসল answerCall এর logic বসাতে হবে
      alert("Answering call... implement the logic here.");
      this.remoteDescriptionSet = true; // Prevent multiple answer attempts
    }
  },
  mounted() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.user = user;
        const currentUid = user.uid;

        const callDocRef = doc(db, "calls", this.callDocId);

        onSnapshot(callDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();

            if (
                data.offer &&
                !this.remoteDescriptionSet &&
                data.offer.receiver === currentUid
            ) {
              this.showNotification(
                  "📞 Incoming call from " + data.offer.sender,
                  {
                    body: "Do you want to answer the call?",
                    icon: "https://cdn-icons-png.flaticon.com/512/5978/5978995.png",
                  }
              );

              if (
                  confirm(
                      "📞 Incoming call...\nDo you want to receive?"
                  )
              ) {
                this.answerCall();
              }
            }
          }
        });
      } else {
        try {
          await signInAnonymously(auth);
          console.log("✅ Signed in anonymously.");
        } catch (error) {
          console.error("❌ Anonymous Sign In Error:", error);
        }
      }
    });
  }
};
</script>
