<template>
  <div class="container-fluid p-0">
    <div class="bg-primary py-1 px-2 shadow-sm d-flex sticky-top justify-content-between align-items-center">
      <!-- Back Button -->
      <router-link class="me-2" to="/contact">
        <i class="bi bi-arrow-left fs-3"></i>
      </router-link>

      <!-- User Name -->
      <h5 class="mb-0 text-white text-center fw-bold flex-grow-1">{{ this.toUser }}</h5>

      <!-- Call Buttons -->
      <div class="d-flex gap-4 me-3">
        <!-- Video Call -->
        <div class="" @click="startVideoCall()">
          <i class="bi bi-camera-video-fill text-dark fs-5 "></i>
        </div>
        <!-- Audio Call -->
        <div class="" @click="startAudioCall" title="Audio Call">
          <i class="bi bi-telephone-fill text-white fs-5"></i>
        </div>
      </div>
    </div>
    <div class="row g-0">
      <!-- Chat Area -->
      <div class="col-12 col-md-9 d-flex flex-column">
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
import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  getDoc,
  doc,
    or,
    and
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
} from "firebase/auth";
import { nextTick } from "vue";

export default {
  name: "ChatApp",
  data() {
    return {
      user: {},
      uid: null,
      newMessage: "",
      messages: [],
      toUid: this.$route.params.id || null,
      toUser: null,
    };
  },
  methods: {
    async signInAnonymously() {
      try {
        const userCredential = await firebaseSignInAnonymously(auth);
        this.user = userCredential.user;
        this.uid = this.user.uid;
      } catch (error) {
        console.error("Anonymous login error:", error);
        this.$router.push("/");
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
          reciever: this.toUid,
          createdAt: serverTimestamp(),
        });
        this.newMessage = "";
      } catch (err) {
        alert("Message sending failed: " + err.message);
      }
    },

    async getUserData(uid) {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          this.toUser = userDoc.data().name || "Anonymous";
        } else {
          console.error("No such user!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
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

    loginStatus() {
      return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
          if (user) {
            this.user = user;
            this.uid = user.uid;
            resolve(user);
          } else {
            this.$router.push("/");
            reject("No user");
          }
        });
      });
    },
    startVideoCall() {
      this.$router.push({ name: "vdiocall", params: { id: this.toUid } });
    },

  },


  async mounted() {
    try {
      const user = await this.loginStatus();

      await this.getUserData(this.toUid);

      const q = query(
          collection(db, "messages"),
          or(
              and(
                  where("sender", "==", user.uid),
                  where("reciever", "==", this.toUid)
              ),
              and(
                  where("sender", "==", this.toUid),
                  where("reciever", "==", user.uid)
              )
          ),
          orderBy("createdAt")
      );

      onSnapshot(q, async (snapshot) => {
        this.messages = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        await nextTick();
        this.scrollToBottom();

        if (this.messages.length > 0) {
          this.lastMessage = this.messages[this.messages.length - 1];
          if (this.lastMessage.sender !== user.uid) {
            this.showNotification("🔔 New Message", {
              body: `New message: ${this.lastMessage.text}`,
              icon: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
              badge: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
              data: {
                url: "http://localhost:8080/zchat/#/chat/" + this.toUid,
              }
            });
          }
        }
      });
    } catch (err) {
      console.error("Error during mount:", err);
    }
  }


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
.bi-arrow-left{
  cursor: pointer;
  color: white;
}

</style>
