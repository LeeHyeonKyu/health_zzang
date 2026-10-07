export default function PenaltyLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1"></div>
      </div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
