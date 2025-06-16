<template>
  <router-view></router-view>
</template>

<script>
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebass/configration";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default {
  name: "App",
  data() {
    return {
      currentUser: null,
      incomingCallData: null,
    };
  },
  methods: {
    // কল ডিটেকশনের জন্য
    listenForIncomingCalls(userId) {
      const callDocRef = doc(db, "calls", userId); // এখানে userId = callDocId

      onSnapshot(callDocRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // শুধুমাত্র অফার এলে এবং আগের কোনো pending কল না থাকলে
          if (data.offer && !this.incomingCallData) {
            this.incomingCallData = data;
            this.showIncomingCallNotification(userId, data);
          }
        }
      });
    },

    // ইনকামিং কলের জন্য নোটিফিকেশন/কনফার্ম
    showIncomingCallNotification(callDocId) {
      const accept = confirm("📞 Incoming call! Would you like to accept?");
      if (accept) {
        this.$router.push({ name: "vdiocallans", params: { id :callDocId } });
      } else {

        console.log("❌ Call declined");
      }
    }
  },

  mounted() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.currentUser = user;
        this.listenForIncomingCalls(user.uid); // কলের জন্য এই ইউজার কে লক্ষ্য করা হবে
      }
    });
  }
};
</script>
