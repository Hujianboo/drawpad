interface HeaderProps {
  darkMode: boolean
  onDarkModeToggle: () => void
}

export default function Header({ darkMode, onDarkModeToggle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6">
      {/* 左侧 Logo 和标签页 */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold dark:text-white">pixel</span>
        </div>

        <div className="flex gap-4">
          <button className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium">
            Draw
          </button>
          <button className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium">
            Animate
          </button>
        </div>
      </div>

      {/* 右侧按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onDarkModeToggle}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <span>Dark Mode</span>
          <div className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-gray-800' : 'bg-gray-300'} relative`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
          </div>
        </button>

        <button className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
          Buy me a Coffee
        </button>
      </div>
    </header>
  )
}
