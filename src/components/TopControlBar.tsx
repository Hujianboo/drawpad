interface TopControlBarProps {
  gridSize: number
  currentColor: string
  canUndo?: boolean
  canRedo?: boolean
  onGridSizeChange?: (size: number) => void
  onClear?: () => void
  onExport?: () => void
  onImport?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

export const TopControlBar = ({
  gridSize,
  currentColor,
  canUndo = false,
  canRedo = false,
  onGridSizeChange,
  onClear,
  onExport,
  onImport,
  onUndo,
  onRedo,
}: TopControlBarProps) => {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6">
        {/* 网格大小控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onGridSizeChange?.(Math.max(16, gridSize / 2))}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="减小网格"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase font-medium">Grid</span>
            <div className="px-3 py-1 bg-gray-100 rounded font-medium text-sm">
              {gridSize} × {gridSize}
            </div>
          </div>

          <button
            onClick={() => onGridSizeChange?.(Math.min(256, gridSize * 2))}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="增大网格"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Undo/Redo 按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="撤销 (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="重做 (Ctrl+Y)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* 分隔线 */}

        {/* 颜色指示器 */}
        
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onImport}
          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Import
        </button>

        <button
          onClick={onClear}
          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Clear
        </button>

        <button
          onClick={onExport}
          className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  )
}
