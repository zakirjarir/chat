<template>
  <div style="display: none;"></div>
</template>

<script>
// import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
// import {and, collection, doc, onSnapshot, or, orderBy, query, where} from "firebase/firestore";
// import { auth, db } from "../firebass/configration";
//
// export default {
//   name: "CallListener",
//   data() {
//     return {
//       user: {},
//       remoteDescriptionSet: false,
//     };
//   },
//   mounted() {
//     // const _this = this;
//     onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         this.user = user;
//         // const currentUid = user.uid;
//         const callDocRef = doc(db, "calls", "video-call-room");
//         const q = query(
//             collection(db, "calls"),
//             or(
//                 and(
//                     where("sender", "==", user.uid),
//                     where("reciever", "==", this.toUid)
//                 ),
//                 and(
//                     where("sender", "==", this.toUid),
//                     where("reciever", "==", user.uid)
//                 )
//             ),
//             orderBy("createdAt")
//         );
//         onSnapshot(, async (snapshot) => {
//           this.messages = snapshot.docs.map(doc => ({
//             ...doc.data(),
//             id: doc.id,
//           }));
//         onSnapshot(callDocRef, (docSnapshot) => {
//           if (docSnapshot.exists()) {
//             const data = docSnapshot.data();
//             console.log("📦 Data:", data);
//           } else {
//             console.warn("⚠️ Document doesn't exist!");
//           }
//         });
//
//         // onSnapshot(callDocRef, (docSnapshot) => {
//         //   // if (docSnapshot.exists()) {
//         //   //   const data = docSnapshot.data();
//         //   //   console.log(data);
//         //   //   if (
//         //   //       data.offer &&
//         //   //       !this.remoteDescriptionSet &&
//         //   //       data.offer.receiver === currentUid
//         //   //   ) {
//         //   //     _this.showNotification(
//         //   //         "📞 Incoming call from " + data.offer.sender,
//         //   //         {
//         //   //           body: "Do you want to answer the call?",
//         //   //           icon: "https://cdn-icons-png.flaticon.com/512/5978/5978995.png",
//         //   //         }
//         //   //     );
//         //   //
//         //   //     if (
//         //   //         confirm(
//         //   //             "📞 Incoming call...\nDo you want to receive?"
//         //   //         )
//         //   //     ) {
//         //   //       this.answerCall();
//         //   //     }
//         //   //   }
//         //   // }
//         // });
//       } else {
//         try {
//           await signInAnonymously(auth);
//           console.log("✅ Signed in anonymously.");
//         } catch (error) {
//           console.error("❌ Anonymous Sign In Error:", error);
//         }
//       }
//     });
//   }
// };
</script>
