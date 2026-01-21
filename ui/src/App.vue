<template>
  <div>
    <h1>SPA Assignment</h1>

    <nav style="display:flex; gap:12px;">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/login">Login</RouterLink>
      <RouterLink to="/products">Products</RouterLink>
    </nav>

    <RouterView />
  </div>
</template>
