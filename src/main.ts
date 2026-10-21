import './web-components/index'
import { registerCoreNodes } from './nodes/nodeLibrary'

registerCoreNodes()

const app = document.getElementById('app')
if (app) {
  const studio = document.createElement('axon-studio')
  app.appendChild(studio)
}
