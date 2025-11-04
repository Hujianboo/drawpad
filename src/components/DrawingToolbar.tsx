interface DrawingToolbarProps {
  currentTool: 'pen' | 'eraser' | 'eyedropper' | 'bucket'
  onToolChange: (tool: 'pen' | 'eraser' | 'eyedropper' | 'bucket') => void
}

export default function DrawingToolbar({
  currentTool,
  onToolChange,
}: DrawingToolbarProps) {

  const tools = [
    {
      id: 'pen' as const,
      label: 'Pen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    },
    {
      id: 'eraser' as const,
      label: 'Eraser',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    {
      id: 'eyedropper' as const,
      label: 'Picker',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
        </svg>
      )
    },
    {
      id: 'bucket' as const,
      label: 'Fill',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
  ]

  return (
    <div className="w-20 bg-gray-50 p-3 flex flex-col gap-3 border-r border-gray-200">
      {/* 工具按钮 */}
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`w-full aspect-square p-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
              currentTool === tool.id
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-200'
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
