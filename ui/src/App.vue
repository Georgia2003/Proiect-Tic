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
const email = computed(() => authStore.user?.email || "");

async function logout() {
  try {
    await signOut(auth);
  } finally {
    router.push("/login");
  }
}
</script>

<template>
  <v-app>
    <v-app-bar title="SPA Assignment" density="comfortable">
      <template #prepend>
        <v-btn variant="text" to="/">Home</v-btn>

        <v-btn variant="text" to="/products" :disabled="!isLoggedIn">
          Products
        </v-btn>

        <v-btn variant="text" to="/orders" :disabled="!isLoggedIn">
          Orders
        </v-btn>
      </template>

      <v-spacer />

      <v-chip v-if="isLoggedIn" class="me-3" variant="tonal">
        {{ email }}
      </v-chip>

      <v-btn v-if="isLoggedIn" variant="tonal" @click="logout">
        Logout
      </v-btn>

      <v-btn v-else variant="tonal" to="/login">
        Login
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="py-6">
        <v-alert v-if="!isAuthReady" type="info" variant="tonal" class="mb-4">
          Checking session...
        </v-alert>

        <router-view v-else />
      </v-container>
    </v-main>
  </v-app>
</template>
