import { useState, useEffect } from 'react'

interface DrawingToolbarProps {
  currentColor: string
  currentTool: 'pen' | 'eraser' | 'eyedropper' | 'bucket'
  brushSize: number
  onColorChange: (color: string) => void
  onToolChange: (tool: 'pen' | 'eraser' | 'eyedropper' | 'bucket') => void
  onBrushSizeChange: (size: number) => void
}

export default function DrawingToolbar({
  currentColor,
  currentTool,
  brushSize,
  onColorChange,
  onToolChange,
  onBrushSizeChange,
}: DrawingToolbarProps) {
  const [rgb, setRgb] = useState({ r: 255, g: 0, b: 0 })
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [brightness, setBrightness] = useState(100)

  // 将 hex 转换为 RGB
  useEffect(() => {
    const hex = currentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    setRgb({ r, g, b })
  }, [currentColor])

  // RGB 转换为 hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  // HSV 转 RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    h = h / 360
    s = s / 100
    v = v / 100

    let r = 0, g = 0, b = 0
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break
      case 1: r = q; g = v; b = p; break
      case 2: r = p; g = v; b = t; break
      case 3: r = p; g = q; b = v; break
      case 4: r = t; g = p; b = v; break
      case 5: r = v; g = p; b = q; break
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    }
  }

  const handleRgbChange = (type: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [type]: value }
    setRgb(newRgb)
    onColorChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }

  const handleHueChange = (newHue: number) => {
    setHue(newHue)
    const color = hsvToRgb(newHue, saturation, brightness)
    onColorChange(rgbToHex(color.r, color.g, color.b))
  }

  const handleSVChange = (s: number, v: number) => {
    setSaturation(s)
    setBrightness(v)
    const color = hsvToRgb(hue, s, v)
    onColorChange(rgbToHex(color.r, color.g, color.b))
  }

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* 工具按钮 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onToolChange('pen')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentTool === 'pen'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
          }`}
        >
          Pen
        </button>
        <button
          onClick={() => onToolChange('eraser')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentTool === 'eraser'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
          }`}
        >
          Erase
        </button>
        <button
          onClick={() => onToolChange('bucket')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentTool === 'bucket'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
          }`}
        >
          Fill
        </button>
        <button
          onClick={() => onToolChange('eyedropper')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            currentTool === 'eyedropper'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
          }`}
        >
          Pick
        </button>
      </div>

      {/* 颜色选择器 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">Colour Picker</h3>
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        {/* 颜色渐变选择器 */}
        <div className="relative mb-3">
          <div
            className="w-full h-48 rounded-lg cursor-crosshair relative overflow-hidden"
            style={{
              backgroundColor: `hsl(${hue}, 100%, 50%)`
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              const s = (x / rect.width) * 100
              const v = 100 - (y / rect.height) * 100
              handleSVChange(s, v)
            }}
          >
            {/* 白色到透明渐变 */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to right, white, transparent)'
            }}></div>
            {/* 透明到黑色渐变 */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to bottom, transparent, black)'
            }}></div>
            {/* 颜色指示器 */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${saturation}%`,
                top: `${100 - brightness}%`,
                backgroundColor: currentColor
              }}
            ></div>
          </div>
        </div>

        {/* 色相条 */}
        <div className="mb-4 relative">
          <div
            className="w-full h-6 rounded-full cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const newHue = (x / rect.width) * 360
              handleHueChange(newHue)
            }}
          >
            <div
              className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2"
              style={{
                left: `${(hue / 360) * 100}%`,
                backgroundColor: `hsl(${hue}, 100%, 50%)`
              }}
            ></div>
          </div>
        </div>

        {/* RGB 值输入 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">RGB</label>
            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">▼</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.r}
              onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
              className="px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.g}
              onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
              className="px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.b}
              onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
              className="px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 画笔大小 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">Brush Size</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">{brushSize} px</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBrushSizeChange(Math.max(1, brushSize - 1))}
            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            −
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((size) => (
              <button
                key={size}
                onClick={() => onBrushSizeChange(size)}
                className={`w-2 h-2 rounded-full transition-all ${
                  brushSize === size ? 'bg-gray-800 dark:bg-white scale-150' : 'bg-gray-400 dark:bg-gray-500'
                }`}
                style={{
                  width: size * 4 + 'px',
                  height: size * 4 + 'px',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => onBrushSizeChange(Math.min(10, brushSize + 1))}
            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            +
          </button>
        </div>
      </div>

      {/* 快捷键 */}
      <div>
        <button className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
          <span>Shortcuts</span>
          <span>›</span>
        </button>
      </div>
    </div>
  )
}
