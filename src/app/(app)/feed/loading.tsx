export default function FeedLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none flex flex-col items-center gap-1">
            <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="w-8 h-2 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-64" />
      ))}
    </div>
  );
}
