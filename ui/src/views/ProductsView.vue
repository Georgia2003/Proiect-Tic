<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase'

// state list
const products = ref([])
const loading = ref(true)
const error = ref('')

// form state (ADD)
const name = ref('')
const price = ref('')
const description = ref('')
const saving = ref(false)

// state (EDIT)
const editingId = ref(null) // id-ul produsului editat (sau null)
const editName = ref('')
const editPrice = ref('')
const editDescription = ref('')
const updating = ref(false)

// firestore unsubscribe holder
let unsubscribe = null

function resetAddForm() {
  name.value = ''
  price.value = ''
  description.value = ''
}

function startEdit(p) {
  editingId.value = p.id
  editName.value = p.name ?? ''
  editPrice.value = String(p.price ?? '')
  editDescription.value = p.description ?? ''
  error.value = ''
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
  editPrice.value = ''
  editDescription.value = ''
}

async function addProduct() {
  error.value = ''

  const n = name.value.trim()
  const p = Number(price.value)

  if (!n) {
    error.value = 'Name is required.'
    return
  }
  if (Number.isNaN(p) || p < 0) {
    error.value = 'Price must be a valid number (>= 0).'
    return
  }

  saving.value = true
  try {
    await addDoc(collection(db, 'products'), {
      name: n,
      price: p,
      description: description.value.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    resetAddForm()
  } catch (e) {
    error.value = e?.message || 'Failed to add product'
  } finally {
    saving.value = false
  }
}

async function removeProduct(id) {
  error.value = ''
  if (!id) return

  // dacă ștergi produsul pe care îl editezi, ieși din edit
  if (editingId.value === id) cancelEdit()

  const ok = confirm('Delete this product?')
  if (!ok) return

  try {
    await deleteDoc(doc(db, 'products', id))
    // lista se actualizează singură (onSnapshot)
  } catch (e) {
    error.value = e?.message || 'Failed to delete product'
  }
}

async function saveEdit() {
  error.value = ''

  if (!editingId.value) {
    error.value = 'No product selected for edit.'
    return
  }

  const n = editName.value.trim()
  const p = Number(editPrice.value)

  if (!n) {
    error.value = 'Name is required.'
    return
  }
  if (Number.isNaN(p) || p < 0) {
    error.value = 'Price must be a valid number (>= 0).'
    return
  }

  updating.value = true
  try {
    await updateDoc(doc(db, 'products', editingId.value), {
      name: n,
      price: p,
      description: editDescription.value.trim(),
      updatedAt: serverTimestamp()
    })
    cancelEdit()
  } catch (e) {
    error.value = e?.message || 'Failed to update product'
  } finally {
    updating.value = false
  }
}

function connectLiveProducts() {
  loading.value = true
  error.value = ''

  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))

  unsubscribe = onSnapshot(
    q,
    (snap) => {
      products.value = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
      loading.value = false
    },
    (e) => {
      error.value = e?.message || 'Failed to load products'
      loading.value = false
    }
  )
}

onMounted(connectLiveProducts)

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <div>
    <h1>Products</h1>

    <p v-if="loading">Loading...</p>

    <p v-if="error" style="color: crimson; font-weight: 600;">
      {{ error }}
    </p>

    <p><b>Total:</b> {{ products.length }}</p>

    <hr />

    <h2>Add product</h2>

    <form @submit.prevent="addProduct" style="max-width: 420px;">
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

      <button type="submit" :disabled="loading || saving || updating">
        {{ saving ? 'Saving...' : 'Add' }}
      </button>
    </form>

    <hr />

    <h2>List</h2>

    <ul v-if="products.length">
      <li v-for="p in products" :key="p.id" style="margin-bottom: 10px;">
        <!-- VIEW MODE -->
        <div v-if="editingId !== p.id">
          <b>{{ p.name }}</b>
          — {{ p.price }}
          <span v-if="p.description"> — {{ p.description }}</span>

          <div style="margin-top: 6px;">
            <button type="button" @click="startEdit(p)" :disabled="loading || saving || updating">
              Edit
            </button>
            <button type="button" @click="removeProduct(p.id)" :disabled="loading || saving || updating">
              Delete
            </button>
          </div>
        </div>

        <!-- EDIT MODE -->
        <div v-else style="max-width: 420px;">
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

          <button type="button" @click="saveEdit" :disabled="loading || updating || saving">
            {{ updating ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" @click="cancelEdit" :disabled="loading || updating || saving">
            Cancel
          </button>
        </div>
      </li>
    </ul>

    <p v-else-if="!loading">No products yet.</p>
  </div>
</template>
