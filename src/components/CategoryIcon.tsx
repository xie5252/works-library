// 分类小图标：按名称映射，自定义分类用文件夹兜底
export default function CategoryIcon({
  name,
  className = 'w-4 h-4',
}: {
  name: string
  className?: string
}) {
  const p = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case '精选':
      return (
        <svg {...p}>
          <path d="M12 2.5l2.9 5.9 6.5 0.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-0.9z" />
        </svg>
      )
    case '全部':
      return (
        <svg {...p}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      )
    case '设计':
      return (
        <svg {...p}>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.6 7.6" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      )
    case '摄影':
      return (
        <svg {...p}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      )
    case '视频':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.5l6 3.5-6 3.5v-7z" />
        </svg>
      )
    case 'AI应用':
      return (
        <svg {...p}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      )
    case '数字化':
      return (
        <svg {...p}>
          <path d="M6 20v-5M12 20V9M18 20V4" />
        </svg>
      )
    case '其他':
      return (
        <svg {...p}>
          <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
          <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
        </svg>
      )
  }
}
