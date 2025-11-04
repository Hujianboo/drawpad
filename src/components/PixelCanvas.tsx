import { useRef, useCallback, useEffect } from 'react'
import Konva from 'konva'
import { usePixelStore, type PixelData } from '../store/usePixelStore'

interface PixelCanvasProps {
  gridSize?: number
  pixelSize?: number
  currentColor: string
  currentTool: 'pen' | 'eraser' | 'eyedropper' | 'bucket'
  brushSize?: number
  showCheckerboard?: boolean
  onColorPick?: (color: string) => void
  onToolChange?: (tool: 'pen' | 'eraser' | 'eyedropper' | 'bucket') => void
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
}

export const PixelCanvas = ({
  gridSize = 32,
  pixelSize = 20,
  currentColor,
  currentTool,
  brushSize = 1,
  showCheckerboard = true,
  onColorPick,
  onToolChange,
  onHistoryChange,
}: PixelCanvasProps) => {
  // 使用 zustand store 管理数据状态
  const pixels = usePixelStore((state) => state.pixels)
  const isDrawing = usePixelStore((state) => state.isDrawing)
  const setIsDrawing = usePixelStore((state) => state.setIsDrawing)
  const updatePixels = usePixelStore((state) => state.updatePixels)
  const saveHistory = usePixelStore((state) => state.saveHistory)
  const canUndo = usePixelStore((state) => state.canUndo)
  const canRedo = usePixelStore((state) => state.canRedo)
  const getPixelAt = usePixelStore((state) => state.getPixelAt)
  const setOffscreenCanvas = usePixelStore((state) => state.setOffscreenCanvas)
  const setGridSize = usePixelStore((state) => state.setGridSize)
  const setPixelSize = usePixelStore((state) => state.setPixelSize)

  // Konva 和 Canvas 相关的 refs（不放入 zustand）
  const stageRef = useRef<Konva.Stage>(null)
  const lastPosRef = useRef<{ col: number; row: number } | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const showCheckerboardRef = useRef(showCheckerboard)

  // 更新 ref 当 showCheckerboard 改变时
  useEffect(() => {
    showCheckerboardRef.current = showCheckerboard
  }, [showCheckerboard])

  const canvasWidth = gridSize * pixelSize
  const canvasHeight = gridSize * pixelSize

  // 通知历史状态变化
  const notifyHistoryChange = useCallback(() => {
    if (onHistoryChange) {
      onHistoryChange(canUndo(), canRedo())
    }
  }, [onHistoryChange, canUndo, canRedo])

  // 监听历史状态变化并通知父组件
  useEffect(() => {
    notifyHistoryChange()
  }, [pixels, notifyHistoryChange])

  // 恢复离屏Canvas
  const restoreOffscreenCanvas = useCallback((pixelsMap: Map<string, PixelData>) => {
    const offscreenCtx = offscreenCtxRef.current
    if (!offscreenCtx) return

    // 清空整个画布为透明
    offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 绘制所有像素 - 使用稍大的尺寸消除缝隙
    pixelsMap.forEach((pixel) => {
      offscreenCtx.fillStyle = pixel.color
      offscreenCtx.fillRect(
        pixel.x,
        pixel.y,
        pixelSize + 0.5,
        pixelSize + 0.5
      )
    })

    if (stageRef.current) {
      const pixelsImage = (stageRef.current as any).pixelsImage
      if (pixelsImage) {
        pixelsImage.getLayer()?.batchDraw()
      }
    }
  }, [canvasWidth, canvasHeight, pixelSize])

  // 监听 pixels 变化来重绘画布（用于撤销/重做/清空/导入）
  useEffect(() => {
    // 只在非绘制状态下（即外部操作如撤销、重做等）才完全重绘
    if (!isDrawing && offscreenCtxRef.current) {
      restoreOffscreenCanvas(pixels)
    }
  }, [pixels, isDrawing, restoreOffscreenCanvas])
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

    // 如果有离屏canvas，立即增量更新
    if (offscreenCtx) {
      pixelsToUpdate.forEach((pixelData, key) => {
        if (pixelData === null) {
          // 删除像素 - 从 key 中解析坐标并清除为透明
          const [colStr, rowStr] = key.split(',')
          const col = parseInt(colStr, 10)
          const row = parseInt(rowStr, 10)
          const x = col * pixelSize
          const y = row * pixelSize

          offscreenCtx.clearRect(x, y, pixelSize + 0.5, pixelSize + 0.5)
        } else {
          // 添加或更新像素 - 使用稍大的尺寸消除缝隙
          offscreenCtx.fillStyle = pixelData.color
          offscreenCtx.fillRect(
            pixelData.x,
            pixelData.y,
            pixelSize + 0.5,
            pixelSize + 0.5
          )
        }
      })

      // 触发Konva重绘
      if (stageRef.current) {
        const pixelsImage = (stageRef.current as any).pixelsImage
        if (pixelsImage) {
          pixelsImage.getLayer()?.batchDraw()
        }
      }
    }

    // 更新 zustand store
    updatePixels(pixelsToUpdate)
  }, [pixelSize, updatePixels])

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

  // 油漆桶填充算法（Flood Fill）- 使用增量更新和批量重绘
  const floodFill = useCallback(
    (startCol: number, startRow: number) => {
      const offscreenCtx = offscreenCtxRef.current

      // 获取当前像素数据的副本
      const currentPixels = new Map(pixels)
      const targetColor = getPixelAt(startCol, startRow)?.color || null
      const fillColor = currentColor

      // 如果目标颜色和填充颜色相同，不需要填充
      if (targetColor === fillColor) {
        return
      }

      const newPixels = new Map(currentPixels)
      const pixelsToUpdate = new Map<string, PixelData | null>()

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
        const currentPixelColor = newPixels.get(key)?.color || null
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
        pixelsToUpdate.set(key, pixelData)

        // 增量更新到离屏canvas - 使用稍大的尺寸消除缝隙
        if (offscreenCtx) {
          offscreenCtx.fillStyle = fillColor
          offscreenCtx.fillRect(pixelData.x, pixelData.y, pixelSize + 0.5, pixelSize + 0.5)
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

      // 更新 store
      updatePixels(pixelsToUpdate)
      // 保存历史记录
      saveHistory()
    },
    [currentColor, gridSize, pixelSize, pixels, getPixelAt, updatePixels, saveHistory]
  )

  // 鼠标按下
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    const coords = getPixelCoords(pos.x, pos.y)
    if (!coords) return

    // 吸色器工具 - 从画面上吸取任意颜色
    if (currentTool === 'eyedropper') {
      // 使用 Konva 的 toCanvas 方法获取当前画面
      const canvas = stage.toCanvas()
      const ctx = canvas.getContext('2d')
      if (ctx && onColorPick) {
        // 获取点击位置的像素颜色
        const imageData = ctx.getImageData(pos.x, pos.y, 1, 1)
        const [r, g, b, a] = imageData.data

        // 只有不透明的像素才吸取
        if (a > 0) {
          // 转换为十六进制颜色
          const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
          onColorPick(color)

          // 吸色成功后自动切换回画笔工具
          if (onToolChange) {
            onToolChange('pen')
          }
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
  }, [currentTool, pixels, onColorPick, onToolChange, floodFill, setIsDrawing, getPixelCoords, brushSize, collectPixels, collectBrushPixels, applyPixelUpdates])

  // 鼠标移动 - 支持全局移动
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent> | MouseEvent) => {
    if (!isDrawing) return
    const stage = stageRef.current
    if (!stage) return

    // 获取鼠标位置
    let clientX: number, clientY: number
    if ('clientX' in e) {
      // 原生 MouseEvent
      clientX = e.clientX
      clientY = e.clientY
    } else {
      // Konva 事件
      const konvaStage = e.target.getStage()
      if (!konvaStage) return
      const pos = konvaStage.getPointerPosition()
      if (!pos) return

      // 将 stage 坐标转换为客户端坐标
      const container = konvaStage.container()
      const rect = container.getBoundingClientRect()
      clientX = rect.left + pos.x
      clientY = rect.top + pos.y
    }

    // 计算相对于 stage 的坐标
    const container = stage.container()
    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const coords = getPixelCoords(x, y)
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
  }, [isDrawing, getPixelCoords, drawLine, brushSize, collectPixels, collectBrushPixels, applyPixelUpdates])

  // 鼠标抬起
  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      // 绘制结束时保存历史记录
      saveHistory()
    }
    setIsDrawing(false)
    lastPosRef.current = null
  }, [isDrawing, saveHistory, setIsDrawing])

  // 初始化离屏canvas和Konva Stage
  useEffect(() => {
    // 创建离屏canvas用于缓存像素
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvasWidth
    offscreenCanvas.height = canvasHeight
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })
    if (!offscreenCtx) return

    // 禁用图像平滑（抗锯齿），确保像素艺术清晰锐利
    offscreenCtx.imageSmoothingEnabled = false

    offscreenCanvasRef.current = offscreenCanvas
    offscreenCtxRef.current = offscreenCtx

    // 将 canvas 引用和配置设置到 store
    setOffscreenCanvas(offscreenCanvas)
    setGridSize(gridSize)
    setPixelSize(pixelSize)

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

    // 背景（根据 showCheckerboardRef 决定样式）
    const background = new Konva.Shape({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      sceneFunc: (context) => {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvasWidth, canvasHeight)

        // 如果显示棋盘格，绘制灰色格子 - 使用 ref 来获取最新值
        if (showCheckerboardRef.current) {
          context.fillStyle = '#f0f0f0'
          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              // 棋盘格样式：当行列之和为奇数时绘制灰色
              if ((row + col) % 2 === 1) {
                context.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize)
              }
            }
          }
        }
      }
    })
    layer.add(background)

    // 保存背景引用，以便后续更新
    ;(stage as any).backgroundShape = background

    // 使用Image来渲染离屏canvas的内容
    const pixelsImage = new Konva.Image({
      x: 0,
      y: 0,
      image: offscreenCanvas,
      // 禁用 Konva 的图像平滑，确保像素艺术清晰
      imageSmoothingEnabled: false,
    })
    layer.add(pixelsImage)

    // 存储引用
    ;(stage as any).pixelsImage = pixelsImage
    ;(stage as any).offscreenCanvas = offscreenCanvas
    ;(stage as any).offscreenCtx = offscreenCtx
    layer.draw()
    stageRef.current = stage

    // 立即重绘现有的像素数据到新的离屏canvas（使用当前 store 中的 pixels）
    if (offscreenCtx) {
      const currentPixels = usePixelStore.getState().pixels
      if (currentPixels.size > 0) {
        currentPixels.forEach((pixel) => {
          offscreenCtx.fillStyle = pixel.color
          offscreenCtx.fillRect(
            pixel.x,
            pixel.y,
            pixelSize + 0.5,
            pixelSize + 0.5
          )
        })
        pixelsImage.getLayer()?.batchDraw()
      }
    }

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy()
        stageRef.current = null
      }
      offscreenCanvasRef.current = null
      offscreenCtxRef.current = null
      setOffscreenCanvas(null)
    }
  }, [canvasWidth, canvasHeight, gridSize, pixelSize, setOffscreenCanvas, setGridSize, setPixelSize])

  // 更新棋盘格背景显示
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const backgroundShape = (stage as any).backgroundShape as Konva.Shape | undefined
    if (backgroundShape) {
      // 强制重绘背景
      backgroundShape.draw()
      backgroundShape.getLayer()?.batchDraw()
    }
  }, [showCheckerboard])

  // 更新事件监听器
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleMouseDownWrapper = (e: Konva.KonvaEventObject<MouseEvent>) => {
      handleMouseDown(e)

      // 为画笔和橡皮擦工具添加全局监听
      if (currentTool === 'pen' || currentTool === 'eraser') {
        // 添加全局 mousemove 和 mouseup 监听
        const globalMouseMove = (e: MouseEvent) => {
          handleMouseMove(e)
        }

        const globalMouseUp = () => {
          handleMouseUp()
          // 移除全局监听
          document.removeEventListener('mousemove', globalMouseMove)
          document.removeEventListener('mouseup', globalMouseUp)
        }

        document.addEventListener('mousemove', globalMouseMove)
        document.addEventListener('mouseup', globalMouseUp)
      }
    }

    const handleMouseMoveWrapper = (e: Konva.KonvaEventObject<MouseEvent>) => {
      handleMouseMove(e)
    }

    const handleMouseUpWrapper = () => {
      handleMouseUp()
    }

    stage.off('mousedown')
    stage.off('mousemove')
    stage.off('mouseup')

    stage.on('mousedown', handleMouseDownWrapper)
    stage.on('mousemove', handleMouseMoveWrapper)
    stage.on('mouseup', handleMouseUpWrapper)

    return () => {
      stage.off('mousedown', handleMouseDownWrapper)
      stage.off('mousemove', handleMouseMoveWrapper)
      stage.off('mouseup', handleMouseUpWrapper)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, currentTool])

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

