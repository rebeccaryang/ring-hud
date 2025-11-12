import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { Ring } from './lib/ring'
import { loadConfig, configForBundleId } from './lib/config'
import { runAction } from './lib/actions'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

function App() {
  const [visible] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  useEffect(() => {
    async function init() {
      const cfg = await loadConfig()
      const bundleId = await invoke<string>('frontmost_bundle_id').catch(() => undefined)
      const ring = await configForBundleId(cfg, bundleId)
      setItems(ring.ring)
    }
    init()

    const unlisten = listen<{ dx: number; dy: number }>('hud-offset', (e) => {
      setOffset({ dx: e.payload.dx ?? 0, dy: e.payload.dy ?? 0 })
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  return (
    <div
      className="overlay"
      data-visible={visible}
      style={{ ['--offset-x' as any]: `${offset.dx}px`, ['--offset-y' as any]: `${offset.dy}px` }}
    >
      <Ring items={items.map(a => ({ label: a.label, onClick: () => runAction(a) }))} />
      <div className="hint">Esc to close • Click outside to close</div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
