<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Navbar, { type TabId } from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import DocViewer from './components/DocViewer.vue'
import StudioView from './components/StudioView.vue'
import NodeGalleryView from './components/NodeGalleryView.vue'
import MusicStationView from './components/MusicStationView.vue'
import TestRunnerView from './components/TestRunnerView.vue'
import DevToolsDock from './components/DevToolsDock.vue'

import { AudioDriverManager } from '@collidor/axon'

const currentTab = ref<TabId>('docs')
const activeSectionId = ref('overview')

function onTabChange(tab: TabId) {
  if (currentTab.value !== tab) {
    // Suspend audio context when switching views to prevent background bleed
    const driver = AudioDriverManager.get()
    const ctx = driver.getContext()
    if (typeof ctx.suspend === 'function') {
      void ctx.suspend()
    }
  }
  currentTab.value = tab
  window.location.hash = tab
}

function onNavigateDoc(sectionId: string) {
  activeSectionId.value = sectionId
  const el = document.getElementById(sectionId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

function syncHash() {
  const hash = window.location.hash.slice(1)
  if (hash === 'studio') {
    currentTab.value = 'studio'
  } else if (hash === 'gallery') {
    currentTab.value = 'gallery'
  } else if (hash === 'music') {
    currentTab.value = 'music'
  } else if (hash === 'tests') {
    currentTab.value = 'tests'
  } else {
    currentTab.value = 'docs'
    if (hash && hash !== 'docs') {
      activeSectionId.value = hash
    }
  }
}

onMounted(() => {
  window.addEventListener('hashchange', syncHash)
  syncHash()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash)
})
</script>

<template>
  <div class="docs-layout">
    <Navbar :current-tab="currentTab" @tab-change="onTabChange" />

    <!-- 1. Documentation View -->
    <main v-if="currentTab === 'docs'" :key="'docs'" class="docs-body">
      <Sidebar :active-id="activeSectionId" @navigate="onNavigateDoc" />
      <DocViewer
        @launch-studio="onTabChange('studio')"
        @launch-music="onTabChange('music')"
        @launch-gallery="onTabChange('gallery')"
      />
    </main>

    <!-- 2. Studio IDE View -->
    <main v-else-if="currentTab === 'studio'" :key="'studio'" class="full-station-view">
      <StudioView />
    </main>

    <!-- 3. Music Station View -->
    <main v-else-if="currentTab === 'music'" :key="'music'" class="full-station-view">
      <MusicStationView />
    </main>

    <!-- 4. Node Gallery View -->
    <main v-else-if="currentTab === 'gallery'" :key="'gallery'" class="full-station-view">
      <NodeGalleryView />
    </main>

    <!-- 5. Test Suite View -->
    <main v-else-if="currentTab === 'tests'" :key="'tests'" class="full-station-view">
      <TestRunnerView />
    </main>

    <!-- DevTools Telemetry Dock -->
    <DevToolsDock />
  </div>
</template>
