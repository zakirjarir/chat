<template>

  <div>
    <div v-if="user" class="container">
      <video ref="remoteVideo" autoplay playsinline muted class="remote-video"></video>
      <video ref="localVideo" autoplay playsinline muted class="local-video"></video>

      <div class="controls d-flex justify-content-center gap-3 mt-3">
        <button class="btn btn-danger d-flex align-items-center btn-sm gap-2" @click="endCall">
          <i class="bi bi-telephone"></i> End
        </button>
      </div>
    </div>
    <button v-else @click="signInAnonymously" class="btn btn-outline-light">
      Login Anonymously
    </button>
  </div>
</template>

<script>
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import { db} from "@/firebass/configration";
import {getAuth, onAuthStateChanged ,signInAnonymously} from "firebase/auth";


export default {
  data() {
    return {
      pc: null,
      localStream: null,
      remoteStream: null,
      callDocId: "video-call-room",
      remoteDescriptionSet: false,
      pendingCandidates: [],
      user: null,
    };
  },
  methods: {
    async signInAnonymously() {
      try {
        this.$router.push('/')
      } catch (error) {
        console.error("Anonymous login error:", error);
      }
    },
    async endCall() {
      try {
        // Stop all tracks of local stream
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
        }

        // Close peer connection
        if (this.pc) {
          this.pc.close();
          this.pc = null;
        }

        // Remove video sources
        if (this.$refs.remoteVideo) {
          this.$refs.remoteVideo.srcObject = null;
        }
        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = null;
        }

        // Delete Firestore call document
        const callDocRef = doc(db, "calls", this.callDocId); // this.callDocId = "video-call-room"
        await deleteDoc(callDocRef); // ডকুমেন্ট পুরোপুরি মুছে ফেলবে

        this.$router.push("/chat");
        console.log("Call ended and document deleted.");
      } catch (error) {
        console.error("Error ending call:", error);
      }
    },
    async startCall() {
      // Sender (Caller) UID
      const senderUid = this.user.uid;
      const receiverUid = this.$route.params.id;

      // 🔑 Unique call doc ID
      this.callDocId = [senderUid, receiverUid].sort().join("_");

      this.pc = new RTCPeerConnection();

      // Local Stream
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.$refs.localVideo.srcObject = this.localStream;
      } catch (error) {
        alert("Cannot access camera and microphone: " + error.message);
        console.error(error);
        return;
      }

      this.remoteStream = new MediaStream();
      this.$refs.remoteVideo.srcObject = this.remoteStream;

      // Local Tracks
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // Remote Tracks
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      // Firestore references
      const callDocRef = doc(db, "calls", this.callDocId);
      const offerCandidatesRef = collection(callDocRef, "offerCandidates");
      const answerCandidatesRef = collection(callDocRef, "answerCandidates");

      // Send ICE candidates
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCandidatesRef, event.candidate.toJSON());
        }
      };

      // Create and send offer
      const offerDescription = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerDescription);

      const offer = {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
        sender: senderUid,
        receiver: receiverUid,
        timestamp: Date.now(),
      };

      await setDoc(callDocRef, {offer});

      // Listen for answer
      onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (!this.pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          this.pc.setRemoteDescription(answerDescription);
        }
      });

      // Listen for ICE candidates from answer side
      onSnapshot(answerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            if (
                this.pc.remoteDescription &&
                this.pc.remoteDescription.type !== null
            ) {
              await this.pc.addIceCandidate(candidate);
            } else {
              const interval = setInterval(async () => {
                if (
                    this.pc.remoteDescription &&
                    this.pc.remoteDescription.type !== null
                ) {
                  await this.pc.addIceCandidate(candidate);
                  clearInterval(interval);
                }
              }, 100);
            }
          }
        });
      });
    },

    async answerCall() {
      this.pc = new RTCPeerConnection();

      // Step 1: Get local media (camera + mic)
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.$refs.localVideo.srcObject = this.localStream;
      } catch (error) {
        alert("Cannot access camera and microphone: " + error.message);
        console.error(error);
        return;
      }

      // Step 2: Create empty remote stream and attach to video element
      this.remoteStream = new MediaStream();
      this.$refs.remoteVideo.srcObject = this.remoteStream;

      // Step 3: Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // Step 4: Receive remote track
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      // Step 5: Firestore references
      const callDocRef = doc(db, "calls", this.callDocId);
      const offerCandidatesRef = collection(callDocRef, "offerCandidates");
      const answerCandidatesRef = collection(callDocRef, "answerCandidates");

      // Step 6: Send ICE candidates to answerCandidates
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidatesRef, event.candidate.toJSON());
        }
      };

      // Step 7: Load offer and set remote description
      const callDoc = await getDoc(callDocRef);
      if (!callDoc.exists()) {
        alert("Call not found!");
        return;
      }

      const offerDescription = callDoc.data().offer;
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
      this.remoteDescriptionSet = true;

      // Step 8: Create and set answer
      const answerDescription = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      // Step 9: Send answer to Firestore
      await setDoc(callDocRef, {answer}, {merge: true});

      // Step 10: Buffer any candidates if needed
      if (!this.pendingCandidates) this.pendingCandidates = [];

      // Step 11: Listen for offer ICE candidates
      onSnapshot(offerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            if (this.remoteDescriptionSet) {
              await this.pc.addIceCandidate(candidate);
            } else {
              this.pendingCandidates.push(candidate);
            }
          }
        });
      });
    },
  },
  mounted() {
    const auth = getAuth();

    // 🔐 Wait until user is fully ready (async)
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.user = user;
        const currentUid = user.uid;

        // Start call only after user is ready
        this.startCall();

        const callDocRef = doc(db, "calls", this.callDocId);

        // 👂 Listen to changes in the call document
        onSnapshot(callDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();

            // 🛑 Check if it's an offer for current user
            if (data.offer && !this.remoteDescriptionSet && data.offer.receiver === currentUid) {
              // ✅ Show browser notification (assuming Notification permission granted)
              this.showNotification('📞 Incoming call from ' + data.offer.sender,
                  {
                    body: "Do you want to answer the call?",
                    icon: "https://cdn-icons-png.flaticon.com/512/5978/5978995.png", // optional
                  }
              );

              // ✅ Also show confirmation dialog
              if (confirm("📞 Incoming call...\nDo you want to receive?")) {
                this.answerCall(); // 🟢 Answer the call
              }
            }
          }
        });


      } else {
        // Anonymous login if no user
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
<style>
.container {
  position: relative;
  height: 100vh;
  background-color: #1f2937;
  color: white;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 130px;
  height: 200px;
  border: 4px solid #3b82f6;
  border-radius: 0.5rem;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
}

.controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1.5rem;
}

.btn {
  background-color: #3b82f6;
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  font-size: 1.125rem;
  cursor: pointer;
  border: none;
  color: white;
  transition: background-color 0.3s;
}




</style>