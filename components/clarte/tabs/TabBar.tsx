'use client'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function TabBar({ tabs, activeTab, onTabChange, className = '' }: TabBarProps) {
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              pb-2 text-sm font-medium transition-colors
              border-b-2
              ${isActive
                ? 'text-secondary border-secondary'
                : 'text-text-muted border-transparent hover:text-text-dark'
              }
            `}
            aria-selected={isActive}
            role="tab"
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 ${isActive ? 'text-secondary/70' : 'text-text-muted/70'}`}>
                ({tab.count})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
