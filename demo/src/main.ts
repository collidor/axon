import { createApp } from 'vue'
import App from './App.vue'

// Import Collidor UI Tokens & Custom Elements
import '@collidor/ui/tokens.css'
import '@collidor/ui'

// Import Axon Web Components & Core Node Engines
import '@collidor/axon/web-components'
import { registerCoreNodes } from '../../src/nodes/nodeLibrary'
import { registerWebComponentNodes } from '../../src/web-components/nodes/registerWebComponentNodes'

registerCoreNodes()
registerWebComponentNodes()

// Import Site Styles
import './style.css'

const app = createApp(App)
app.mount('#app')
