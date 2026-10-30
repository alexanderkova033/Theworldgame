import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Tooltips } from './presentation/components/Tooltips'
import { PhoneNotice } from './presentation/components/PhoneNotice'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Tooltips />
    <PhoneNotice />
  </StrictMode>,
)
