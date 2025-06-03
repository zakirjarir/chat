<template>
  <div class="container-fluid bg-dark text-white p-0">
    <div class="row g-0">
      <!-- Chat Area -->
      <div class="col-12 col-md-9 d-flex flex-column">
        <!-- Header -->
        <div class="bg-primary text-white py-3 px-4 shadow-sm d-flex sticky-top justify-content-between align-items-center">
          <h5 class="mb-0 text-center fw-bold flex-grow-1">Z CHAT</h5>
          <button v-if="user" @click="logout" type="button" class="btn btn-danger btn-sm">Logout</button>
        </div>

        <!-- Chat Body -->
        <div v-if="user" ref="chatContainer" class="flex-grow-1 p-3 overflow-auto" style="background: #121212;">
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
    <footer class="sticky-bottom">
      <!-- Chat Input -->
      <div v-if="user" class="p-3 border-top d-flex align-items-start bg-dark">
        <!-- Message Input -->
        <textarea v-model="newMessage" @keyup.enter.prevent="sendMessage" class="form-control me-2 bg-dark text-white" placeholder="Type a message..." rows="2"></textarea>

        <!-- Send Button -->
        <button class="btn btn-primary py-auto px-auto" @click="sendMessage">
          <i class="bi bi-send"></i>
        </button>
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
</style>
