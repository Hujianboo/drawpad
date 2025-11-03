import { useState, useEffect } from 'react'

interface DrawingToolbarProps {
  currentColor: string
  currentTool: 'pen' | 'eraser' | 'eyedropper'
  onColorChange: (color: string) => void
  onToolChange: (tool: 'pen' | 'eraser' | 'eyedropper') => void
  onClear: () => void
  onExport: () => void
}

const PRESET_COLORS = [
  '#000000', // 黑色
  '#FFFFFF', // 白色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 洋红
  '#00FFFF', // 青色
  '#FF8800', // 橙色
  '#8800FF', // 紫色
  '#888888', // 灰色
  '#FF69B4', // 粉色
]

export default function DrawingToolbar({
  currentColor,
  currentTool,
  onColorChange,
  onToolChange,
  onClear,
  onExport,
}: DrawingToolbarProps) {
  const [customColor, setCustomColor] = useState('#000000')

  // 同步 currentColor 到 customColor
  useEffect(() => {
    setCustomColor(currentColor)
  }, [currentColor])

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* 工具选择 */}
      <div>
        <h3 className="mb-2.5 text-lg font-semibold">工具</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onToolChange('pen')}
            className={`px-4 py-2 rounded cursor-pointer transition-all ${
              currentTool === 'pen'
                ? 'border-2 border-blue-500 bg-blue-50'
                : 'border border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            🖊️ 画笔
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={`px-4 py-2 rounded cursor-pointer transition-all ${
              currentTool === 'eraser'
                ? 'border-2 border-blue-500 bg-blue-50'
                : 'border border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            🧽 橡皮擦
          </button>
          <button
            onClick={() => onToolChange('eyedropper')}
            className={`px-4 py-2 rounded cursor-pointer transition-all ${
              currentTool === 'eyedropper'
                ? 'border-2 border-blue-500 bg-blue-50'
                : 'border border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            💧 吸色器
          </button>
        </div>
      </div>

      {/* 预设颜色 */}
      <div>
        <h3 className="mb-2.5 text-lg font-semibold">颜色选择</h3>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-10 h-10 cursor-pointer rounded transition-all ${
                currentColor === color ? 'border-3 border-blue-500 ring-2 ring-blue-500' : 'border border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* 自定义颜色 */}
      <div>
        <h3 className="mb-2.5 text-lg font-semibold">自定义颜色</h3>
        <div className="flex gap-2.5 items-center">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value)
              onColorChange(e.target.value)
            }}
            className="w-15 h-10 cursor-pointer rounded"
          />
          <span className="text-sm">{customColor}</span>
        </div>
      </div>

      {/* 当前颜色 */}
      <div>
        <h3 className="mb-2.5 text-lg font-semibold">当前颜色</h3>
        <div
          className="w-25 h-12 border-2 border-gray-800 rounded"
          style={{ backgroundColor: currentColor }}
        />
      </div>

      {/* 操作按钮 */}
      <div>
        <h3 className="mb-2.5 text-lg font-semibold">操作</h3>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onClear}
            className="px-5 py-2.5 bg-red-600 text-white border-none cursor-pointer rounded hover:bg-red-700 transition-colors"
          >
            🗑️ 清空画布
          </button>
          <button
            onClick={onExport}
            className="px-5 py-2.5 bg-green-600 text-white border-none cursor-pointer rounded hover:bg-green-700 transition-colors"
          >
            💾 导出图片
          </button>
        </div>
      </div>
    </div>
  )
}
