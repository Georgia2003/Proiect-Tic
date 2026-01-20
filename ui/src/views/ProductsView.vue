<script setup>
import { onMounted, ref } from "vue";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const loading = ref(true);
const error = ref("");
const products = ref([]);

async function loadProducts() {
  loading.value = true;
  error.value = "";
  try {
    const snap = await getDocs(collection(db, "products"));
    products.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadProducts);
</script>

<template>
  <main>
    <h1>Products</h1>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" style="color: crimson;">{{ error }}</p>

    <div v-else>
      <p>Total: {{ products.length }}</p>
      <ul>
        <li v-for="p in products" :key="p.id">
          {{ p.name || "(no name)" }} — {{ p.price ?? "n/a" }}
        </li>
      </ul>
    </div>
  </main>
</template>
