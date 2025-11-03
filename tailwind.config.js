/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 使用 class 策略，这样只有在 HTML 有 dark 类时才会启用暗色模式
  // 我们在 main.tsx 中强制移除了 dark 类，所以暗色模式永远不会生效
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
