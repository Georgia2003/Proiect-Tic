<template>
  <div style="padding: 16px">
    <h1>SPA Assignment</h1>

    <nav style="display:flex; gap:12px; margin: 12px 0">
      <router-link to="/">Home</router-link>
      <router-link to="/login">Login</router-link>
    </nav>

    <router-view />
  </div>
</template>
