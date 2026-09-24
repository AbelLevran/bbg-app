<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';

const route = useRoute();
const isMobileNavOpen = ref(false);

function toggleMobileNav() {
  isMobileNavOpen.value = !isMobileNavOpen.value;
}

function closeMobileNav() {
  isMobileNavOpen.value = false;
}

// Automatically close mobile menu whenever route changes
watch(() => route.path, () => {
  isMobileNavOpen.value = false;
});
</script>

<template>
  <div class="app-layout">
    <!-- Backdrop overlay for mobile drawer -->
    <transition name="fade">
      <div
        v-if="isMobileNavOpen"
        class="mobile-backdrop"
        @click="closeMobileNav"
      ></div>
    </transition>

    <Sidebar :is-open="isMobileNavOpen" @close="closeMobileNav" />

    <div class="main-content-wrapper">
      <Topbar @toggle-menu="toggleMobileNav" />
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
  position: relative;
  max-width: 100vw;
  overflow-x: hidden;
}

.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  z-index: 150;
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.page-content {
  flex: 1;
  padding: 2rem 1.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .page-content {
    padding: 1rem 0.85rem 3rem;
  }
}
</style>
