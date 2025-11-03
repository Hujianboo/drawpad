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
  currentTool: 'pen' | 'eraser' | 'eyedropper' | 'bucket'
  brushSize?: number
  clearTrigger?: number
  exportTrigger?: number
  importTrigger?: number
  onColorPick?: (color: string) => void
  onToolChange?: (tool: 'pen' | 'eraser' | 'eyedropper' | 'bucket') => void
}

export default function PixelCanvas({
  gridSize = 32,
  pixelSize = 20,
  currentColor,
  currentTool,
  brushSize = 1,
  clearTrigger,
  exportTrigger,
  importTrigger,
  onColorPick,
  onToolChange,
}: PixelCanvasProps) {
  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map())
  const [isDrawing, setIsDrawing] = useState(false)
  const stageRef = useRef<Konva.Stage>(null)
  const lastPosRef = useRef<{ col: number; row: number } | null>(null)

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

  // 导入图片
  useEffect(() => {
    if (importTrigger && importTrigger > 0) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            // 创建临时 canvas 来读取图片像素
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // 设置 canvas 大小为网格大小
            canvas.width = gridSize
            canvas.height = gridSize

            // 将图片绘制到 canvas 上，自动缩放到网格大小
            ctx.drawImage(img, 0, 0, gridSize, gridSize)

            // 读取像素数据
            const imageData = ctx.getImageData(0, 0, gridSize, gridSize)
            const data = imageData.data

            // 转换为像素数据
            const newPixels = new Map<string, PixelData>()
            for (let row = 0; row < gridSize; row++) {
              for (let col = 0; col < gridSize; col++) {
                const index = (row * gridSize + col) * 4
                const r = data[index]
                const g = data[index + 1]
                const b = data[index + 2]
                const a = data[index + 3]

                // 只有不透明的像素才添加（透明度大于 128）
                if (a > 128) {
                  const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                  newPixels.set(`${col},${row}`, {
                    x: col * pixelSize,
                    y: row * pixelSize,
                    color: color,
                  })
                }
              }
            }

            setPixels(newPixels)
          }
          img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
      }

      input.click()
    }
  }, [importTrigger, gridSize, pixelSize])

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

  // 收集需要绘制的像素到 Map 中（不触发状态更新）
  const collectPixels = useCallback(
    (col: number, row: number, pixelsToUpdate: Map<string, PixelData | null>) => {
      if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) return

      const key = `${col},${row}`
      if (currentTool === 'eraser') {
        pixelsToUpdate.set(key, null) // null 表示删除
      } else {
        pixelsToUpdate.set(key, {
          x: col * pixelSize,
          y: row * pixelSize,
          color: currentColor,
        })
      }
    },
    [currentColor, currentTool, gridSize, pixelSize]
  )

  // 收集画笔区域的像素（不触发状态更新）
  const collectBrushPixels = useCallback(
    (centerCol: number, centerRow: number, pixelsToUpdate: Map<string, PixelData | null>) => {
      const radius = Math.floor(brushSize / 2)

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          collectPixels(centerCol + dx, centerRow + dy, pixelsToUpdate)
        }
      }
    },
    [brushSize, collectPixels]
  )

  // 批量应用像素更新
  const applyPixelUpdates = useCallback((pixelsToUpdate: Map<string, PixelData | null>) => {
    setPixels((prev) => {
      const newPixels = new Map(prev)
      pixelsToUpdate.forEach((pixelData, key) => {
        if (pixelData === null) {
          newPixels.delete(key)
        } else {
          newPixels.set(key, pixelData)
        }
      })
      return newPixels
    })
  }, [])

  // Bresenham 直线算法 - 填补两点之间的像素（支持画笔大小，批量更新）
  const drawLine = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const dx = Math.abs(x1 - x0)
      const dy = Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx - dy

      let x = x0
      let y = y0

      // 收集所有需要更新的像素
      const pixelsToUpdate = new Map<string, PixelData | null>()

      while (true) {
        // 根据画笔大小收集像素
        if (brushSize === 1) {
          collectPixels(x, y, pixelsToUpdate)
        } else {
          collectBrushPixels(x, y, pixelsToUpdate)
        }

        if (x === x1 && y === y1) break

        const e2 = 2 * err
        if (e2 > -dy) {
          err -= dy
          x += sx
        }
        if (e2 < dx) {
          err += dx
          y += sy
        }
      }

      // 一次性应用所有更新
      applyPixelUpdates(pixelsToUpdate)
    },
    [brushSize, collectPixels, collectBrushPixels, applyPixelUpdates]
  )

  // 获取指定位置的颜色
  const getPixelColor = useCallback(
    (col: number, row: number, pixelsMap: Map<string, PixelData>): string | null => {
      const key = `${col},${row}`
      const pixel = pixelsMap.get(key)
      return pixel ? pixel.color : null
    },
    []
  )

  // 油漆桶填充算法（Flood Fill）
  const floodFill = useCallback(
    (startCol: number, startRow: number) => {
      setPixels((prev) => {
        const newPixels = new Map(prev)
        const targetColor = getPixelColor(startCol, startRow, prev)
        const fillColor = currentColor

        // 如果目标颜色和填充颜色相同，不需要填充
        if (targetColor === fillColor) {
          return prev
        }

        // 使用队列实现广度优先搜索（BFS）
        const queue: Array<{ col: number; row: number }> = [{ col: startCol, row: startRow }]
        const visited = new Set<string>()

        while (queue.length > 0) {
          const { col, row } = queue.shift()!
          const key = `${col},${row}`

          // 检查是否越界或已访问
          if (col < 0 || col >= gridSize || row < 0 || row >= gridSize || visited.has(key)) {
            continue
          }

          // 检查当前像素颜色是否与目标颜色匹配
          const currentPixelColor = getPixelColor(col, row, newPixels)
          if (currentPixelColor !== targetColor) {
            continue
          }

          // 标记为已访问
          visited.add(key)

          // 填充当前像素
          newPixels.set(key, {
            x: col * pixelSize,
            y: row * pixelSize,
            color: fillColor,
          })

          // 将四个相邻像素加入队列
          queue.push({ col: col + 1, row })
          queue.push({ col: col - 1, row })
          queue.push({ col, row: row + 1 })
          queue.push({ col, row: row - 1 })
        }

        return newPixels
      })
    },
    [currentColor, gridSize, pixelSize, getPixelColor]
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

    // 油漆桶工具
    if (currentTool === 'bucket') {
      floodFill(coords.col, coords.row)
      return
    }

    // 其他工具（画笔和橡皮擦）
    setIsDrawing(true)
    lastPosRef.current = coords

    // 批量绘制初始点击
    const pixelsToUpdate = new Map<string, PixelData | null>()
    if (brushSize === 1) {
      collectPixels(coords.col, coords.row, pixelsToUpdate)
    } else {
      collectBrushPixels(coords.col, coords.row, pixelsToUpdate)
    }
    applyPixelUpdates(pixelsToUpdate)
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
      // 如果有上一个位置，使用直线算法填补间隙
      if (lastPosRef.current) {
        drawLine(lastPosRef.current.col, lastPosRef.current.row, coords.col, coords.row)
      } else {
        // 单点绘制（理论上不会走到这里，因为 mouseDown 已经设置了 lastPosRef）
        const pixelsToUpdate = new Map<string, PixelData | null>()
        if (brushSize === 1) {
          collectPixels(coords.col, coords.row, pixelsToUpdate)
        } else {
          collectBrushPixels(coords.col, coords.row, pixelsToUpdate)
        }
        applyPixelUpdates(pixelsToUpdate)
      }
      lastPosRef.current = coords
    }
  }

  // 鼠标抬起
  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPosRef.current = null
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
        style={{ cursor: currentTool === 'eyedropper' ? 'crosshair' : currentTool === 'bucket' ? 'pointer' : 'default' }}
      >
        <Layer>
          {/* 背景 */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />

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
