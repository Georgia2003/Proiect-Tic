import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import ProductsView from "../views/ProductsView.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/login", name: "login", component: LoginView },
  {
    path: "/products",
    name: "products",
    component: ProductsView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  // Așteaptă până știm sigur dacă user e logat sau nu
  if (!authStore.ready) {
    return new Promise((resolve) => {
      const stop = setInterval(() => {
        if (authStore.ready) {
          clearInterval(stop);
          resolve(true);
        }
      }, 10);
    });
  }

  // dacă ruta cere auth și nu ești logat -> la login cu redirect
  if (to.meta.requiresAuth && !authStore.user) {
    return {
      name: "login",
      query: { redirect: to.fullPath },
    };
  }

  // dacă ești logat și mergi pe login -> trimite-te la products
  if (to.name === "login" && authStore.user) {
    return { name: "products" };
  }

  return true;
});

export default router;
