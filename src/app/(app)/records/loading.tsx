export default function RecordsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
        <div className="flex-1"></div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
      </div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="flex-1 flex gap-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
