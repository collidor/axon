<script setup lang="ts">
import { ref, computed } from "vue";

export interface NavItem {
  id: string;
  title: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const props = defineProps<{
  activeId: string;
}>();

const emit = defineEmits<{
  (e: "navigate", id: string): void;
}>();

const searchQuery = ref("");

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { id: "overview", title: "Overview & Vision", badge: "v0.1.0" },
      { id: "quickstart", title: "Quickstart & Setup" },
      { id: "architecture", title: "Core Architecture", badge: "Reactive" },
    ],
  },
  {
    title: "Graph Engine & Runtime",
    items: [
      { id: "graph-runtime", title: "Graph Runtime Engine", badge: "DAG" },
      { id: "reactive-signals", title: "Reactive Signal Propagation" },
      { id: "type-safe-ports", title: "Port Schema & Typing", badge: "Struct" },
      { id: "feedback-loops", title: "Feedback Loops & Clocks" },
      { id: "subgraphs", title: "Subgraphs & Scope Isolation" },
    ],
  },
  {
    title: "Music & Audio Processing",
    items: [
      { id: "node-sequencing", title: "Sequence & Parallel Nodes", badge: "Music" },
      { id: "clock-transport", title: "Clock & Transport Bar", badge: "BPM" },
      { id: "audio-synth-nodes", title: "PolySynth & 808 Drums" },
      { id: "effects-processing", title: "Filters, Delay & Reverb" },
    ],
  },
  {
    title: "UI & Visual IDE",
    items: [
      { id: "web-components", title: "Web Component Suite", badge: "Custom Elements" },
      { id: "axon-studio", title: "Studio IDE" },
      { id: "graph-compiler", title: "Pure TypeScript Compiler", badge: "Codegen" },
    ],
  },
];

const filteredSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return NAV_SECTIONS;

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
    ),
  })).filter((section) => section.items.length > 0);
});

function onSelect(item: NavItem) {
  emit("navigate", item.id);
}
</script>

<template>
  <aside class="docs-sidebar">
    <div class="sidebar-search">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Filter Axon documentation..."
        class="search-input"
      />
    </div>

    <div v-for="section in filteredSections" :key="section.title" class="sidebar-group">
      <div class="sidebar-title">{{ section.title }}</div>
      <ul class="sidebar-nav">
        <li v-for="item in section.items" :key="item.id">
          <a
            :href="'#' + item.id"
            :class="['sidebar-link', { active: activeId === item.id }]"
            @click.prevent="onSelect(item)"
          >
            <span>{{ item.title }}</span>
            <span v-if="item.badge" class="ui-badge ui-badge--sm ui-badge--accent">{{ item.badge }}</span>
          </a>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.docs-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  background: var(--ui-color-surface, oklch(0.14 0.02 260));
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
  overflow-y: auto;
  padding: 1.618em 1em;
  box-sizing: border-box;
}

.sidebar-search {
  margin-bottom: 1.236em;
  padding: 0 0.236em;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5em 0.75em;
  background: var(--ui-color-surface-elevated, oklch(0.18 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text, #ffffff);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
}

.sidebar-group {
  margin-bottom: 1.618em;
}

.sidebar-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-color-text-muted, oklch(0.65 0.02 260));
  margin-bottom: 0.618em;
  padding-left: 0.618em;
}

.sidebar-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.236em;
}

.sidebar-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4em 0.618em;
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text-muted, oklch(0.78 0.02 260));
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.sidebar-link:hover {
  background: var(--ui-color-surface-hover, oklch(0.22 0.025 260));
  color: var(--ui-color-text, #ffffff);
}

.sidebar-link.active {
  background: color-mix(in oklch, var(--ui-color-primary, oklch(0.65 0.22 260)) 15%, transparent);
  color: var(--ui-color-primary, oklch(0.75 0.22 260));
  font-weight: 600;
  border-left: 3px solid var(--ui-color-primary, oklch(0.65 0.22 260));
}

@media (max-width: 900px) {
  .docs-sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  }
}
</style>
