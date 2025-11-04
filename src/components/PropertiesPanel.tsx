import { ColorPicker } from './ColorPicker'

interface PropertiesPanelProps {
  currentColor: string
  brushSize: number
  showCheckerboard?: boolean
  onColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onShowCheckerboardChange?: (show: boolean) => void
  onColorPick?: () => void
}

export const PropertiesPanel = ({
  currentColor,
  brushSize,
  showCheckerboard = true,
  onColorChange,
  onBrushSizeChange,
  onShowCheckerboardChange,
  onColorPick,
}: PropertiesPanelProps) => {
  return (
    <div className="w-64 bg-gray-50 p-6 flex flex-col gap-6 overflow-y-auto border-l border-gray-200">
      {/* 颜色选择器 */}
      <ColorPicker
        currentColor={currentColor}
        onColorChange={onColorChange}
        onColorPick={onColorPick}
      />

      {/* 画笔大小 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase">Brush Size</h3>
          <span className="text-sm text-gray-600">{brushSize} px</span>
        </div>

        {/* 预设大小快捷按钮 */}
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
            <button
              key={size}
              onClick={() => onBrushSizeChange(size)}
              className={`flex items-center justify-center transition-all hover:bg-gray-200 rounded ${
                brushSize === size ? 'bg-gray-200' : ''
              }`}
              style={{
                width: '20px',
                height: '20px',
              }}
              title={`${size}px`}
            >
              <div
                className={`rounded-full transition-all ${
                  brushSize === size ? 'bg-gray-800' : 'bg-gray-400'
                }`}
                style={{
                  width: `${size * 1.5}px`,
                  height: `${size * 1.5}px`,
                  maxWidth: '15px',
                  maxHeight: '15px',
                }}
              ></div>
            </button>
          ))}
        </div>
      </div>

      {/* 背景设置 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Background</h3>

        <button
          onClick={() => onShowCheckerboardChange?.(!showCheckerboard)}
          className={`w-full px-4 py-3 rounded-lg border transition-all font-medium text-sm flex items-center gap-3 ${
            showCheckerboard
              ? 'bg-white border-gray-300 text-gray-700 shadow-sm'
              : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" strokeWidth={2} fill={showCheckerboard ? 'currentColor' : 'none'} />
            <rect x="13" y="3" width="8" height="8" strokeWidth={2} fill="none" />
            <rect x="3" y="13" width="8" height="8" strokeWidth={2} fill="none" />
            <rect x="13" y="13" width="8" height="8" strokeWidth={2} fill={showCheckerboard ? 'currentColor' : 'none'} />
          </svg>
          <span className="flex-1 text-left">{showCheckerboard ? 'Checkerboard' : 'Solid White'}</span>
        </button>

        <p className="mt-2 text-xs text-gray-500">
          {showCheckerboard
            ? 'Checkerboard pattern helps visualize transparency'
            : 'Solid white background for cleaner view'}
        </p>
      </div>
    </div>
  )
}
