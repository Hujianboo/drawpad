import { useState, useCallback, useEffect } from 'react'
import DrawingToolbar from './components/DrawingToolbar'
import CanvasArea from './components/CanvasArea'
import SavedFilesList from './components/SavedFilesList'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'eyedropper' | 'bucket'>('pen')
  const [clearTrigger, setClearTrigger] = useState(0)
  const [exportTrigger, setExportTrigger] = useState(0)
  const [importTrigger, setImportTrigger] = useState(0)
  const [gridSize, setGridSize] = useState(24)
  const [brushSize, setBrushSize] = useState(1)
  const [savedProjects, setSavedProjects] = useState<Array<{
    id: string
    name: string
    thumbnail?: string
    createdAt: Date
  }>>([])

  // 从本地存储加载项目列表
  useEffect(() => {
    const stored = localStorage.getItem('pixelpad_projects')
    if (stored) {
      try {
        const projects = JSON.parse(stored)
        setSavedProjects(projects.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        })))
      } catch (e) {
        console.error('Failed to load projects:', e)
      }
    }
  }, [])

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

  const handleSave = useCallback(() => {
    const projectName = prompt('请输入项目名称：')
    if (!projectName) return

    // 创建新项目
    const newProject = {
      id: Date.now().toString(),
      name: projectName,
      createdAt: new Date(),
    }

    const updatedProjects = [...savedProjects, newProject]
    setSavedProjects(updatedProjects)

    // 保存到本地存储
    localStorage.setItem('pixelpad_projects', JSON.stringify(updatedProjects))
    alert('项目已保存！')
  }, [savedProjects])

  const handleLoadProject = useCallback((id: string) => {
    const project = savedProjects.find(p => p.id === id)
    if (project) {
      alert(`加载项目: ${project.name}`)
      // TODO: 实现实际的加载逻辑
    }
  }, [savedProjects])

  // 根据网格大小动态计算像素大小，保持画布总体大小合理
  const getPixelSize = (size: number) => {
    if (size <= 24) return 20
    if (size <= 32) return 16
    if (size <= 48) return 12
    if (size <= 64) return 8
    if (size <= 128) return 4
    return 2
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧工具栏 */}
        <DrawingToolbar
          currentColor={currentColor}
          currentTool={currentTool}
          brushSize={brushSize}
          onColorChange={setCurrentColor}
          onToolChange={setCurrentTool}
          onBrushSizeChange={setBrushSize}
        />

        {/* 中间画布区域 */}
        <CanvasArea
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
          onGridSizeChange={handleGridSizeChange}
          onClear={handleClear}
          onExport={handleExport}
          onSave={handleSave}
        />

        {/* 右侧文件列表 */}
        <SavedFilesList
          savedProjects={savedProjects}
          onLoadProject={handleLoadProject}
        />
      </div>
    </div>
  )
}

export default App
