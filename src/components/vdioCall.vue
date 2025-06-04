<template>

  <div>
    <div v-if="user" class="container">
      <video ref="remoteVideo" autoplay playsinline muted class="remote-video"></video>
      <video ref="localVideo" autoplay playsinline muted class="local-video"></video>

      <div class="controls d-flex justify-content-center gap-3 mt-3">
        <button class="btn btn-outline-info d-flex align-items-center btn-sm gap-2" @click="startCall">
          <i class="bi bi-telephone"></i> Call
        </button>
        <button class="btn btn-success d-flex align-items-center btn-sm gap-2" @click="answerCall">
          <i class="bi bi-check-circle"></i> Recive
        </button>
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
  onSnapshot
} from "firebase/firestore";
import { db} from "@/firebass/configration";
import {getAuth} from "firebase/auth";


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
        const callDocRef = doc(db, "calls", this.callDocId);
        await setDoc(callDocRef, {}); // অথবা deleteDoc(callDocRef) যদি ফায়ারস্টোর থেকে পুরো ডাটা মুছতে চাও

        this.$router.push("/chat");
        console.log("Call ended.");
      } catch (error) {
        console.error("Error ending call:", error);
      }
    },
    async startCall() {
      this.pc = new RTCPeerConnection();

      // Local Stream with error handling
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

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // When remote track arrives, add to remoteStream
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      // Firestore refs
      const callDocRef = doc(db, "calls", this.callDocId);
      const offerCandidatesRef = collection(callDocRef, "offerCandidates");
      const answerCandidatesRef = collection(callDocRef, "answerCandidates");

      // ICE candidate - send to offerCandidates collection
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCandidatesRef, event.candidate.toJSON());
        }
      };

      // Create offer
      const offerDescription = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerDescription);

      const offer = {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      };

      await setDoc(callDocRef, { offer });

      // Listen for answer
      onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (!this.pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          this.pc.setRemoteDescription(answerDescription);
        }
      });

      // Listen for answer ICE candidates
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
              // অপেক্ষা করো যতক্ষণ remoteDescription সেট হয়
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

      // Local Stream with error handling
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

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });

      // When remote track arrives, add to remoteStream
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      // Firestore refs
      const callDocRef = doc(db, "calls", this.callDocId);
      const offerCandidatesRef = collection(callDocRef, "offerCandidates");
      const answerCandidatesRef = collection(callDocRef, "answerCandidates");

      // ICE candidate - answerer sends to answerCandidates collection
      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidatesRef, event.candidate.toJSON());
        }
      };

      // Get call data (offer)
      const callDoc = await getDoc(callDocRef);
      if (!callDoc.exists()) {
        alert("Call not found!");
        return;
      }

      const offerDescription = callDoc.data().offer;
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
      this.remoteDescriptionSet = true;

      // Create answer
      const answerDescription = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      // Update call doc with answer
      await setDoc(callDocRef, { answer }, { merge: true });

      // Add any ICE candidates that arrived before remoteDescription was set
      for (const candidate of this.pendingCandidates) {
        await this.pc.addIceCandidate(candidate);
      }
      this.pendingCandidates = [];

      // Listen for offer ICE candidates from caller
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
    this.user = auth.currentUser;

    if (!this.user) {
      this.signInAnonymously();
    }

    const callDocRef = doc(db, "calls", this.callDocId); // callDocId = "video-call-room"

    // Listen to changes
    onSnapshot(callDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        // ✅ যখন remote ইউজার offer পাঠায় (call দেয়)
        if (data.offer && !this.remoteDescriptionSet) {
          alert("📞 Incoming call..."); // এখানে তোকে UI show করতে হবে
          console.log("Incoming call detected:", data.offer);

          // Optional: Incoming call sound play করতে পারিস এখানে
          // const ring = new Audio('/ringtone.mp3');
          // ring.play();
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