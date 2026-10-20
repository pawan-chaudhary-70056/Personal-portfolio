import '@fontsource/dm-serif-display/400.css'
import '@fontsource-variable/inter/index.css'
import '@/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from '@/routes/AppRouter'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
