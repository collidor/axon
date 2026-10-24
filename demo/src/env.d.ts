/// <reference types="vite/client" />
/// <reference types="vite-plus/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // oxlint-disable-next-line typescript/no-explicit-any
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*?inline' {
  const content: string
  export default content
}
