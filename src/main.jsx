import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Busquedas from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Busquedas />
  </StrictMode>,
)
