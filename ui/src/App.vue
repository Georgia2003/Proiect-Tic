<script setup>
import { computed } from "vue";
import { useAuthStore } from "./stores/auth";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const isAuthReady = computed(() => authStore.ready);
const isLoggedIn = computed(() => authStore.ready && !!authStore.user);

async function logout() {
  try {
    await signOut(auth);
  } finally {
    router.push("/login");
  }
}
</script>

<template>
  <div>
    <h1>SPA Assignment</h1>

    <nav style="margin-bottom: 16px;">
      <router-link to="/">Home</router-link>

      <span v-if="!isAuthReady"> | Checking...</span>

      <span v-else-if="!isLoggedIn">
        | <router-link to="/login">Login</router-link>
      </span>

      <span v-else>
        | <router-link to="/products">Products</router-link>
        <span style="margin-left: 12px;">
          ({{ authStore.user.email }})
          <button @click="logout" style="margin-left: 8px;">Logout</button>
        </span>
      </span>
    </nav>

    <router-view />
  </div>
</template>
