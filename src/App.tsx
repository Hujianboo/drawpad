import { useState, useCallback, useEffect } from 'react'
import DrawingToolbar from './components/DrawingToolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { PixelCanvas } from './components/PixelCanvas'
import { TopControlBar } from './components/TopControlBar'
import { usePixelStore } from './store/usePixelStore'

function App() {
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'eyedropper' | 'bucket'>('pen')
  const [gridSize, setGridSize] = useState(24)
  const [brushSize, setBrushSize] = useState(1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showCheckerboard, setShowCheckerboard] = useState(true)

  // 从 store 获取操作方法
  const clearStore = usePixelStore((state) => state.clear)
  const resizeCanvas = usePixelStore((state) => state.resizeCanvas)
  const exportImage = usePixelStore((state) => state.exportImage)
  const importImage = usePixelStore((state) => state.importImage)
  const undo = usePixelStore((state) => state.undo)
  const redo = usePixelStore((state) => state.redo)

  // ⭐ 直接调用 store 的方法
  const handleClear = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      clearStore()
    }
  }, [clearStore])

  const handleExport = useCallback(() => {
    exportImage()
  }, [exportImage])

  const handleImport = useCallback(() => {
    importImage()
  }, [importImage])

  const handleUndo = useCallback(() => {
    undo()
  }, [undo])

  const handleRedo = useCallback(() => {
    redo()
  }, [redo])

  const handleHistoryChange = useCallback((undo: boolean, redo: boolean) => {
    setCanUndo(undo)
    setCanRedo(redo)
  }, [])

  // ⭐ 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])


  const handleGridSizeChange = useCallback((newSize: number) => {
      setGridSize(newSize)
      const newPixelSize = getPixelSize(newSize)
      resizeCanvas(newSize, newPixelSize)
  }, [resizeCanvas])



  // 固定画布大小（像素）
  const FIXED_CANVAS_SIZE = 600

  // 根据网格大小动态计算像素大小，保持画布总体大小固定
  const getPixelSize = (size: number) => {
    return FIXED_CANVAS_SIZE / size
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部控制栏 */}
      <TopControlBar
        gridSize={gridSize}
        canUndo={canUndo}
        canRedo={canRedo}
        onGridSizeChange={handleGridSizeChange}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧工具栏 */}
        <DrawingToolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
        />

        {/* 中间画布区域 */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <PixelCanvas
            gridSize={gridSize}
            pixelSize={getPixelSize(gridSize)}
            currentColor={currentColor}
            currentTool={currentTool}
            brushSize={brushSize}
            showCheckerboard={showCheckerboard}
            onColorPick={setCurrentColor}
            onToolChange={setCurrentTool}
            onHistoryChange={handleHistoryChange}
          />
        </div>

        {/* 右侧属性面板 */}
        <PropertiesPanel
          currentColor={currentColor}
          brushSize={brushSize}
          showCheckerboard={showCheckerboard}
          onColorChange={setCurrentColor}
          onBrushSizeChange={setBrushSize}
          onShowCheckerboardChange={setShowCheckerboard}
          onColorPick={() => setCurrentTool('eyedropper')}
        />
      </div>
    </div>
  )
}

export default App
