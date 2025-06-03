<template>
  <div class="container-fluid bg-dark text-white p-0">
    <div class="row g-0" style="height: 100vh;">
      <!-- Chat Area -->
      <div class="col-12 col-md-9 d-flex flex-column">
        <!-- Header -->
        <div class="bg-primary text-white py-3 px-4 shadow-sm d-flex justify-content-between align-items-center">
          <h5 class="mb-0 text-center fw-bold flex-grow-1">Z CHAT APP</h5>
          <button @click="logout" type="button" class="btn btn-danger btn-sm">Logout</button>
        </div>


        <!-- Chat Body -->
        <div v-if="user" class="flex-grow-1 p-3 overflow-auto">
          <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="msg.sender === user.uid ? 'text-end' : 'text-start'"
              class="mb-2"
          >
            <span
                class="p-2 rounded shadow-sm d-inline-block"
                :class="msg.sender === user.uid ? 'bg-primary text-white' : 'bg-light text-dark'"
                style="max-width: 70%; word-wrap: break-word;"
            >
              {{ msg.text }}
            </span>
          </div>
        </div>

        <!-- Chat Input -->
        <div v-if="user" class="p-3 border-top d-flex align-items-start bg-dark">
          <!-- File Upload -->
          <input id="fileInput" type="file" @change="handleFileUpload" class="d-none" />
          <label for="fileInput" class="me-3 mt-1" style="cursor: pointer;" title="Upload File">
            <i class="bi bi-paperclip fs-4 text-white"></i>
          </label>

          <!-- Message Input -->
          <textarea
              v-model="newMessage"
              @keyup.enter="sendMessage"
              class="form-control me-2 bg-dark text-white"
              placeholder="Type a message..."
              rows="2"
          ></textarea>

          <!-- Send Button -->
          <button class="btn btn-primary px-3" @click="sendMessage">
            <i class="bi bi-send"></i>
          </button>
        </div>

        <!-- Anonymous Login -->
        <div v-else class="text-center my-auto">
          <button @click="signInAnonymously" class="btn btn-outline-light">
            Login Anonymously
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import { db, auth } from "../firebass/configration";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged ,signOut } from "firebase/auth";

export default {
  name: "ChatApp",
  data() {
    return {
      user: null,
      newMessage: "",
      messages: []
    };
  },
  methods: {
    signInAnonymously() {
      this.$router.push("/");
    },
    async sendMessage() {
      if (this.newMessage.trim() === "") return;
      await addDoc(collection(db, "messages"), {
        text: this.newMessage,
        name: "User",
        sender:this.user.uid, // Assuming the sender is always "me" for this example
        uid: this.user.uid,
        createdAt: serverTimestamp()
      });
      this.newMessage = "";
    },
    logout() {
      const confirmLogout = confirm("Are you sure you want to logout?");
      if (!confirmLogout) {return}
      signOut(auth)
          .then(() => {
            this.$router.push("/");
          })
          .catch((error) => {
            alert('Logout failed: ' + error.message);
            console.error("Logout failed:", error);
          });
    },
  },
  async mounted() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });

    const q = query(collection(db, "messages"), orderBy("createdAt"));
    onSnapshot(q, (snapshot) => {
      this.messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id
      }));
    });
  }
};
</script>

<style scoped>

</style>
