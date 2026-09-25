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
        <div class="page-content-inner">
          <router-view v-slot="{ Component, route }">
            <transition name="fade" mode="out-in">
              <keep-alive :max="15">
                <component :is="Component" :key="route.path" />
              </keep-alive>
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
  position: relative;
  overflow: hidden; /* Locks outer window from scrolling */
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
  height: 100vh;
  min-width: 0;
  overflow: hidden; /* Topbar stays locked at top, content scrolls below */
}

.page-content {
  flex: 1;
  height: calc(100vh - 64px);
  padding: 2rem 1.75rem;
  overflow-y: auto; /* All scrolling strictly isolated to page-content */
  overflow-x: hidden;
  width: 100%;
}

.page-content-inner {
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
    height: calc(100vh - 56px);
    padding: 1rem 0.85rem 3rem;
  }
}
</style>
