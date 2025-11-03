import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import Konva from 'konva'

interface PixelData {
  x: number
  y: number
  color: string
}

interface PixelCanvasProps {
  gridSize?: number
  pixelSize?: number
  currentColor: string
  currentTool: 'pen' | 'eraser' | 'eyedropper'
  clearTrigger?: number
  exportTrigger?: number
  onColorPick?: (color: string) => void
  onToolChange?: (tool: 'pen' | 'eraser' | 'eyedropper') => void
}

export default function PixelCanvas({
  gridSize = 32,
  pixelSize = 20,
  currentColor,
  currentTool,
  clearTrigger,
  exportTrigger,
  onColorPick,
  onToolChange,
}: PixelCanvasProps) {
  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map())
  const [isDrawing, setIsDrawing] = useState(false)
  const stageRef = useRef<Konva.Stage>(null)

  const canvasWidth = gridSize * pixelSize
  const canvasHeight = gridSize * pixelSize

  // 清空画布
  useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setPixels(new Map())
    }
  }, [clearTrigger])

  // 导出图片
  useEffect(() => {
    if (exportTrigger && exportTrigger > 0 && stageRef.current) {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2, // 更高质量
      })

      // 创建下载链接
      const link = document.createElement('a')
      link.download = `pixel-art-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    }
  }, [exportTrigger])

  // 获取像素坐标
  const getPixelCoords = useCallback(
    (x: number, y: number) => {
      const col = Math.floor(x / pixelSize)
      const row = Math.floor(y / pixelSize)
      if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        return { col, row }
      }
      return null
    },
    [pixelSize, gridSize]
  )

  // 绘制像素
  const drawPixel = useCallback(
    (col: number, row: number) => {
      const key = `${col},${row}`
      setPixels((prev) => {
        const newPixels = new Map(prev)
        if (currentTool === 'eraser') {
          newPixels.delete(key)
        } else {
          newPixels.set(key, {
            x: col * pixelSize,
            y: row * pixelSize,
            color: currentColor,
          })
        }
        return newPixels
      })
    },
    [currentColor, currentTool, pixelSize]
  )

  // 鼠标按下
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    const coords = getPixelCoords(pos.x, pos.y)
    if (!coords) return

    // 吸色器工具
    if (currentTool === 'eyedropper') {
      const key = `${coords.col},${coords.row}`
      const pixel = pixels.get(key)
      if (pixel && onColorPick) {
        onColorPick(pixel.color)
        // 吸色成功后自动切换回画笔工具
        if (onToolChange) {
          onToolChange('pen')
        }
      }
      return
    }

    // 其他工具
    setIsDrawing(true)
    drawPixel(coords.col, coords.row)
  }

  // 鼠标移动
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    const coords = getPixelCoords(pos.x, pos.y)
    if (coords) {
      drawPixel(coords.col, coords.row)
    }
  }

  // 鼠标抬起
  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // 生成网格线
  const gridLines = []
  // 垂直线
  for (let i = 0; i <= gridSize; i++) {
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i * pixelSize, 0, i * pixelSize, canvasHeight]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    )
  }
  // 水平线
  for (let i = 0; i <= gridSize; i++) {
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * pixelSize, canvasWidth, i * pixelSize]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    )
  }
  console.log(gridLines)
  return (
    <div className="inline-block border-2 border-gray-800 shadow-lg">
      <Stage
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={stageRef}
        style={{ cursor: currentTool === 'eyedropper' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* 背景 */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#000000" />

          {/* 网格线 */}
          {gridLines}

          {/* 像素 */}
          {Array.from(pixels.values()).map((pixel, index) => (
            <Rect
              key={index}
              x={pixel.x}
              y={pixel.y}
              width={pixelSize}
              height={pixelSize}
              fill={pixel.color}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
