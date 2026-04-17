export default function HomeLoading() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-5 w-32" />
        </div>
        <div className="skeleton h-7 w-16 rounded-full" />
      </div>

      {/* Log Food button */}
      <div className="space-y-2.5">
        <div className="skeleton h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
        </div>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
      </div>

      {/* Weight chart */}
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )
}
