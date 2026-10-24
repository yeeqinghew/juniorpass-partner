import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/theme.css'
import './index.css'
import './styles/workspace.css'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element was not found')

createRoot(rootElement).render(<App />)
