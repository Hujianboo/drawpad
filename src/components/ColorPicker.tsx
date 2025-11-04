import { useState, useEffect, useRef } from 'react'

interface ColorPickerProps {
  currentColor: string
  onColorChange: (color: string) => void
  onColorPick?: () => void
}

export const ColorPicker = ({ currentColor, onColorChange, onColorPick }: ColorPickerProps) => {
  const [rgb, setRgb] = useState({ r: 255, g: 0, b: 0 })
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [brightness, setBrightness] = useState(100)

  const svPickerRef = useRef<HTMLDivElement>(null)
  const huePickerRef = useRef<HTMLDivElement>(null)
  const isDraggingSVRef = useRef(false)
  const isDraggingHueRef = useRef(false)

  // RGB 转 HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    r = r / 255
    g = g / 255
    b = b / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    let s = 0
    const v = max

    if (delta !== 0) {
      s = delta / max

      if (max === r) {
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
      } else if (max === g) {
        h = ((b - r) / delta + 2) / 6
      } else {
        h = ((r - g) / delta + 4) / 6
      }
    }

    return {
      h: h * 360,
      s: s * 100,
      v: v * 100
    }
  }

  // 将 hex 转换为 RGB 和 HSV
  useEffect(() => {
    const hex = currentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    setRgb({ r, g, b })

    // 同时更新 HSV 值
    const hsv = rgbToHsv(r, g, b)
    setHue(hsv.h)
    setSaturation(hsv.s)
    setBrightness(hsv.v)
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

  // 处理 SV 选择器的交互
  const handleSVInteraction = (e: MouseEvent | React.MouseEvent) => {
    if (!svPickerRef.current) return
    const rect = svPickerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    const s = (x / rect.width) * 100
    const v = 100 - (y / rect.height) * 100
    handleSVChange(s, v)
  }

  // 处理色相条的交互
  const handleHueInteraction = (e: MouseEvent | React.MouseEvent) => {
    if (!huePickerRef.current) return
    const rect = huePickerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const newHue = (x / rect.width) * 360
    handleHueChange(newHue)
  }

  // SV 选择器事件处理
  const handleSVMouseDown = (e: React.MouseEvent) => {
    isDraggingSVRef.current = true
    handleSVInteraction(e)
  }

  // 色相条事件处理
  const handleHueMouseDown = (e: React.MouseEvent) => {
    isDraggingHueRef.current = true
    handleHueInteraction(e)
  }

  // 全局鼠标移动和释放事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSVRef.current) {
        handleSVInteraction(e)
      }
      if (isDraggingHueRef.current) {
        handleHueInteraction(e)
      }
    }

    const handleMouseUp = () => {
      isDraggingSVRef.current = false
      isDraggingHueRef.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [hue, saturation, brightness])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase">Colour Picker</h3>
        <button className="text-gray-500 hover:text-gray-700" onClick={onColorPick}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* 颜色渐变选择器 */}
      <div className="relative mb-3">
        <div
          ref={svPickerRef}
          className="w-full h-48 rounded-lg cursor-crosshair relative overflow-hidden"
          style={{
            backgroundColor: `hsl(${hue}, 100%, 50%)`
          }}
          onMouseDown={handleSVMouseDown}
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
          ref={huePickerRef}
          className="w-full h-6 rounded-full cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
          }}
          onMouseDown={handleHueMouseDown}
        >
          <div
            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
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
          <label className="text-xs font-medium text-gray-600">RGB</label>
          <button className="text-xs text-gray-500 hover:text-gray-700">▼</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.r}
            onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.g}
            onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.b}
            onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
            className="px-2 py-1.5 bg-white border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
