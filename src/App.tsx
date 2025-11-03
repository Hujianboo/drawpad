import { useState, useCallback } from 'react'
import PixelCanvas from './components/PixelCanvas'
import DrawingToolbar from './components/DrawingToolbar'

function App() {
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'eyedropper'>('pen')
  const [clearTrigger, setClearTrigger] = useState(0)
  const [exportTrigger, setExportTrigger] = useState(0)

  const handleClear = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      setClearTrigger((prev) => prev + 1)
    }
  }, [])

  const handleExport = useCallback(() => {
    setExportTrigger((prev) => prev + 1)
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左侧工具栏 */}
      <div className="w-64 border-r border-gray-300 bg-gray-100">
        <DrawingToolbar
          currentColor={currentColor}
          currentTool={currentTool}
          onColorChange={setCurrentColor}
          onToolChange={setCurrentTool}
          onClear={handleClear}
          onExport={handleExport}
        />
      </div>

      {/* 中间画布区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="mb-5 text-4xl font-bold text-gray-800">像素画板</h1>
        <PixelCanvas
          gridSize={32}
          pixelSize={20}
          currentColor={currentColor}
          currentTool={currentTool}
          clearTrigger={clearTrigger}
          exportTrigger={exportTrigger}
          onColorPick={setCurrentColor}
          onToolChange={setCurrentTool}
        />
        <p className="mt-5 text-gray-600">
          当前工具:{' '}
          <span className="font-semibold">
            {currentTool === 'pen' ? '画笔' : currentTool === 'eraser' ? '橡皮擦' : '吸色器'}
          </span>{' '}
          | 当前颜色: <span className="font-semibold">{currentColor}</span>
        </p>
      </div>
    </div>
  )
}

export default App
