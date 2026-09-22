<script setup>
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';
</script>

<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content-wrapper">
      <Topbar />
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-app);
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  .page-content {
    padding: 1rem;
  }
}
</style>
