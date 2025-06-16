<template>
  <div>
    <div v-if="user" class="container">
      <video ref="remoteVideo" style="transform: scaleX(-1);" autoplay playsinline class="remote-video"></video>
      <video ref="localVideo" v-if="cameraOn" style="transform: scaleX(-1);" autoplay playsinline muted class="local-video"></video>

      <!-- Timer -->
      <div class="position-absolute top-0 start-0 m-3 px-3 py-1 bg-dark text-white rounded" style="font-weight: bold; z-index: 9999;">
        {{ formattedDuration }}
      </div>

      <!-- Controls -->
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
  getAuth, onAuthStateChanged,
} from "firebase/auth";

export default {
  data() {
    return {
      user: null,
      timer: null,
      callDuration: 0,
      formattedDuration: "00:00",
      micOn: true,
      cameraOn: true,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      callDocId: this.$route.params.id,
      pendingCandidates: [],
      servers: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      },
    };
  },

  mounted() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.user = user;
        await this.joinCall();
      } else {
        await this.signInAnonymously();
      }
    });
  },
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
