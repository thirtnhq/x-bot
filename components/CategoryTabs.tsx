import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export type TabId = 'top8' | 'threads' | 'singleTweets' | 'memesVisuals' | 'all_urls';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  count?: number;
}

interface CategoryTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
  className?: string;
}

export const TABS: Tab[] = [
  { id: 'all_urls', label: 'All Submissions', emoji: '🔍' },
  { id: 'top8', label: 'Full Rankings', emoji: '🏆' },


  { id: 'threads', label: 'Best Threads', emoji: '🧵' },
  { id: 'singleTweets', label: 'Best Single Tweets', emoji: '🐦' },
  { id: 'memesVisuals', label: 'Best Memes & Visuals', emoji: '🎨' },
];


export function CategoryTabs({ activeTab, onTabChange, counts, className }: CategoryTabsProps) {
  return (
    <div className={cn('flex space-x-1 rounded-xl bg-gray-800 p-1', className)}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts?.[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors',
              'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              isActive
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:bg-white/12 hover:text-white'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-blue-800 text-blue-100" : "bg-gray-700 text-gray-300"
                )}>
                  {count}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
