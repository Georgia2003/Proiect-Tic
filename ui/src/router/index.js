import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import ProductsView from "../views/ProductsView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/products", name: "products", component: ProductsView },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
