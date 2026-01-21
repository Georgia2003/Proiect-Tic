import { defineStore } from "pinia";
import { ref } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const ready = ref(false);

  function init() {
    onAuthStateChanged(auth, (u) => {
      user.value = u;      // u e null dacă e delogat
      ready.value = true;  // gata, știm statusul
    });
  }

  return { user, ready, init };
});
