import { create } from 'zustand'

export interface PixelData {
  x: number
  y: number
  color: string
}

interface PixelStore {
  // 状态
  pixels: Map<string, PixelData>
  history: Map<string, PixelData>[]
  historyIndex: number
  isDrawing: boolean
  offscreenCanvas: HTMLCanvasElement | null
  gridSize: number
  pixelSize: number

  // Canvas 引用管理
  setOffscreenCanvas: (canvas: HTMLCanvasElement | null) => void
  setGridSize: (size: number) => void
  setPixelSize: (size: number) => void

  // 操作方法
  setPixels: (pixels: Map<string, PixelData>) => void
  updatePixels: (updates: Map<string, PixelData | null>) => void
  setIsDrawing: (isDrawing: boolean) => void

  // 历史记录管理
  saveHistory: (pixels?: Map<string, PixelData>) => void
  undo: () => Map<string, PixelData> | null
  redo: () => Map<string, PixelData> | null
  canUndo: () => boolean
  canRedo: () => boolean

  // 画布操作
  clear: () => void
  loadPixels: (pixels: Map<string, PixelData>) => void
  resizeCanvas: (newGridSize: number, newPixelSize: number) => void
  exportImage: () => void
  importImage: () => void

  // 获取当前状态
  getPixelAt: (col: number, row: number) => PixelData | null
  getAllPixels: () => Map<string, PixelData>

  // 快照和序列化
  getSnapshot: () => {
    pixels: Map<string, PixelData>
    pixelCount: number
    canUndo: boolean
    canRedo: boolean
    gridSize: number
    pixelSize: number
  }
  serializePixels: () => string
  deserializePixels: (json: string) => void
}

