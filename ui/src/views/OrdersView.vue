<script setup>
import { ref, computed, onMounted } from "vue";
import { apiFetch } from "../services/api";

const loading = ref(false);
const error = ref("");

const products = ref([]);
const myOrders = ref([]);

// CREATE form
const creating = ref(false);
const status = ref("processing");
const shippingAddress = ref("");
const city = ref("");
const tracking = ref("");

const selectedProductId = ref(null);
const quantity = ref(1);
const priceAtPurchase = ref(0);

// EDIT dialog
const editDialog = ref(false);
const editingId = ref(null);
const editStatus = ref("processing");
const editShippingAddress = ref("");
const editCity = ref("");
const editTracking = ref("");
const updating = ref(false);

// DELETE state
const deletingId = ref(null);

// ---------- helpers ----------
const productById = computed(() => {
  const m = new Map();
  for (const p of products.value) m.set(p.id, p);
  return m;
});

const productOptions = computed(() =>
  products.value.map((p) => ({
    title: `${p.name} — ${p.price}`,
    value: p.id,
  }))
);

function onSelectProduct(id) {
  const p = products.value.find((x) => x.id === id);
  priceAtPurchase.value = p ? Number(p.price) : 0;
}

const total = computed(() => {
  const q = Number(quantity.value) || 0;
  const pr = Number(priceAtPurchase.value) || 0;
  return q * pr;
});

function formatItems(o) {
  const arr = Array.isArray(o?.products) ? o.products : [];
  if (!arr.length) return "—";

  return arr
    .map((it) => {
      const pid = it.productId || "";
      const p = productById.value.get(pid);

      const name = it.productName || p?.name || pid || "Unknown";
      const q = Number(it.quantity ?? 1);
      const pr = Number(it.priceAtPurchase ?? p?.price ?? 0);

      return `${name} x${Number.isFinite(q) ? q : 1} (${Number.isFinite(pr) ? pr : 0})`;
    })
    .join(", ");
}

function formatAddress(o) {
  const addr = String(o?.shipping?.address ?? "").trim();
  const c = String(o?.shipping?.city ?? "").trim();
  const out = [addr, c].filter(Boolean).join(", ");
  return out || "—";
}

// ---------- API ----------
async function loadProducts() {
  const data = await apiFetch("/api/products");
  products.value = Array.isArray(data) ? data : [];
}

async function loadOrders() {
  const data = await apiFetch("/api/orders");
  myOrders.value = Array.isArray(data) ? data : [];
}

async function refreshAll() {
  error.value = "";
  loading.value = true;
  try {
    await loadProducts();
    await loadOrders();
  } catch (e) {
    error.value = e?.message || "Failed to load data";
  } finally {
    loading.value = false;
  }
}

// ---------- CREATE ----------
async function createOrder() {
  error.value = "";

  if (!selectedProductId.value) return (error.value = "Choose a product.");
  if (!shippingAddress.value.trim()) return (error.value = "Shipping address is required.");
  if (!city.value.trim()) return (error.value = "City is required.");
  if (Number(quantity.value) <= 0) return (error.value = "Quantity must be >= 1.");

  creating.value = true;
  try {
    await apiFetch("/api/orders", {
      method: "POST",
      body: {
        // IMPORTANT: backend expects `products` + `shipping`
        products: [
          {
            productId: selectedProductId.value,
            quantity: Number(quantity.value),
            priceAtPurchase: Number(priceAtPurchase.value),
          },
        ],
        status: status.value,
        shipping: {
          address: shippingAddress.value.trim(),
          city: city.value.trim(),
          tracking: tracking.value.trim(),
        },
      },
    });

    // reset minimal
    selectedProductId.value = null;
    quantity.value = 1;
    priceAtPurchase.value = 0;
    tracking.value = "";

    await loadOrders();
  } catch (e) {
    error.value = e?.message || "Failed to create order";
  } finally {
    creating.value = false;
  }
}

// ---------- EDIT ----------
function startEdit(o) {
  editingId.value = o.id;

  editStatus.value = o.status ?? "processing";
  editShippingAddress.value = o?.shipping?.address ?? "";
  editCity.value = o?.shipping?.city ?? "";
  editTracking.value = o?.shipping?.tracking ?? "";

  error.value = "";
  editDialog.value = true;
}

function cancelEdit() {
  editDialog.value = false;
  editingId.value = null;

  editStatus.value = "processing";
  editShippingAddress.value = "";
  editCity.value = "";
  editTracking.value = "";
}

