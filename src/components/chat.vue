<template>
  <div class="container-fluid p-0">
    <div class="row g-0">
      <!-- Chat Area -->
      <div class="col-12 col-md-9 d-flex flex-column">
        <!-- Header -->
        <div class="bg-primary py-1 px-2 shadow-sm d-flex sticky-top justify-content-between align-items-center">
          <h5 class="mb-0 text-white text-center fw-bold flex-grow-1">Z CHAT</h5>
          <!-- User Dropdown -->
          <div v-if="user" class="dropdown">
            <button class="btn btn-primary dropdown-toggle d-flex align-items-center justify-content-center border-0" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-person-circle fs-4 text-white"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
              <li>
                <button class="dropdown-item text-danger" @click="logout">
                  <i class="bi bi-box-arrow-right me-2"></i> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Chat Body -->
        <div v-if="user" ref="chatContainer" class="flex-grow-1 p-3 overflow-auto" style="height: 88vh" >
          <div v-for="msg in messages" :key="msg.id" :class="msg.sender === user.uid ? 'text-end' : 'text-start'" class="mb-2">
            <span class="p-2 rounded shadow-sm d-inline-block" :class="msg.sender === user.uid ? 'bg-primary text-white' : 'bg-light text-dark'" style="max-width: 70%; word-wrap: break-word;">
              <template v-if="isValidUrl(msg.text)">
                <a :href="msg.text" target="_blank" class="text-decoration-underline">
                  {{ msg.text }}
                </a>
              </template>
              <template v-else>
                {{ msg.text }}
              </template>
            </span>
          </div>
        </div>
        <!-- Anonymous Login -->
        <div v-else class="text-center my-auto">
          <button @click="signInAnonymously" class="btn btn-outline-light">
            Login Anonymously
          </button>
        </div>
      </div>
    </div>
    <footer class="sticky-bottom border-top bg-dark">
      <div v-if="user" class="p-3">
        <div class="d-flex align-items-end">

          <!-- Textarea -->
          <textarea v-model="newMessage" @keyup.enter.prevent="sendMessage" class=" me-2 message-input" placeholder="Type your message..." rows="1"></textarea>

          <!-- Send Button -->
          <button class="btn btn-primary send-btn d-flex align-items-center justify-content-center" @click="sendMessage">
            <i class="bi bi-send fs-5"></i>
          </button>
        </div>
      </div>
    </footer>

  </div>
</template>

<script>
import { db, auth } from "../firebass/configration";
import {collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,} from "firebase/firestore";
import {onAuthStateChanged, signOut, signInAnonymously as firebaseSignInAnonymously,} from "firebase/auth";
import { nextTick } from "vue";

export default {
  name: "ChatApp",
  data() {
    return {
      user: null,
      newMessage: "",
      messages: [],
    };
  },
  methods: {
    async signInAnonymously() {
      try {
        this.$router.push('/')
        const userCredential = await firebaseSignInAnonymously(auth);
        this.user = userCredential.user;
      } catch (error) {
        console.error("Anonymous login error:", error);
      }
    },
    async sendMessage() {
      if (this.newMessage.trim() === "") return;
      if (!this.user || !this.user.uid) {
        alert("User not authenticated!");
        return;
      }
      try {
        await addDoc(collection(db, "messages"), {
          text: this.newMessage,
          sender: this.user.uid,
          uid: this.user.uid,
          createdAt: serverTimestamp(),
        });
        this.newMessage = "";
      } catch (err) {
        alert("Message sending failed: " + err.message);
      }
    },

    logout() {
      const confirmLogout = confirm("Are you sure you want to logout?");
      if (!confirmLogout) return;
      signOut(auth)
          .then(() => {
            this.user = null;
            this.$router.push("/");
          })
          .catch((error) => {
            alert("Logout failed: " + error.message);
          });
    },

    scrollToBottom() {
      const container = this.$refs.chatContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    isValidUrl(str) {
      try {
        new URL(str);
        return true;
      } catch (_) {
        return false;
      }
    },
  },

  mounted() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });

    const q = query(collection(db, "messages"), orderBy("createdAt"));
    onSnapshot(q, async (snapshot) => {
      this.messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      await nextTick();
      this.scrollToBottom();
    });
  },
};
</script>

<style scoped>
.message-input {
  border-radius: 10px;
  padding: 10px 15px;
  background-color: #131313;
  font-size: 15px;
  border: 1px solid #ccc;
  width: 95%;
  height: 60px;
  transition: all 0.2s ease-in-out;
}

.message-input:focus {
  outline: none;
  background-color: #131313;
  border-color: #007bff;
  color: #cccccc;
}

.send-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 18px;
}


</style>
