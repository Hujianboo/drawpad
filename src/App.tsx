import { useState, useCallback, useEffect, useRef } from 'react'
import DrawingToolbar from './components/DrawingToolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { PixelCanvas, type PixelCanvasHandle } from './components/PixelCanvas'
import { TopControlBar } from './components/TopControlBar'

function App() {
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'eyedropper' | 'bucket'>('pen')
  const [gridSize, setGridSize] = useState(24)
  const [brushSize, setBrushSize] = useState(1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showCheckerboard, setShowCheckerboard] = useState(true)

  // ⭐ 创建 ref
  const canvasRef = useRef<PixelCanvasHandle>(null)

  // ⭐ 直接调用 ref 的方法
  const handleClear = useCallback(() => {
    if (confirm('确定要清空画布吗？')) {
      canvasRef.current?.clear()
    }
  }, [])

  const handleExport = useCallback(() => {
    canvasRef.current?.exportImage()
  }, [])

  const handleImport = useCallback(() => {
    canvasRef.current?.importImage()
  }, [])

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo()
  }, [])

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo()
  }, [])

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
      canvasRef.current?.clear()
  }, [])



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
        currentColor={currentColor}
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
            ref={canvasRef}
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
