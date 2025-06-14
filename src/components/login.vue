<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-dark">
    <div class="card shadow-lg rounded-4 text-white px-4 py-5" style="width: 100%; max-width: 420px; background-color: #212529;">

      <h2 class="text-center mb-4">
        {{ isLogin ? "Login" : "Register" }}
      </h2>

      <!-- Login Form -->
      <form v-if="isLogin" @submit.prevent="loginUser">
        <div class="mb-3">
          <label>Email</label>
          <div class="input-group">
            <span class="input-group-text bg-secondary text-white">
              <i class="bi bi-envelope-fill"></i>
            </span>
            <input type="email" class="form-control bg-dark text-white  shadow-sm" v-model="email" required />
          </div>
        </div>

        <div class="mb-3">
          <label>Password</label>
          <div class="input-group">
            <span class="input-group-text bg-secondary  text-white">
              <i class="bi bi-lock-fill"></i>
            </span>
            <input type="password" class="form-control bg-dark text-white  shadow-sm" v-model="password" required />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 shadow-sm">Login</button>
        <p class="mt-3 text-center">
          Don't have an account?
          <a href="#" @click.prevent="isLogin = false" class="text-info">Register here</a>
        </p>
      </form>

      <!-- Register Form -->
      <form v-else @submit.prevent="registerUser">
        <div class="mb-3">
          <label>Full Name</label>
          <div class="input-group">
            <span class="input-group-text bg-secondary  text-white">
              <i class="bi bi-person-fill"></i>
            </span>
            <input type="text" class="form-control bg-dark text-white  shadow-sm" v-model="name" required />
          </div>
        </div>

        <div class="mb-3">
          <label>Email</label>
          <div class="input-group">
            <span class="input-group-text bg-secondary  text-white">
              <i class="bi bi-envelope-fill"></i>
            </span>
            <input type="email" class="form-control bg-dark text-white  shadow-sm" v-model="email" required />
          </div>
        </div>

        <div class="mb-3">
          <label>Password</label>
          <div class="input-group">
            <span class="input-group-text bg-secondary  text-white">
              <i class="bi bi-lock-fill"></i>
            </span>
            <input type="password" class="form-control bg-dark text-white  shadow-sm" v-model="password" required />
          </div>
        </div>

        <button type="submit" class="btn btn-success w-100 shadow-sm">Register</button>
        <p class="mt-3 text-center">
          Already have an account?
          <a href="#" @click.prevent="isLogin = true" class="text-info">Login here</a>
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import { auth, db } from "../firebass/configration";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default {
  name: "LoginRegister",
  data() {
    return {
      isLogin: true,
      email: "",
      password: "",
      name: "",
    };
  },
  methods: {
    async loginUser() {
      try {
        await signInWithEmailAndPassword(auth, this.email, this.password);
        this.$router.push("/contact");
      } catch (error) {
        alert("Login failed: " + error.message);
      }
    },

    async registerUser() {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: this.name });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: this.name,
          email: this.email,
          createdAt: new Date(),
        });

        this.isLogin = true;
        alert("Registration successful! Please login.");
        this.name = this.email = this.password = "";

      } catch (error) {
        alert("Registration failed: " + error.message);
      }
    },
  },
};
</script>

<style scoped>
a {
  cursor: pointer;
}
input:focus {
  outline: none;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
</style>
