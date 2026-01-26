<template>
  <v-container class="py-8">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h3 font-weight-bold">Home</h1>
            <div class="text-medium-emphasis">
              Quick overview of your data (products + orders).
            </div>
          </div>

          <v-btn
            variant="tonal"
            :loading="loading"
            :disabled="loading"
            @click="refresh"
          >
            Refresh
          </v-btn>
        </div>
      </v-col>

      <v-col cols="12" v-if="error">
        <v-alert type="error" variant="tonal" border="start">
          {{ error }}
        </v-alert>
      </v-col>

      <!-- Totals -->
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 text-medium-emphasis">
            Products
          </v-card-title>

          <v-card-text>
            <div class="text-h2 font-weight-bold">
              {{ loading ? "…" : totals.products }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn to="/products" variant="outlined">Go to Products</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 text-medium-emphasis">
            Orders
          </v-card-title>

          <v-card-text>
            <div class="text-h2 font-weight-bold">
              {{ loading ? "…" : totals.orders }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn to="/orders" variant="outlined">Go to Orders</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Recent products -->
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Recent products</span>
            <v-btn to="/products" variant="text">View all</v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <div v-if="loading" class="text-medium-emphasis">Loading…</div>

            <div v-else-if="recent.products.length === 0" class="text-medium-emphasis">
              No products yet.
            </div>

            <v-list v-else lines="two">
              <v-list-item
                v-for="p in recent.products"
                :key="p.id"
                :title="p.name || 'Unnamed product'"
                :subtitle="p.description || '—'"
              >
                <template #append>
                  <v-chip size="small" variant="tonal">
                    {{ formatPrice(p.price) }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Recent orders -->
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Recent orders</span>
            <v-btn to="/orders" variant="text">View all</v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <div v-if="loading" class="text-medium-emphasis">Loading…</div>

            <div v-else-if="recent.orders.length === 0" class="text-medium-emphasis">
              No orders yet.
            </div>

            <v-list v-else lines="three">
              <v-list-item
                v-for="o in recent.orders"
                :key="o.id"
              >
                <v-list-item-title class="font-weight-bold">
                  {{ o.status || "processing" }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  Items: {{ summarizeItems(o.products) }}
                </v-list-item-subtitle>

                <v-list-item-subtitle>
                  Address: {{ summarizeAddress(o.shipping) }}
                </v-list-item-subtitle>

                <template #append>
                  <v-chip size="small" variant="tonal">
                    {{ formatPrice(calcOrderTotal(o.products)) }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";

// IMPORTANT: adaptează importul după proiectul tău real
import { auth } from "../firebase"; // <- schimbă dacă la tine e alt path

const API_BASE = "http://localhost:3000/api";

const loading = ref(false);
const error = ref("");

const totals = reactive({ products: 0, orders: 0 });
const recent = reactive({ products: [], orders: [] });

function formatPrice(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}

function summarizeItems(products) {
  if (!Array.isArray(products) || products.length === 0) return "—";
  return (
    products
      .slice(0, 2)
      .map((p) => `${p.productName || p.productSnapshot?.name || "Item"} x${p.quantity ?? 1}`)
      .join(", ") + (products.length > 2 ? "…" : "")
  );
}

function summarizeAddress(shipping) {
  if (!shipping) return "—";
  const a = shipping.address?.trim();
  const c = shipping.city?.trim();
  if (!a && !c) return "—";
  return [a, c].filter(Boolean).join(", ");
}

function calcOrderTotal(products) {
  if (!Array.isArray(products)) return 0;
  return products.reduce((sum, p) => {
    const qty = Number(p.quantity) || 0;
    const price = Number(p.priceAtPurchase) || 0;
    return sum + qty * price;
  }, 0);
}

async function authedFetch(path) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function refresh() {
  loading.value = true;
  error.value = "";

  try {
    const [productsData, ordersData] = await Promise.all([
      authedFetch("/products?limit=5&sortBy=createdAt&order=desc"),
      authedFetch("/orders?limit=5&sortBy=createdAt&order=desc"),
    ]);

    const products = Array.isArray(productsData) ? productsData : (productsData.items || []);
    const orders = Array.isArray(ordersData) ? ordersData : (ordersData.items || []);

    recent.products = products;
    recent.orders = orders;

    // Dacă API-ul tău nu întoarce total, aici va fi doar "câte au venit"
    totals.products = Array.isArray(productsData) ? products.length : (productsData.total ?? products.length);
    totals.orders = Array.isArray(ordersData) ? orders.length : (ordersData.total ?? orders.length);
  } catch (e) {
    error.value = e?.message || "Failed to load data";
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>
