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
      remoteDescriptionSet: false,
      pendingCandidates: [],
      user: null,
      callDocId: null,

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
        // ✅ Stop local media tracks
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
        }

        // ✅ Close peer connection if exists
        if (this.pc) {
          this.pc.close();
          this.pc = null;
        }

        // ✅ Clear video element sources
        if (this.$refs.remoteVideo) {
          this.$refs.remoteVideo.srcObject = null;
        }

        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = null;
        }

        // ✅ Delete the call document from Firestore
        if (this.callDocId) {
          const callDocRef = doc(db, "calls", this.callDocId);
          await deleteDoc(callDocRef);
          console.log("📂 Firestore call document deleted.");
        } else {
          console.warn("⚠️ No callDocId found. Skipping Firestore delete.");
        }

        // ✅ Navigate back
        this.$router.go(-1);
        console.log("📞 Call ended successfully.");

      } catch (error) {
        console.error("❌ Error ending call:", error);
      }
    },




    async startCall() {
      // Step 1: Get caller and receiver UIDs
      const senderUid = this.user.uid;
      const receiverUid = this.$route.params.id;

      // Step 2: Generate unique Firestore call document ID (sorted)
      this.callDocId = [senderUid, receiverUid].sort().join("_");

      // Step 3: Create new RTCPeerConnection instance
      this.pc = new RTCPeerConnection();

      // Step 4: Get local media stream (camera + mic)
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.$refs.localVideo.srcObject = this.localStream;
      } catch (error) {
        alert("Cannot access camera and microphone: " + error.message);
        console.error("Media Error:", error);
        return;
      }

      // Step 5: Prepare remote stream for incoming tracks
      this.remoteStream = new MediaStream();
      this.$refs.remoteVideo.srcObject = this.remoteStream;

      // Step 6: Add all local tracks to the peer connection
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // Step 7: When remote tracks arrive, add them to remoteStream
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      // Step 8: Setup Firestore document references
      const callDocRef = doc(db, "calls", this.callDocId);

      // Create or overwrite the call document with metadata (sender, receiver, timestamp)
      await setDoc(callDocRef, {
        sender: senderUid,
        receiver: receiverUid,
        createdAt: Date.now(),
      });

      const offerCandidatesRef = collection(callDocRef, "offerCandidates");
      const answerCandidatesRef = collection(callDocRef, "answerCandidates");

      // Step 9: On ICE candidate event, add candidate to Firestore
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await addDoc(offerCandidatesRef, event.candidate.toJSON());
          } catch (error) {
            console.error("Error adding ICE candidate: ", error);
          }
        }
      };

      // Step 10: Create WebRTC offer and set as local description
      const offerDescription = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerDescription);

      // Step 11: Save offer SDP to Firestore
      const offer = {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      };
      await setDoc(callDocRef, { offer }, { merge: true });

      // Step 12: Listen for answer SDP from remote peer, then set as remote description
      onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (
            data?.answer &&
            !this.pc.currentRemoteDescription
        ) {
          const answerDescription = new RTCSessionDescription(data.answer);
          this.pc.setRemoteDescription(answerDescription);
        }
      });

      // Step 13: Listen for remote ICE candidates (from answerer) and add them
      onSnapshot(answerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            try {
              if (
                  this.pc.remoteDescription &&
                  this.pc.remoteDescription.type !== null
              ) {
                await this.pc.addIceCandidate(candidate);
              } else {
                // If remoteDescription not set yet, keep retrying
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
            } catch (error) {
              console.error("Error adding remote ICE candidate:", error);
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

        // Start call only after user is ready
        this.startCall();


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