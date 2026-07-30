import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pannellum/build/pannellum.css'
import './index.css'
import App from './App.tsx'
import { hasUsionHost, initUsion } from './lib/usion'

const root = createRoot(document.getElementById('root')!)

function renderApp(embedded: boolean) {
  root.render(
    <StrictMode>
      <App embedded={embedded} />
    </StrictMode>,
  )
}

async function boot() {
  if (!hasUsionHost()) {
    renderApp(false)
    return
  }

  try {
    await initUsion()
    renderApp(true)
  } catch {
    root.render(
      <main className="boot-state boot-state--error">
        <h1>Could not open PanoPassport</h1>
        <p>Return to Usion and try opening the game again.</p>
      </main>,
    )
  }
}

void boot()
