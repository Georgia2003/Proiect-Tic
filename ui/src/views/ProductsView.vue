<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import { apiFetch } from "../services/api";

const authStore = useAuthStore();
const isAuthReady = computed(() => authStore.ready);
const isLoggedIn = computed(() => authStore.ready && !!authStore.user);

const products = ref([]);
const loading = ref(false);
const error = ref("");

// add form
const name = ref("");
const price = ref("");
const description = ref("");

const categoryName = ref("");
const featuresCsv = ref(""); // ex: gaming, portable, rgb
const stockTotal = ref(""); // number
const warehouseCity = ref("");
const warehouseQty = ref("");

const saving = ref(false);

// edit state
const editingId = ref(null);
const editName = ref("");
const editPrice = ref("");
const editDescription = ref("");

const editCategoryName = ref("");
const editFeaturesCsv = ref("");
const editStockTotal = ref("");
const editWarehouseCity = ref("");
const editWarehouseQty = ref("");

const updating = ref(false);

function resetAddForm() {
  name.value = "";
  price.value = "";
  description.value = "";
  categoryName.value = "";
  featuresCsv.value = "";
  stockTotal.value = "";
  warehouseCity.value = "";
  warehouseQty.value = "";
}

function csvToFeatures(csv) {
  return String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function featuresToCsv(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

function startEdit(p) {
  editingId.value = p.id;

  editName.value = p.name ?? "";
  editPrice.value = String(p.price ?? "");
  editDescription.value = p.description ?? "";

  editCategoryName.value = p.category?.name ?? "";
  editFeaturesCsv.value = featuresToCsv(p.category?.features);

  editStockTotal.value = String(p.inventory?.total ?? "");
  editWarehouseCity.value = p.inventory?.locations?.[0]?.warehouse ?? "";
  editWarehouseQty.value = String(p.inventory?.locations?.[0]?.quantity ?? "");

  error.value = "";
}

function cancelEdit() {
  editingId.value = null;

  editName.value = "";
  editPrice.value = "";
  editDescription.value = "";

  editCategoryName.value = "";
  editFeaturesCsv.value = "";
  editStockTotal.value = "";
  editWarehouseCity.value = "";
  editWarehouseQty.value = "";
}

async function loadProducts() {
  error.value = "";
  products.value = [];

  if (!isLoggedIn.value) return;

  loading.value = true;
  try {
    const data = await apiFetch("/api/products");
    products.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e?.message || "Failed to load products";
  } finally {
    loading.value = false;
  }
}

async function addProduct() {
  error.value = "";

  const n = name.value.trim();
  const p = safeNum(price.value);

  if (!n) return (error.value = "Name is required.");
  if (Number.isNaN(p) || p < 0) return (error.value = "Price must be a number >= 0.");

  // extra fields (NoSQL-ish)
  const catName = categoryName.value.trim();
  const feats = csvToFeatures(featuresCsv.value);

  const total = stockTotal.value === "" ? 0 : safeNum(stockTotal.value);
  if (Number.isNaN(total) || total < 0) return (error.value = "Stock total must be a number >= 0.");

  const wh = warehouseCity.value.trim();
  const whQ = warehouseQty.value === "" ? 0 : safeNum(warehouseQty.value);
  if (Number.isNaN(whQ) || whQ < 0) return (error.value = "Warehouse qty must be a number >= 0.");

  saving.value = true;
  try {
    await apiFetch("/api/products", {
  method: "POST",
  body: {
    name: n,
    price: p,
    description: description.value.trim(),

    // ✅ exact ce așteaptă backend-ul
    categoryName: catName || "Uncategorized",
    categoryFeatures: feats, // array OK (backend acceptă array sau csv)

    inventoryTotal: total,
    inventoryLocations: wh ? [{ warehouse: wh, quantity: whQ }] : [],
  },
});


    resetAddForm();
    await loadProducts();
  } catch (e) {
    error.value = e?.message || "Failed to add product";
  } finally {
    saving.value = false;
  }
}

async function removeProduct(id) {
  error.value = "";
  if (!id) return;

  if (editingId.value === id) cancelEdit();

  const ok = confirm("Delete this product?");
  if (!ok) return;

  try {
    await apiFetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  } catch (e) {
    error.value = e?.message || "Failed to delete product";
  }
}

async function saveEdit() {
  error.value = "";
  if (!editingId.value) return (error.value = "No product selected for edit.");

  const n = editName.value.trim();
  const p = safeNum(editPrice.value);

  if (!n) return (error.value = "Name is required.");
  if (Number.isNaN(p) || p < 0) return (error.value = "Price must be a number >= 0.");

  const catName = editCategoryName.value.trim();
  const feats = csvToFeatures(editFeaturesCsv.value);

  const total = editStockTotal.value === "" ? 0 : safeNum(editStockTotal.value);
  if (Number.isNaN(total) || total < 0) return (error.value = "Stock total must be a number >= 0.");

  const wh = editWarehouseCity.value.trim();
  const whQ = editWarehouseQty.value === "" ? 0 : safeNum(editWarehouseQty.value);
  if (Number.isNaN(whQ) || whQ < 0) return (error.value = "Warehouse qty must be a number >= 0.");

  updating.value = true;
  try {
    await apiFetch(`/api/products/${editingId.value}`, {
  method: "PUT",
  body: {
    name: n,
    price: p,
    description: editDescription.value.trim(),

    // ✅ exact ce așteaptă backend-ul
    categoryName: catName || "Uncategorized",
    categoryFeatures: feats,

    inventoryTotal: total,
    inventoryLocations: wh ? [{ warehouse: wh, quantity: whQ }] : [],
  },
});


    cancelEdit();
    await loadProducts();
  } catch (e) {
    error.value = e?.message || "Failed to update product";
  } finally {
    updating.value = false;
  }
}

onMounted(() => {
  if (authStore.ready && authStore.user) loadProducts();
});

watch(
  () => authStore.ready,
  (r) => {
    if (r && authStore.user) loadProducts();
  }
);

watch(
  () => authStore.user,
  (u) => {
    if (!authStore.ready) return;
    if (!u) {
      products.value = [];
      error.value = "";
      loading.value = false;
      return;
    }
    loadProducts();
  }
);
</script>

<template>
  <div>
    <h1>Products</h1>

    <div v-if="!isAuthReady" style="margin: 12px 0; padding: 10px; border: 1px solid #ccc;">
      Checking session...
    </div>

    <div v-else-if="!isLoggedIn" style="margin: 12px 0; padding: 10px; border: 1px solid #ccc;">
      <b>Not logged in.</b>
      <span> Please </span>
      <router-link to="/login">login</router-link>
      <span> to view and manage products.</span>
    </div>

    <div v-else>
      <p v-if="loading">Loading...</p>

      <p v-if="error" style="color: crimson; font-weight: 600;">
        {{ error }}
      </p>

      <p><b>Total:</b> {{ products.length }}</p>

      <hr />

      <h2>Add product</h2>

      <form @submit.prevent="addProduct" style="max-width: 520px;">
        <div style="margin-bottom: 10px;">
          <label>Name</label><br />
          <input v-model="name" type="text" placeholder="e.g. Gaming Laptop" style="width: 100%;" />
        </div>

        <div style="margin-bottom: 10px;">
          <label>Price</label><br />
          <input v-model="price" type="number" step="0.01" min="0" placeholder="e.g. 3999.99" style="width: 100%;" />
        </div>

        <div style="margin-bottom: 10px;">
          <label>Description</label><br />
          <textarea v-model="description" rows="3" placeholder="short description..." style="width: 100%;"></textarea>
        </div>

        <div style="margin-bottom: 10px;">
          <label>Category name</label><br />
          <input v-model="categoryName" type="text" placeholder="e.g. Electronics" style="width: 100%;" />
        </div>

        <div style="margin-bottom: 10px;">
          <label>Features (comma separated)</label><br />
          <input v-model="featuresCsv" type="text" placeholder="e.g. gaming, portable, rgb" style="width: 100%;" />
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <div style="flex: 1;">
            <label>Stock total</label><br />
            <input v-model="stockTotal" type="number" min="0" step="1" placeholder="e.g. 15" style="width: 100%;" />
          </div>
          <div style="flex: 1;">
            <label>Warehouse city</label><br />
            <input v-model="warehouseCity" type="text" placeholder="e.g. Bucharest" style="width: 100%;" />
          </div>
          <div style="flex: 1;">
            <label>Warehouse qty</label><br />
            <input v-model="warehouseQty" type="number" min="0" step="1" placeholder="e.g. 5" style="width: 100%;" />
          </div>
        </div>

        <button type="submit" :disabled="loading || saving || updating">
          {{ saving ? "Saving..." : "Add" }}
        </button>
      </form>

      <hr />

      <h2>List</h2>

      <ul v-if="products.length">
        <li v-for="p in products" :key="p.id" style="margin-bottom: 14px;">
          <div v-if="editingId !== p.id">
            <b>{{ p.name }}</b> — {{ p.price }}
            <span v-if="p.description"> — {{ p.description }}</span>

            <div style="margin-top: 4px; font-size: 0.95em;">
              <div><b>Category:</b> {{ p.category?.name || "Uncategorized" }}</div>
              <div v-if="p.category?.features?.length">
                <b>Features:</b> {{ p.category.features.join(", ") }}
              </div>
              <div><b>Stock:</b> {{ p.inventory?.total ?? 0 }}</div>
              <div v-if="p.inventory?.locations?.length">
                <b>Location:</b> {{ p.inventory.locations[0].warehouse }} ({{ p.inventory.locations[0].quantity }})
              </div>
            </div>

            <div style="margin-top: 8px;">
              <button type="button" @click="startEdit(p)" :disabled="loading || saving || updating">
                Edit
              </button>

              <button type="button" @click="removeProduct(p.id)" :disabled="loading || saving || updating">
                Delete
              </button>
            </div>
          </div>

          <div v-else style="max-width: 520px;">
            <div style="margin-bottom: 6px;">
              <label>Name</label><br />
              <input v-model="editName" type="text" style="width: 100%;" />
            </div>

            <div style="margin-bottom: 6px;">
              <label>Price</label><br />
              <input v-model="editPrice" type="number" step="0.01" min="0" style="width: 100%;" />
            </div>

            <div style="margin-bottom: 6px;">
              <label>Description</label><br />
              <textarea v-model="editDescription" rows="2" style="width: 100%;"></textarea>
            </div>

            <div style="margin-bottom: 6px;">
              <label>Category name</label><br />
              <input v-model="editCategoryName" type="text" style="width: 100%;" />
            </div>

            <div style="margin-bottom: 6px;">
              <label>Features (comma separated)</label><br />
              <input v-model="editFeaturesCsv" type="text" style="width: 100%;" />
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <label>Stock total</label><br />
                <input v-model="editStockTotal" type="number" min="0" step="1" style="width: 100%;" />
              </div>
              <div style="flex: 1;">
                <label>Warehouse city</label><br />
                <input v-model="editWarehouseCity" type="text" style="width: 100%;" />
              </div>
              <div style="flex: 1;">
                <label>Warehouse qty</label><br />
                <input v-model="editWarehouseQty" type="number" min="0" step="1" style="width: 100%;" />
              </div>
            </div>

            <button type="button" @click="saveEdit" :disabled="loading || updating || saving">
              {{ updating ? "Saving..." : "Save" }}
            </button>
            <button type="button" @click="cancelEdit" :disabled="loading || updating || saving">
              Cancel
            </button>
          </div>
        </li>
      </ul>

      <p v-else-if="!loading">No products yet.</p>
    </div>
  </div>
</template>
