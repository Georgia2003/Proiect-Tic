```vue
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
const price = ref(null); // number
const description = ref("");

const categoryName = ref("");
const featuresCsv = ref(""); // ex: gaming, portable, rgb
const stockTotal = ref(null); // number
const warehouseCity = ref("");
const warehouseQty = ref(null); // number

const saving = ref(false);

// edit dialog + state
const editDialog = ref(false);
const editingId = ref(null);

const editName = ref("");
const editPrice = ref(null);
const editDescription = ref("");

const editCategoryName = ref("");
const editFeaturesCsv = ref("");
const editStockTotal = ref(null);
const editWarehouseCity = ref("");
const editWarehouseQty = ref(null);

const updating = ref(false);

// ---------- Helpers ----------
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

function resetAddForm() {
  name.value = "";
  price.value = null;
  description.value = "";
  categoryName.value = "";
  featuresCsv.value = "";
  stockTotal.value = null;
  warehouseCity.value = "";
  warehouseQty.value = null;
}

// ---------- Load ----------
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

// ---------- Create ----------
async function addProduct() {
  error.value = "";

  const n = name.value.trim();
  const p = safeNum(price.value);

  if (!n) return (error.value = "Name is required.");
  if (Number.isNaN(p) || p < 0)
    return (error.value = "Price must be a number >= 0.");

  const catName = categoryName.value.trim();
  const feats = csvToFeatures(featuresCsv.value);

  const total =
    stockTotal.value === null || stockTotal.value === ""
      ? 0
      : safeNum(stockTotal.value);
  if (Number.isNaN(total) || total < 0)
    return (error.value = "Stock total must be a number >= 0.");

  const wh = warehouseCity.value.trim();
  const whQ =
    warehouseQty.value === null || warehouseQty.value === ""
      ? 0
      : safeNum(warehouseQty.value);
  if (Number.isNaN(whQ) || whQ < 0)
    return (error.value = "Warehouse qty must be a number >= 0.");

  saving.value = true;
  try {
    await apiFetch("/api/products", {
      method: "POST",
      body: {
        name: n,
        price: p,
        description: description.value.trim(),

        categoryName: catName || "Uncategorized",
        categoryFeatures: feats,

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

// ---------- Delete ----------
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

// ---------- Edit dialog ----------
function startEdit(p) {
  editingId.value = p.id;

  editName.value = p.name ?? "";
  editPrice.value = p.price ?? null;
  editDescription.value = p.description ?? "";

  editCategoryName.value = p.category?.name ?? "";
  editFeaturesCsv.value = featuresToCsv(p.category?.features);

  editStockTotal.value = p.inventory?.total ?? 0;
  editWarehouseCity.value = p.inventory?.locations?.[0]?.warehouse ?? "";
  editWarehouseQty.value = p.inventory?.locations?.[0]?.quantity ?? 0;

  error.value = "";
  editDialog.value = true;
}

function cancelEdit() {
  editingId.value = null;

  editName.value = "";
  editPrice.value = null;
  editDescription.value = "";

  editCategoryName.value = "";
  editFeaturesCsv.value = "";
  editStockTotal.value = null;
  editWarehouseCity.value = "";
  editWarehouseQty.value = null;

  editDialog.value = false;
}

// ---------- Update ----------
async function saveEdit() {
  error.value = "";
  if (!editingId.value)
    return (error.value = "No product selected for edit.");

  const n = editName.value.trim();
  const p = safeNum(editPrice.value);

  if (!n) return (error.value = "Name is required.");
  if (Number.isNaN(p) || p < 0)
    return (error.value = "Price must be a number >= 0.");

  const catName = editCategoryName.value.trim();
  const feats = csvToFeatures(editFeaturesCsv.value);

  const total =
    editStockTotal.value === null || editStockTotal.value === ""
      ? 0
      : safeNum(editStockTotal.value);
  if (Number.isNaN(total) || total < 0)
    return (error.value = "Stock total must be a number >= 0.");

  const wh = editWarehouseCity.value.trim();
  const whQ =
    editWarehouseQty.value === null || editWarehouseQty.value === ""
      ? 0
      : safeNum(editWarehouseQty.value);
  if (Number.isNaN(whQ) || whQ < 0)
    return (error.value = "Warehouse qty must be a number >= 0.");

  updating.value = true;
  try {
    await apiFetch(`/api/products/${editingId.value}`, {
      method: "PUT",
      body: {
        name: n,
        price: p,
        description: editDescription.value.trim(),

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

// ---------- Lifecycle ----------
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
    <v-row>
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h1 class="text-h4">Products</h1>
        <v-chip v-if="isLoggedIn" color="primary" variant="tonal">
          Total: {{ products.length }}
        </v-chip>
      </v-col>
    </v-row>

    <v-alert v-if="!isAuthReady" type="info" variant="tonal" class="mb-4">
      Checking session...
    </v-alert>

    <v-alert
      v-else-if="!isLoggedIn"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      Not logged in. Please <router-link to="/login">login</router-link>.
    </v-alert>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-row v-if="isLoggedIn">
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title>Add product</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="addProduct">
              <v-text-field
                v-model="name"
                label="Name"
                placeholder="Gaming Laptop"
              />
              <v-text-field
                v-model.number="price"
                label="Price"
                type="number"
              />
              <v-textarea
                v-model="description"
                label="Description"
                rows="3"
              />
              <v-text-field v-model="categoryName" label="Category name" />
              <v-text-field
                v-model="featuresCsv"
                label="Features (comma separated)"
              />

              <v-row>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="stockTotal"
                    label="Stock total"
                    type="number"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="warehouseCity"
                    label="Warehouse city"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model.number="warehouseQty"
                    label="Warehouse qty"
                    type="number"
                  />
                </v-col>
              </v-row>

              <v-btn
                type="submit"
                color="primary"
                :loading="saving"
                :disabled="loading || updating"
              >
                Add
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card variant="outlined">
          <v-card-title>List</v-card-title>
          <v-divider />

          <v-list v-if="products.length">
            <v-list-item v-for="p in products" :key="p.id">
              <template #title>
                <span class="font-weight-bold">{{ p.name }}</span>
                <span class="text-medium-emphasis"> — {{ p.price }}</span>
              </template>

              <template #subtitle>
                <div v-if="p.description">{{ p.description }}</div>
                <div class="text-medium-emphasis">
                  Category: {{ p.category?.name || "Uncategorized" }} |
                  Stock: {{ p.inventory?.total ?? 0 }}
                </div>
              </template>

              <template #append>
                <v-btn
                  size="small"
                  variant="tonal"
                  class="me-2"
                  @click="startEdit(p)"
                >
                  Edit
                </v-btn>
                <v-btn
                  size="small"
                  color="error"
                  variant="tonal"
                  @click="removeProduct(p.id)"
                >
                  Delete
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-card-text v-else>No products yet.</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="editDialog" max-width="640">
      <v-card>
        <v-card-title>Edit product</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveEdit">
            <v-text-field v-model="editName" label="Name" />
            <v-text-field
              v-model.number="editPrice"
              label="Price"
              type="number"
            />
            <v-textarea
              v-model="editDescription"
              label="Description"
              rows="3"
            />

            <v-text-field v-model="editCategoryName" label="Category name" />
            <v-text-field
              v-model="editFeaturesCsv"
              label="Features (comma separated)"
            />

            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editStockTotal"
                  label="Stock total"
                  type="number"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="editWarehouseCity"
                  label="Warehouse city"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editWarehouseQty"
                  label="Warehouse qty"
                  type="number"
                />
              </v-col>
            </v-row>

            <v-btn
              type="submit"
              color="primary"
              :loading="updating"
              class="me-2"
            >
              Save
            </v-btn>
            <v-btn variant="tonal" @click="cancelEdit">Cancel</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
```
