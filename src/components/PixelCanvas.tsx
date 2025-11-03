import { useRef, useState, useCallback, useEffect } from 'react'
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
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)

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

  // 批量应用像素更新（增量更新到离屏canvas）
  const applyPixelUpdates = useCallback((pixelsToUpdate: Map<string, PixelData | null>) => {
    const offscreenCtx = offscreenCtxRef.current

    setPixels((prev) => {
      const newPixels = new Map(prev)

      // 如果有离屏canvas，立即增量更新
      if (offscreenCtx) {
        pixelsToUpdate.forEach((pixelData, key) => {
          if (pixelData === null) {
            // 删除像素 - 清除该区域
            const oldPixel = prev.get(key)
            if (oldPixel) {
              offscreenCtx.clearRect(oldPixel.x, oldPixel.y, pixelSize, pixelSize)
            }
            newPixels.delete(key)
          } else {
            // 添加或更新像素
            offscreenCtx.fillStyle = pixelData.color
            offscreenCtx.fillRect(pixelData.x, pixelData.y, pixelSize, pixelSize)
            newPixels.set(key, pixelData)
          }
        })

        // 触发Konva重绘
        if (stageRef.current) {
          const pixelsImage = (stageRef.current as any).pixelsImage
          if (pixelsImage) {
            pixelsImage.getLayer()?.batchDraw()
          }
        }
      } else {
        // 没有离屏canvas时的回退逻辑
        pixelsToUpdate.forEach((pixelData, key) => {
          if (pixelData === null) {
            newPixels.delete(key)
          } else {
            newPixels.set(key, pixelData)
          }
        })
      }

      return newPixels
    })
  }, [pixelSize])

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

  // 油漆桶填充算法（Flood Fill）- 使用增量更新和批量重绘
  const floodFill = useCallback(
    (startCol: number, startRow: number) => {
      const offscreenCtx = offscreenCtxRef.current

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
1

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
          const pixelData = {
            x: col * pixelSize,
            y: row * pixelSize,
            color: fillColor,
          }
          newPixels.set(key, pixelData)

          // 增量更新到离屏canvas
          if (offscreenCtx) {
            offscreenCtx.fillRect(pixelData.x, pixelData.y, pixelSize, pixelSize)
          }

          // 将四个相邻像素加入队列
          queue.push({ col: col + 1, row })
          queue.push({ col: col - 1, row })
          queue.push({ col, row: row + 1 })
          queue.push({ col, row: row - 1 })
        }

        // 最终重绘
        if (offscreenCtx && stageRef.current) {
          const pixelsImage = (stageRef.current as any).pixelsImage
          if (pixelsImage) {
            pixelsImage.getLayer()?.batchDraw()
          }
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

  // 初始化离屏canvas和Konva Stage
  useEffect(() => {
    // 创建离屏canvas用于缓存像素
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvasWidth
    offscreenCanvas.height = canvasHeight
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })
    if (!offscreenCtx) return

    offscreenCanvasRef.current = offscreenCanvas
    offscreenCtxRef.current = offscreenCtx

    // 销毁旧的 stage
    if (stageRef.current) {
      stageRef.current.destroy()
      stageRef.current = null
    }

    const stage = new Konva.Stage({
      container: 'canvas-container',
      width: canvasWidth,
      height: canvasHeight,
    })

    const layer = new Konva.Layer()
    stage.add(layer)

    // 背景
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      fill: '#ffffff',
    })
    layer.add(background)

    // 使用自定义 Shape 一次性绘制所有网格线
    const gridShape = new Konva.Shape({
      sceneFunc: (context) => {
        context.beginPath()
        context.strokeStyle = '#f0f0f0'
        context.lineWidth = 1

        // 绘制垂直线
        for (let i = 0; i <= gridSize; i++) {
          const x = i * pixelSize
          context.moveTo(x, 0)
          context.lineTo(x, canvasHeight)
        }

        // 绘制水平线
        for (let i = 0; i <= gridSize; i++) {
          const y = i * pixelSize
          context.moveTo(0, y)
          context.lineTo(canvasWidth, y)
        }

        context.stroke()
      },
    })
    // layer.add(gridShape)

    // 使用Image来渲染离屏canvas的内容
    const pixelsImage = new Konva.Image({
      x: 0,
      y: 0,
      image: offscreenCanvas,
    })
    layer.add(pixelsImage)

    // 存储引用
    ;(stage as any).pixelsImage = pixelsImage
    ;(stage as any).offscreenCanvas = offscreenCanvas
    ;(stage as any).offscreenCtx = offscreenCtx

    layer.draw()
    stageRef.current = stage

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy()
        stageRef.current = null
      }
      offscreenCanvasRef.current = null
      offscreenCtxRef.current = null
    }
  }, [canvasWidth, canvasHeight, gridSize, pixelSize])

  // 更新事件监听器
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleMouseDownWrapper = () => {
      const pos = stage.getPointerPosition()
      if (!pos) return
      handleMouseDown({ target: { getStage: () => stage } } as any)
    }

    const handleMouseMoveWrapper = () => {
      handleMouseMove({ target: { getStage: () => stage } } as any)
    }

    const handleMouseUpWrapper = () => {
      handleMouseUp()
    }

    // 移除旧的事件监听器
    stage.off('mousedown')
    stage.off('mousemove')
    stage.off('mouseup')
    stage.off('mouseleave')

    // 添加新的事件监听器
    stage.on('mousedown', handleMouseDownWrapper)
    stage.on('mousemove', handleMouseMoveWrapper)
    stage.on('mouseup', handleMouseUpWrapper)
    stage.on('mouseleave', handleMouseUpWrapper)

    return () => {
      stage.off('mousedown', handleMouseDownWrapper)
      stage.off('mousemove', handleMouseMoveWrapper)
      stage.off('mouseup', handleMouseUpWrapper)
      stage.off('mouseleave', handleMouseUpWrapper)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  // 更新像素渲染 - 使用离屏canvas优化
  useEffect(() => {
    const stage = stageRef.current
    const offscreenCtx = offscreenCtxRef.current
    const offscreenCanvas = offscreenCanvasRef.current

    if (!stage || !offscreenCtx || !offscreenCanvas) return

    // 清空离屏canvas
    offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 在离屏canvas上绘制所有像素
    pixels.forEach((pixel) => {
      offscreenCtx.fillStyle = pixel.color
      offscreenCtx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
    })

    // 更新Konva Image
    const pixelsImage = (stage as any).pixelsImage
    if (pixelsImage) {
      pixelsImage.getLayer()?.batchDraw()
    }
  }, [pixels, canvasWidth, canvasHeight, pixelSize])

  // 更新鼠标样式
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container()
      switch (currentTool) {
        case 'pen':
          container.style.cursor = 'crosshair'
          break
        case 'eraser':
          container.style.cursor = 'cell'
          break
        case 'bucket':
          container.style.cursor = 'cell'
          break
        case 'eyedropper':
          container.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'black\'><path d=\'M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z\'/></svg>") 0 20, crosshair'
          break
        default:
          container.style.cursor = 'default'
      }
    }
  }, [currentTool])

  return (
    <div className="inline-block border border-gray-300 shadow-sm">
      <div id="canvas-container"></div>
    </div>
  )
}
