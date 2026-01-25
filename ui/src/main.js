import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

import { useAuthStore } from "./stores/auth";

const vuetify = createVuetify({
  components,
  directives,
});

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

// pornește listener-ul Firebase Auth o singură dată
const authStore = useAuthStore();
authStore.init();

app.use(router);
app.use(vuetify);

app.mount("#app");
