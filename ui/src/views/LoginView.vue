<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const message = ref("");

const redirectPath = computed(() => route.query.redirect?.toString() || "/products");

function goAfterAuth() {
  router.push(redirectPath.value);
}

async function register() {
  error.value = "";
  message.value = "";
  loading.value = true;
  try {
    await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
    message.value = "Cont creat ✅";
    goAfterAuth();
  } catch (e) {
    error.value = e?.message || "Register failed";
  } finally {
    loading.value = false;
  }
}

async function login() {
  error.value = "";
  message.value = "";
  loading.value = true;
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    message.value = "Logat ✅";
    goAfterAuth();
  } catch (e) {
    error.value = e?.message || "Login failed";
  } finally {
    loading.value = false;
  }
}

async function logout() {
  error.value = "";
  message.value = "";
  loading.value = true;
  try {
    await signOut(auth);
    message.value = "Delogat ✅";
    router.push("/login");
  } catch (e) {
    error.value = e?.message || "Logout failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1>Login</h1>

    <p v-if="!authStore.ready">Checking session...</p>

    <p v-if="error" style="color: crimson; font-weight: 600;">{{ error }}</p>
    <p v-if="message" style="color: green; font-weight: 600;">{{ message }}</p>

    <div style="max-width: 420px;">
      <div style="margin-bottom: 10px;">
        <label>Email</label><br />
        <input v-model="email" type="email" placeholder="ex: georgia@email.com" style="width: 100%;" />
      </div>

      <div style="margin-bottom: 10px;">
        <label>Password</label><br />
        <input v-model="password" type="password" placeholder="min 6 caractere" style="width: 100%;" />
      </div>

      <button @click="register" :disabled="loading">Register</button>
      <button @click="login" :disabled="loading" style="margin-left: 8px;">Login</button>
      <button @click="logout" :disabled="loading" style="margin-left: 8px;">Logout</button>

      <p style="margin-top: 12px;">
        Redirect după login: <b>{{ redirectPath }}</b>
      </p>
    </div>
  </div>
</template>
