export default function Loading() {
  return (
    <div className="card overflow-x-auto">
      <div className="animate-pulse divide-y divide-line">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-md bg-line" />
            <div className="h-4 w-1/3 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
