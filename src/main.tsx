import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 强制移除暗色模式，确保永远使用亮色模式
const html = document.documentElement
html.classList.remove('dark')
html.classList.add('light')

// 监听类名变化，防止被添加 dark 类
const observer = new MutationObserver(() => {
  if (html.classList.contains('dark')) {
    html.classList.remove('dark')
    html.classList.add('light')
  }
})
observer.observe(html, { attributes: true, attributeFilter: ['class'] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
