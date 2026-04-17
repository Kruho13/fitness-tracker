export default function LogFoodLoading() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-28" />
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="space-y-1.5 items-end flex flex-col">
          <div className="skeleton h-5 w-20" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>

      {/* Textarea + button */}
      <div className="space-y-3">
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="skeleton h-12 w-full rounded-2xl" />
      </div>

      {/* Saved meals */}
      <div className="skeleton h-12 w-full rounded-2xl" />

      {/* Log entries */}
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
