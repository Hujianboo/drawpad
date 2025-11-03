import { useState, useCallback } from 'react'
import PixelCanvas from './components/PixelCanvas'
import DrawingToolbar from './components/DrawingToolbar'

function App() {
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'eyedropper' | 'bucket'>('pen')
  const [clearTrigger, setClearTrigger] = useState(0)
  const [exportTrigger, setExportTrigger] = useState(0)
  const [importTrigger, setImportTrigger] = useState(0)
  const [gridSize, setGridSize] = useState(32)
  const [brushSize, setBrushSize] = useState(1)

  const handleClear = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      setClearTrigger((prev) => prev + 1)
    }
  }, [])

  const handleExport = useCallback(() => {
    setExportTrigger((prev) => prev + 1)
  }, [])

  const handleImport = useCallback(() => {
    setImportTrigger((prev) => prev + 1)
  }, [])

  const handleGridSizeChange = useCallback((newSize: number) => {
    if (confirm(`切换到 ${newSize}×${newSize} 画布将清空当前内容，确定要继续吗？`)) {
      setGridSize(newSize)
      setClearTrigger((prev) => prev + 1)
    }
  }, [])

  // 根据网格大小动态计算像素大小，保持画布总体大小合理
  const getPixelSize = (size: number) => {
    if (size <= 32) return 20
    if (size <= 64) return 10
    if (size <= 128) return 5
    return 3 // 256×256
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左侧工具栏 */}
      <div className="w-64 border-r border-gray-300 bg-gray-100">
        <DrawingToolbar
          currentColor={currentColor}
          currentTool={currentTool}
          gridSize={gridSize}
          brushSize={brushSize}
          onColorChange={setCurrentColor}
          onToolChange={setCurrentTool}
          onClear={handleClear}
          onExport={handleExport}
          onImport={handleImport}
          onGridSizeChange={handleGridSizeChange}
          onBrushSizeChange={setBrushSize}
        />
      </div>

      {/* 中间画布区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="mb-5 text-4xl font-bold text-gray-800">像素画板</h1>
        <PixelCanvas
          gridSize={gridSize}
          pixelSize={getPixelSize(gridSize)}
          currentColor={currentColor}
          currentTool={currentTool}
          brushSize={brushSize}
          clearTrigger={clearTrigger}
          exportTrigger={exportTrigger}
          importTrigger={importTrigger}
          onColorPick={setCurrentColor}
          onToolChange={setCurrentTool}
        />
        <p className="mt-5 text-gray-600">
          当前工具:{' '}
          <span className="font-semibold">
            {currentTool === 'pen' ? '画笔' : currentTool === 'eraser' ? '橡皮擦' : currentTool === 'eyedropper' ? '吸色器' : '油漆桶'}
          </span>{' '}
          | 当前颜色: <span className="font-semibold">{currentColor}</span>
          {' '}| 画布尺寸: <span className="font-semibold">{gridSize}×{gridSize}</span>
        </p>
      </div>
    </div>
  )
}

export default App