async function saveEdit() {
  error.value = "";
  if (!editingId.value) return (error.value = "No order selected.");

  if (!editStatus.value.trim()) return (error.value = "Status is required.");
  if (!editShippingAddress.value.trim()) return (error.value = "Shipping address is required.");
  if (!editCity.value.trim()) return (error.value = "City is required.");

  updating.value = true;
  try {
    await apiFetch(`/api/orders/${editingId.value}`, {
      method: "PUT",
      body: {
        // IMPORTANT: backend expects `shipping`
        status: editStatus.value.trim(),
        shipping: {
          address: editShippingAddress.value.trim(),
          city: editCity.value.trim(),
          tracking: editTracking.value.trim(),
        },
      },
    });

    cancelEdit();
    await loadOrders();
  } catch (e) {
    error.value = e?.message || "Failed to update order";
  } finally {
    updating.value = false;
  }
}

// ---------- DELETE ----------
async function removeOrder(id) {
  error.value = "";
  if (!id) return;

  const ok = confirm("Delete this order?");
  if (!ok) return;

  deletingId.value = id;
  try {
    await apiFetch(`/api/orders/${id}`, { method: "DELETE" });
    await loadOrders();
  } catch (e) {
    error.value = e?.message || "Failed to delete order";
  } finally {
    deletingId.value = null;
  }
}

onMounted(refreshAll);
</script>

<template>
  <div>
    <v-row class="mb-2">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h1 class="text-h4">Orders</h1>
        <v-chip variant="tonal" color="primary">Total: {{ myOrders.length }}</v-chip>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-row>
      <!-- CREATE -->
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title>Create order</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createOrder">
              <v-select
                v-model="selectedProductId"
                :items="productOptions"
                label="Product"
                item-title="title"
                item-value="value"
                @update:modelValue="onSelectProduct"
              />

              <v-row>
                <v-col cols="6">
                  <v-text-field v-model.number="quantity" type="number" label="Quantity" min="1" />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model.number="priceAtPurchase"
                    type="number"
                    label="Price at purchase"
                    readonly
                  />
                </v-col>
              </v-row>

              <v-text-field v-model="status" label="Status" />
              <v-text-field v-model="shippingAddress" label="Shipping address" />
              <v-text-field v-model="city" label="City" />
              <v-text-field v-model="tracking" label="Tracking (optional)" />

              <v-alert type="info" variant="tonal" class="my-3">
                Total (computed): <b>{{ total }}</b>
              </v-alert>

              <v-btn type="submit" color="primary" variant="tonal" :loading="creating">
                Create
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- LIST -->
      <v-col cols="12" md="7">
        <v-card variant="outlined">
          <v-card-title>My orders</v-card-title>
          <v-divider />

          <v-list v-if="myOrders.length">
            <v-list-item v-for="o in myOrders" :key="o.id" class="py-4">
              <template #title>
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <span class="font-weight-bold">{{ o.status || "processing" }}</span>
                  </div>

                  <div class="d-flex align-center">
                    <v-btn size="small" variant="tonal" class="me-2" @click="startEdit(o)">
                      Edit
                    </v-btn>

                    <v-btn
                      size="small"
                      color="error"
                      variant="tonal"
                      :loading="deletingId === o.id"
                      :disabled="deletingId === o.id"
                      @click="removeOrder(o.id)"
                    >
                      Delete
                    </v-btn>
                  </div>
                </div>
              </template>

              <template #subtitle>
                <div class="text-medium-emphasis" style="white-space: normal;">
                  <div><b>Items:</b> {{ formatItems(o) }}</div>
                  <div><b>Address:</b> {{ formatAddress(o) }}</div>
                </div>
              </template>
            </v-list-item>
          </v-list>

          <v-card-text v-else>No orders yet.</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- EDIT DIALOG -->
    <v-dialog v-model="editDialog" max-width="640">
      <v-card>
        <v-card-title>Edit order</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveEdit">
            <v-text-field v-model="editStatus" label="Status *" />
            <v-text-field v-model="editShippingAddress" label="Shipping address *" />
            <v-text-field v-model="editCity" label="City *" />
            <v-text-field v-model="editTracking" label="Tracking (optional)" />

            <div class="d-flex justify-end mt-4">
              <v-btn variant="tonal" class="me-2" @click="cancelEdit" :disabled="updating">
                Cancel
              </v-btn>
              <v-btn type="submit" color="primary" variant="tonal" :loading="updating">
                Save
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
