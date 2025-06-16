<template>
  <div>
    <div v-if="user" class="container">
      <video ref="remoteVideo" style="transform: scaleX(-1);" autoplay playsinline class="remote-video"></video>
      <video v-if="cameraOn" ref="localVideo" style="transform: scaleX(-1);" autoplay playsinline muted class="local-video"></video>
      <div class="position-absolute top-0 start-0 m-3 px-3 py-1 bg-dark text-white rounded"
          style="font-weight: bold; z-index: 9999;">
        {{ formattedDuration }}
      </div>

      <div class="controls d-flex justify-content-center gap-3 mt-3">
        <button class="btn btn-danger d-flex align-items-center btn-sm gap-2" @click="endCall">
          <i class="bi bi-telephone"></i> End
        </button>

        <button class="btn btn-secondary d-flex align-items-center btn-sm gap-2" @click="toggleMic">
          <i :class="micOn ? 'bi bi-mic-fill' : 'bi bi-mic-mute-fill'"></i>
        </button>

        <button class="btn btn-secondary d-flex align-items-center btn-sm gap-2" @click="toggleCamera">
          <i :class="cameraOn ? 'bi bi-camera-video-fill' : 'bi bi-camera-video-off-fill'"></i>
        </button>
      </div>
    </div>

    <router-link v-else to="/" class="btn btn-outline-light">
      Login Anonymously
    </router-link>
  </div>
</template>

<script>
import {
  doc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebass/configration";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously as fbSignInAnonymously,
} from "firebase/auth";

export default {
  data() {
    return {
      timer: null,
      callDuration: 0, // in seconds
      formattedDuration: "00:00",
      micOn: true,
      cameraOn: true,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      user: null,
      callDocId: this.$route.params.id,
      pendingCandidates: [],
      servers: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      },
    };
  },
  methods: {
    async signInAnonymously() {
      try {
        const auth = getAuth();
        await fbSignInAnonymously(auth);
      } catch (error) {
        console.error("Anonymous login error:", error);
      }
    },

    startTimer() {
      this.callDuration = 0;
      this.updateFormattedDuration();
      this.timer = setInterval(() => {
        this.callDuration++;
        this.updateFormattedDuration();
      }, 1000);
    },

    stopTimer() {
      clearInterval(this.timer);
      this.timer = null;
    },

    updateFormattedDuration() {
      const minutes = String(Math.floor(this.callDuration / 60)).padStart(2, "0");
      const seconds = String(this.callDuration % 60).padStart(2, "0");
      this.formattedDuration = `${minutes}:${seconds}`;
    },

    toggleMic() {
      this.micOn = !this.micOn;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = this.micOn;
        });
      }
    },

    toggleCamera() {
      this.cameraOn = !this.cameraOn;
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach((track) => {
          track.enabled = this.cameraOn;
        });
      }
    },

    async startCall() {
      console.log(this.user.uid);
      const callDoc = doc(db, "calls", this.callDocId);

      const offerCandidates = collection(callDoc, "offerCandidates");
      const answerCandidates = collection(callDoc, "answerCandidates");

      // Get user media with quality and audio constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      this.remoteStream = new MediaStream();
      this.$refs.localVideo.srcObject = this.localStream;
      this.$refs.remoteVideo.srcObject = this.remoteStream;

      this.peerConnection = new RTCPeerConnection(this.servers);

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Optional: Set bitrate limit for video (1.5 Mbps)
      this.peerConnection.getSenders().forEach((sender) => {
        if (sender.track.kind === "video") {
          const parameters = sender.getParameters();
          if (!parameters.encodings) parameters.encodings = [{}];
          parameters.encodings[0].maxBitrate = 1500 * 1000; // 1.5 Mbps
          sender.setParameters(parameters);
        }
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          this.remoteStream.addTrack(track);
        });
      };

      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCandidates, event.candidate.toJSON());
        }
      };

      // Create and send offer
      const offerDescription = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offerDescription);
      await setDoc(callDoc, {
        offer: {
          type: offerDescription.type,
          sdp: offerDescription.sdp,
          createdAt: serverTimestamp(),
        }
      });

      // Listen for answer
      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (
            data?.answer &&
            this.peerConnection &&
            !this.peerConnection.currentRemoteDescription
        ) {
          const answerDescription = new RTCSessionDescription(data.answer);
          this.peerConnection
              .setRemoteDescription(answerDescription)
              .then(async () => {
                for (const candidate of this.pendingCandidates) {
                  await this.peerConnection.addIceCandidate(candidate);
                }
                this.pendingCandidates = [];
                this.startTimer();
              })
              .catch((e) => {
                console.error("Error setting remote description:", e);
              });
        }
      });

      // Listen for answer candidates
      onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            if (
                this.peerConnection &&
                this.peerConnection.currentRemoteDescription
            ) {
              this.peerConnection.addIceCandidate(candidate).catch((e) => {
                console.error("Error adding ICE candidate:", e);
              });
            } else {
              this.pendingCandidates.push(candidate);
            }
          }
        });
      });
    },
    async endCall() {
      try {
        if (this.localStream) {
          this.localStream.getTracks().forEach((track) => track.stop());
          this.localStream = null;
        }

        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }

        if (this.$refs.remoteVideo) this.$refs.remoteVideo.srcObject = null;
        if (this.$refs.localVideo) this.$refs.localVideo.srcObject = null;

        if (this.callDocId) {
          const callDocRef = doc(db, "calls", this.callDocId);
          await deleteDoc(callDocRef);
          console.log("📂 Firestore call document deleted.");
        }
        this.stopTimer();

        this.$router.go(-1);
      } catch (error) {
        console.error("❌ Error ending call:", error);
      }
    },
  },

  mounted() {
    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.user = user;
        await this.startCall();
      } else {
        try {
          await this.signInAnonymously();
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
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
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
video {
  image-rendering: auto;
  filter: contrast(1.05) brightness(1.1);
}

</style>
