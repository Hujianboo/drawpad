import { useState } from 'react'
import PixelCanvas from './PixelCanvas'

interface CanvasAreaProps {
  gridSize: number
  pixelSize: number
  currentColor: string
  currentTool: 'pen' | 'eraser' | 'eyedropper' | 'bucket'
  brushSize: number
  clearTrigger: number
  exportTrigger: number
  importTrigger: number
  onColorPick: (color: string) => void
  onToolChange: (tool: 'pen' | 'eraser' | 'eyedropper' | 'bucket') => void
  onGridSizeChange: (size: number) => void
  onClear: () => void
  onExport: () => void
  onSave: () => void
}

export default function CanvasArea({
  gridSize,
  pixelSize,
  currentColor,
  currentTool,
  brushSize,
  clearTrigger,
  exportTrigger,
  importTrigger,
  onColorPick,
  onToolChange,
  onGridSizeChange,
  onClear,
  onExport,
  onSave,
}: CanvasAreaProps) {
  const [projectName, setProjectName] = useState('')

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* 顶部控制栏 */}
      <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Enter project name..."
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
          New Canvas
        </button>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <PixelCanvas
          gridSize={gridSize}
          pixelSize={pixelSize}
          currentColor={currentColor}
          currentTool={currentTool}
          brushSize={brushSize}
          clearTrigger={clearTrigger}
          exportTrigger={exportTrigger}
          importTrigger={importTrigger}
          onColorPick={onColorPick}
          onToolChange={onToolChange}
        />
      </div>

      {/* 底部控制栏 */}
      <div className="p-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* TOY MODE 标签 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGridSizeChange(Math.max(16, gridSize / 2))}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Toy Mode</span>
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded font-medium text-sm">
                {gridSize} X {gridSize}
              </div>
            </div>

            <button
              onClick={() => onGridSizeChange(Math.min(256, gridSize * 2))}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 颜色指示器 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#000000' }}></div>
            <div className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600" style={{ backgroundColor: currentColor }}></div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClear}
            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Clear
          </button>

          <button
            onClick={onExport}
            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
          >
            Export
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button
            onClick={onSave}
            className="px-8 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
