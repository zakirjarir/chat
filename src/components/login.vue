<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-dark">
    <div class="card p-4 shadow text-white" style="width: 100%; max-width: 400px; background-color: #343a40;">
      <h3 class="text-center mb-4">Login</h3>

      <form @submit.prevent="loginUser">
        <div class="mb-3">
          <label>Email</label>
          <input type="email" class="form-control bg-dark text-white" v-model="email" required />
        </div>

        <div class="mb-3">
          <label>Password</label>
          <input type="password" class="form-control bg-dark text-white" v-model="password" required />
        </div>
        <button type="submit" class="btn btn-primary w-100">Login</button>
      </form>
    </div>
  </div>
</template>

<script>
import { auth } from "../firebass/configration"; // firebase.js থেকে auth import
import { signInWithEmailAndPassword } from "firebase/auth";

export default {
  name: "LoginPage",
  data() {
    return {
      email: "",
      password: "",
      errorMsg: "",
    };
  },
  methods: {
    async loginUser() {
      try {
         await signInWithEmailAndPassword(
            auth,
            this.email,
            this.password
        );
        // const user = userCredential.user;
        // console.log("Login successful:", user);
        // console.log("User ID (UID):", user.uid);
        // console.log("Email:", user.email);
        // console.log("Access Token:", await user.getIdToken());

        // ✅ Redirect or save to store
        this.$router.push("/chat");
      } catch (error) {
        alert('Login failed: ' + error.message);
        this.errorMsg = error.message;
        console.error("Login error:", error);
      }
    },
  },
};
</script>


<style scoped>
body {
  background-color: #f8f9fa;
}
</style>