export const usePixelStore = create<PixelStore>((set, get) => ({
  // 初始状态
  pixels: new Map(),
  history: [new Map()],
  historyIndex: 0,
  isDrawing: false,
  offscreenCanvas: null,
  gridSize: 32,
  pixelSize: 20,

  // Canvas 引用管理
  setOffscreenCanvas: (canvas) => {
    set({ offscreenCanvas: canvas })
  },

  setGridSize: (size) => {
    set({ gridSize: size })
  },

  setPixelSize: (size) => {
    set({ pixelSize: size })
  },

  // 设置像素数据
  setPixels: (pixels) => {
    set({ pixels: new Map(pixels) })
  },

  // 更新像素数据（支持批量更新）
  updatePixels: (updates) => {
    set((state) => {
      const newPixels = new Map(state.pixels)
      updates.forEach((pixelData, key) => {
        if (pixelData === null) {
          newPixels.delete(key)
        } else {
          newPixels.set(key, pixelData)
        }
      })
      return { pixels: newPixels }
    })
  },

  // 设置绘制状态
  setIsDrawing: (isDrawing) => {
    set({ isDrawing })
  },

  // 保存历史记录
  saveHistory: (pixels) => {
    const state = get()
    const currentPixels = pixels || state.pixels

    // 检查是否和当前历史状态相同，避免保存重复状态
    const currentState = state.history[state.historyIndex]
    if (currentState && currentState.size === currentPixels.size) {
      let isSame = true
      for (const [key, value] of currentPixels) {
        const currentValue = currentState.get(key)
        if (!currentValue || currentValue.color !== value.color) {
          isSame = false
          break
        }
      }
      if (isSame) return
    }

    // 裁剪历史记录并添加新状态
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(new Map(currentPixels))

    let newHistoryIndex = newHistory.length - 1

    // 限制历史记录数量
    const MAX_HISTORY = 50
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
      newHistoryIndex--
    }

    set({
      history: newHistory,
      historyIndex: newHistoryIndex,
    })
  },

  // 撤销
  undo: () => {
    const state = get()
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1
      const previousState = state.history[newIndex]
      set({
        pixels: new Map(previousState),
        historyIndex: newIndex,
      })
      return new Map(previousState)
    }
    return null
  },

  // 重做
  redo: () => {
    const state = get()
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1
      const nextState = state.history[newIndex]
      set({
        pixels: new Map(nextState),
        historyIndex: newIndex,
      })
      return new Map(nextState)
    }
    return null
  },

  // 检查是否可以撤销
  canUndo: () => {
    return get().historyIndex > 0
  },

  // 检查是否可以重做
  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  // 清空画布
  clear: () => {
    const emptyMap = new Map<string, PixelData>()
    set({
      pixels: emptyMap,
      history: [emptyMap],
      historyIndex: 0,
    })
  },

  // 加载像素数据（用于导入图片等）
  loadPixels: (pixels) => {
    set({
      pixels: new Map(pixels),
    })
    get().saveHistory(pixels)
  },

  // 调整画布大小并保持像素的网格坐标不变
  resizeCanvas: (newGridSize, newPixelSize) => {
    const state = get()
    const oldPixels = state.pixels

    // 如果没有内容，直接更新尺寸
    if (oldPixels.size === 0) {
      set({
        gridSize: newGridSize,
        pixelSize: newPixelSize,
      })
      return
    }

    // 重新映射所有像素，保持网格坐标不变，只更新实际像素坐标
    const newPixels = new Map<string, PixelData>()

    oldPixels.forEach((pixel) => {
      // 从像素坐标计算原始的网格坐标
      const col = Math.floor(pixel.x / state.pixelSize)
      const row = Math.floor(pixel.y / state.pixelSize)

      // 保持网格坐标不变，只更新实际坐标
      // 如果网格坐标超出新画布范围，则丢弃该像素
      if (col >= 0 && col < newGridSize && row >= 0 && row < newGridSize) {
        const key = `${col},${row}`
        newPixels.set(key, {
          x: col * newPixelSize,
          y: row * newPixelSize,
          color: pixel.color,
        })
      }
    })

    // 更新状态（不保存到历史记录，因为这只是画布属性的变化）
    set({
      pixels: newPixels,
      gridSize: newGridSize,
      pixelSize: newPixelSize,
    })
  },

  // 获取指定位置的像素
  getPixelAt: (col, row) => {
    const key = `${col},${row}`
    return get().pixels.get(key) || null
  },

  // 获取所有像素
  getAllPixels: () => {
    return new Map(get().pixels)
  },

  // 导出图片
  exportImage: () => {
    const { offscreenCanvas, gridSize, pixelSize } = get()
    if (!offscreenCanvas) {
      console.warn('Canvas not available for export')
      return
    }

    const canvasWidth = gridSize * pixelSize
    const canvasHeight = gridSize * pixelSize

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
  },

  // 获取当前状态快照
  getSnapshot: () => {
    const state = get()
    return {
      pixels: new Map(state.pixels),
      pixelCount: state.pixels.size,
      canUndo: state.historyIndex > 0,
      canRedo: state.historyIndex < state.history.length - 1,
      gridSize: state.gridSize,
      pixelSize: state.pixelSize,
    }
  },

  // 序列化像素数据为 JSON
  serializePixels: () => {
    const { pixels, gridSize, pixelSize } = get()
    const data = {
      version: '1.0',
      gridSize,
      pixelSize,
      pixels: Array.from(pixels.entries()).map(([key, value]) => ({
        key,
        ...value,
      })),
    }
    return JSON.stringify(data)
  },

  // 从 JSON 反序列化像素数据
  deserializePixels: (json: string) => {
    try {
      const data = JSON.parse(json)
      if (data.version !== '1.0') {
        console.warn('Unsupported data version')
        return
      }

      const newPixels = new Map<string, PixelData>()
      data.pixels.forEach((item: any) => {
        newPixels.set(item.key, {
          x: item.x,
          y: item.y,
          color: item.color,
        })
      })

      get().loadPixels(newPixels)

      // 更新配置
      if (data.gridSize) get().setGridSize(data.gridSize)
      if (data.pixelSize) get().setPixelSize(data.pixelSize)
    } catch (error) {
      console.error('Failed to deserialize pixels:', error)
    }
  },

  // 导入图片
  importImage: () => {
    const { gridSize, pixelSize } = get()
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

          get().loadPixels(newPixels)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }

    input.click()
  },
}))
