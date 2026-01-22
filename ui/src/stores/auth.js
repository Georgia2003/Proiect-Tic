import { defineStore } from "pinia";
import { ref } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const ready = ref(false);

  let started = false;

  function init() {
    if (started) return;
    started = true;

    onAuthStateChanged(auth, (u) => {
      user.value = u;     // u e null dacă e delogat
      ready.value = true; // de aici încolo știm sigur statusul
    });
  }

  return { user, ready, init };
});
