import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Konva from 'konva'

interface PixelData {
  x: number
  y: number
  color: string
}
export interface PixelCanvasHandle {
  undo: () => void
  redo: () => void
  clear: () => void
  exportImage: () => void
  importImage: () => void
}

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
export const PixelCanvas = forwardRef<PixelCanvasHandle, PixelCanvasProps>(({
  gridSize = 32,
  pixelSize = 20,
  currentColor,
  currentTool,
  brushSize = 1,
  showCheckerboard = true,
  onColorPick,
  onToolChange,
  onHistoryChange,
}, ref) => {
  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map())
  const [isDrawing, setIsDrawing] = useState(false)
  const stageRef = useRef<Konva.Stage>(null)
  const lastPosRef = useRef<{ col: number; row: number } | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const showCheckerboardRef = useRef(showCheckerboard)
  //历史记录管理
  const historyRef = useRef<Map<string, PixelData>[]>([new Map()])
  const historyIndexRef = useRef(0)
  const isRestoringRef = useRef(false)

  // 更新 ref 当 showCheckerboard 改变时
  useEffect(() => {
    showCheckerboardRef.current = showCheckerboard
  }, [showCheckerboard])

  const canvasWidth = gridSize * pixelSize
  const canvasHeight = gridSize * pixelSize
    // 通知历史状态变化
  const notifyHistoryChange = useCallback(() => {
      if (onHistoryChange) {
        onHistoryChange(
          historyIndexRef.current > 0,
          historyIndexRef.current < historyRef.current.length - 1
        )
      }
    }, [onHistoryChange])
    // 保存历史记录
    const saveHistory = useCallback((newPixels: Map<string, PixelData>) => {
      if (isRestoringRef.current) return

      // 检查是否和当前历史状态相同，避免保存重复状态
      const currentState = historyRef.current[historyIndexRef.current]
      if (currentState && currentState.size === newPixels.size) {
        let isSame = true
        for (const [key, value] of newPixels) {
          const currentValue = currentState.get(key)
          if (!currentValue || currentValue.color !== value.color) {
            isSame = false
            break
          }
        }
        if (isSame) {
          return
        }
      }

      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
      historyRef.current.push(new Map(newPixels))
      historyIndexRef.current = historyRef.current.length - 1

      const MAX_HISTORY = 50
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift()
        historyIndexRef.current--
      }
      notifyHistoryChange()
    }, [notifyHistoryChange])
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

   // ⭐ 撤销方法
   const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--
      const previousState = historyRef.current[historyIndexRef.current]
      isRestoringRef.current = true
      setPixels(new Map(previousState))
      restoreOffscreenCanvas(previousState)
      isRestoringRef.current = false

      notifyHistoryChange()
    }
  }, [restoreOffscreenCanvas, notifyHistoryChange])

  // ⭐ 重做方法
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++
      const nextState = historyRef.current[historyIndexRef.current]
      
      isRestoringRef.current = true
      setPixels(new Map(nextState))
      restoreOffscreenCanvas(nextState)
      isRestoringRef.current = false

      notifyHistoryChange()
    }
  }, [restoreOffscreenCanvas, notifyHistoryChange])

  // ⭐ 清空画布方法
  const clear = useCallback(() => {
    const emptyMap = new Map<string, PixelData>()
    setPixels(emptyMap)
    historyRef.current = [emptyMap]
    historyIndexRef.current = 0

    const offscreenCtx = offscreenCtxRef.current
    if (offscreenCtx) {
      // 清空画布为透明
      offscreenCtx.clearRect(0, 0, canvasWidth, canvasHeight)
    }

    notifyHistoryChange()
  }, [canvasWidth, canvasHeight, notifyHistoryChange])

  // ⭐ 导出图片方法 - 只导出像素层，不包含背景
  const exportImage = useCallback(() => {
    const offscreenCanvas = offscreenCanvasRef.current
    if (!offscreenCanvas) return

    // 创建一个临时canvas，背景为白色
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvasWidth
    exportCanvas.height = canvasHeight
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) return

    // 填充白色背景
    exportCtx.fillStyle = '#ffffff'
    exportCtx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 将像素内容绘制到导出canvas上
    exportCtx.drawImage(offscreenCanvas, 0, 0)

    // 导出为PNG
    const dataUrl = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `pixel-art-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [canvasWidth, canvasHeight])

  // ⭐ 导入图片方法
  const importImage = useCallback(() => {
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
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          canvas.width = gridSize
          canvas.height = gridSize
          ctx.drawImage(img, 0, 0, gridSize, gridSize)

          const imageData = ctx.getImageData(0, 0, gridSize, gridSize)
          const data = imageData.data

          const newPixels = new Map<string, PixelData>()
          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              const index = (row * gridSize + col) * 4
              const r = data[index]
              const g = data[index + 1]
              const b = data[index + 2]
              const a = data[index + 3]

              if (a > 128) {
                const color = `#${r.toString(16).padStart(2, '0')}${g
                  .toString(16)
                  .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                newPixels.set(`${col},${row}`, {
                  x: col * pixelSize,
                  y: row * pixelSize,
                  color: color,
                })
              }
            }
          }

          setPixels(newPixels)
          restoreOffscreenCanvas(newPixels)
          saveHistory(newPixels)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }

    input.click()
  }, [gridSize, pixelSize, restoreOffscreenCanvas, saveHistory])

// ⭐ 使用 useImperativeHandle 暴露方法给父组件
useImperativeHandle(
  ref,
  () => ({
    undo,
    redo,
    clear,
    exportImage,
    importImage,
  }),
  [undo, redo, clear, exportImage, importImage]
)
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
            // 删除像素 - 从 key 中解析坐标并清除为透明
            const [colStr, rowStr] = key.split(',')
            const col = parseInt(colStr, 10)
            const row = parseInt(rowStr, 10)
            const x = col * pixelSize
            const y = row * pixelSize

            offscreenCtx.clearRect(x, y, pixelSize + 0.5, pixelSize + 0.5)
            newPixels.delete(key)
          } else {
            // 添加或更新像素 - 使用稍大的尺寸消除缝隙
            offscreenCtx.fillStyle = pixelData.color
            offscreenCtx.fillRect(
              pixelData.x,
              pixelData.y,
              pixelSize + 0.5,
              pixelSize + 0.5
            )
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
      // 不在这里保存历史记录，而是在绘制操作结束时保存
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

        // 保存历史记录
        saveHistory(newPixels)

        return newPixels
      })
    },
    [currentColor, gridSize, pixelSize, getPixelColor, saveHistory]
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

  // 鼠标移动 - 支持全局移动
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent> | MouseEvent) => {
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
  }

  // 鼠标抬起
  const handleMouseUp = () => {
    if (isDrawing) {
      // 绘制结束时保存历史记录
      setPixels((prev) => {
        saveHistory(prev)
        return prev
      })
    }
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

    // 禁用图像平滑（抗锯齿），确保像素艺术清晰锐利
    offscreenCtx.imageSmoothingEnabled = false

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

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy()
        stageRef.current = null
      }
      offscreenCanvasRef.current = null
      offscreenCtxRef.current = null
    }
  }, [canvasWidth, canvasHeight, gridSize, pixelSize])

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
})

