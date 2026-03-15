import React, { useRef, useEffect } from 'react';
import { Filter, X, Tag, Archive } from 'lucide-react';
import { BoardFilters as BoardFiltersType } from '@/types/Task';

interface BoardFiltersProps {
  filters: BoardFiltersType;
  onFiltersChange: (filters: BoardFiltersType) => void;
  availableTags: string[];
  availableCategories: string[]; // We’ll treat these as Subjects/Labels in the UI
}

const BoardFilters: React.FC<BoardFiltersProps> = ({
  filters,
  onFiltersChange,
  availableTags,
  availableCategories,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = !!filters.category || (filters.tags && filters.tags.length > 0) || !!filters.showArchived;

  const activeCount =
    (filters.tags?.length || 0) + (filters.category ? 1 : 0) + (filters.showArchived ? 1 : 0);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter size={16} />
        Filters
        {hasActiveFilters && (
          <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {/* Whole panel scrolls if needed */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">
                    Clear all
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {availableTags.length === 0 && availableCategories.length === 0 ? null : (
              <p className="mb-4 text-sm italic text-gray-500">
                Tip: Filters use Subject labels (not card color)
              </p>
            )}

            <div className="space-y-4">
              {availableTags.length === 0 && availableCategories.length === 0 && (
                <p className="text-sm text-gray-500 py-1">
                  No filters available yet — add subjects or tags to your cards to filter by them.
                </p>
              )}

              {/* SUBJECT (LABEL) - still stored in filters.category for backwards compatibility */}
              {availableCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject (Label)</label>
                  <select
                    value={filters.category || ‘’}
                    onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All subjects</option>
                    {availableCategories.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TAGS */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>

                  {/* Tags-only scroll area so the panel doesn’t get ridiculous */}
                  <div className="max-h-56 overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                            filters.tags?.includes(tag)
                              ? ‘bg-blue-100 text-blue-700 border border-blue-200’
                              : ‘bg-gray-100 text-gray-600 hover:bg-gray-200’
                          }`}
                        >
                          <Tag size={10} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SHOW ARCHIVED */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-700">Show archived tasks</span>
                </div>
                <button
                  onClick={() => onFiltersChange({ ...filters, showArchived: !filters.showArchived })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filters.showArchived ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  aria-label="Toggle show archived tasks"
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      filters.showArchived ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardFilters;
