<template>
  <div>
    <div class="bg-primary py-1 px-2 shadow-sm d-flex sticky-top justify-content-between align-items-center">
      <h5 class="mb-0 text-white text-center fw-bold flex-grow-1">Z CHAT</h5>

      <div class="btn btn-primary" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRight" aria-controls="offcanvasRight">
        <i class="bi bi-person-circle fs-4 text-white"></i>
      </div>
      <div class="offcanvas offcanvas-end custom-offcanvas w-50 " tabindex="-1" id="offcanvasRight" aria-labelledby="offcanvasRightLabel">
        <div class="offcanvas-header border-bottom border-secondary">
          <h5 class="offcanvas-title text-white" id="offcanvasRightLabel">
            <i class="bi bi-list me-2"></i> Menu
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div class="offcanvas-body d-flex flex-column gap-4">
          <!-- Profile -->
          <div class="d-flex align-items-center gap-3 p-3 rounded menu-item">
            <i class="bi bi-person-circle fs-4 text-info"></i>
            <span class="fw-semibold text-white">Profile</span>
          </div>

          <!-- Logout -->
          <div class="d-flex align-items-center gap-3 p-3 rounded menu-item" @click="logout()" style="cursor: pointer">
            <i class="bi bi-box-arrow-right fs-4 text-danger"></i>
            <span class="fw-semibold text-danger">Logout</span>
          </div>
        </div>
      </div>

    </div>
    <div class="container py-4">
      <div v-if="user" class="overflow-hidden bg-dark">
        <div class="list-group list-group-flush">
          <div v-for="contact in filteredContacts" :key="contact.uid" @click="startChat(contact.uid)" class="list-group-item  d-flex align-items-center gap-3 px-4 py-3 contact-item">
            <img :src="contact.avatar || defaultAvatar" alt="Profile" class="rounded-circle" width="55" height="55"/>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-semibold text-white">{{ contact.name }}</h6>
                <!--              <small class="time-text">{{ formatDate(contact.createdAt) }}</small>-->
              </div>
              <!--            <div class="text-white ">{{ contact.email }}</div>-->
              <div class="text-white">You :Hi</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center my-auto">
        <button @click="signInAnonymously" class="btn btn-outline-light">
          Login Anonymously
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { collection, getDocs,  } from "firebase/firestore";
import { auth, db } from "../firebass/configration";
import {signInAnonymously as firebaseSignInAnonymously, signOut} from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import $router from "../router/index";
export default {
  name: "contactList",
  data() {
    return {
      contacts: [],
      user: null,
      defaultAvatar:
          "https://static.vecteezy.com/system/resources/previews/032/176/191/non_2x/business-avatar-profile-black-icon-man-of-user-symbol-in-trendy-flat-style-isolated-on-male-profile-people-diverse-face-for-social-network-or-web-vector.jpg",
    };
  },
  computed: {
    filteredContacts() {
      if (!this.user) return this.contacts;
      return this.contacts.filter((c) => c.uid !== this.user.uid);
    },
  },
  methods: {
    async signInAnonymously() {
      try {
        const userCredential = await firebaseSignInAnonymously(auth);
        this.user = userCredential.user;
        await this.fetchContacts();
      } catch (error) {
        $router.push('/')
        console.error("Anonymous login error:", error);
      }
    },
    async fetchContacts() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        this.contacts = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (!this.user || data.uid !== this.user.uid) {
            this.contacts.push(data);
          }
        });
      } catch (error) {
        console.error("Error fetching contacts:", error);
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
    startChat(uid) {
      this.$router.push({ name: "chat", params: { id:uid } });
    },

    // formatDate(timestamp) {
    //   if (!timestamp) return "";
    //   if (timestamp instanceof Timestamp) {
    //     return timestamp.toDate().toLocaleTimeString([], {
    //       hour: "2-digit",
    //       minute: "2-digit",
    //     });
    //   }
    //   return new Date(timestamp).toLocaleTimeString([], {
    //     hour: "2-digit",
    //     minute: "2-digit",
    //   });
    // },
  },
  mounted() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (user) {
        this.fetchContacts();
      } else {
        this.signInAnonymously();
      }
    });
  },
};
</script>

<style scoped>
.container {
  max-width: 480px;
  background-color: #121b22; /* WhatsApp dark bg */
  min-height: 100vh;
  margin: 0 auto;
  padding-top: 1rem;
  color: #0a0909;
}


.list-group-item {
  border: none;
  border-bottom: 1px solid #2a3942;
  background-color: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 12px 16px;
}

.list-group-item:last-child {
  border-bottom: none;
}
.list-group-item:hover {
  background-color: #1a2b32;
}
.contact-item {
  color: white;
}
img {
  object-fit: cover;
  border: 2px solid transparent;
}
.flex-grow-1 {
  overflow: hidden;
}
h6 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Here is the fix for time text color */
.time-text {
  font-size: 0.75rem;
  color: #b2b1b1; /* light grey, readable on dark bg */
  white-space: nowrap;
}

button.btn-outline-light {
  border-color: #25d366;
  color: #25d366;
  transition: all 0.3s ease;
  margin-top: 2rem;
}

button.btn-outline-light:hover {
  background-color: #25d366;
  color: #fff;
}
.custom-offcanvas {
  width: 300px;
  background-color: #121b22; /* Dark WhatsApp style */
  color: white;
  border-left: 1px solid #2a3942;
}
.menu-item {
  transition: background-color 0.3s ease;
}

.menu-item:hover {
  background-color: #2a3942;
}

</style>
