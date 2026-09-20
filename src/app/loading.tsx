export default function Loading() {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7">
      <div className="mx-auto max-w-[1100px]">
        {/* Header skeleton */}
        <div className="mb-6">
          <div
            className="h-7 w-48 rounded-md bg-zinc-200"
            style={{ animation: "skeletonPulse 1.5s ease-in-out infinite" }}
          />
          <div
            className="mt-2 h-4 w-72 rounded-md bg-zinc-200"
            style={{ animation: "skeletonPulse 1.5s ease-in-out infinite 0.1s" }}
          />
        </div>

        {/* KPI cards skeleton */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-white p-5 shadow-[var(--shadow)]">
              <div
                className="h-8 w-24 rounded-md bg-zinc-200"
                style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${i * 0.1}s` }}
              />
              <div
                className="mt-2 h-3 w-20 rounded-md bg-zinc-100"
                style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${i * 0.1 + 0.05}s` }}
              />
              <div
                className="mt-2 h-3 w-28 rounded-md bg-zinc-100"
                style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${i * 0.1 + 0.1}s` }}
              />
            </div>
          ))}
        </div>

        {/* Zeitersparnis skeleton */}
        <div
          className="mb-6 h-24 rounded-xl bg-zinc-200"
          style={{ animation: "skeletonPulse 1.5s ease-in-out infinite 0.2s" }}
        />

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Termine skeleton */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)] lg:col-span-3">
            <div
              className="h-12 bg-zinc-300"
              style={{ animation: "skeletonPulse 1.5s ease-in-out infinite 0.3s" }}
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg bg-zinc-200"
                  style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.3 + i * 0.05}s` }}
                />
                <div className="flex-1">
                  <div
                    className="h-4 w-36 rounded-md bg-zinc-200"
                    style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.35 + i * 0.05}s` }}
                  />
                  <div
                    className="mt-1.5 h-3 w-48 rounded-md bg-zinc-100"
                    style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.4 + i * 0.05}s` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Right column skeleton */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Activity skeleton */}
            <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
              <div
                className="h-12 bg-zinc-300"
                style={{ animation: "skeletonPulse 1.5s ease-in-out infinite 0.4s" }}
              />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div
                    className="h-7 w-7 shrink-0 rounded-full bg-zinc-200"
                    style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.5 + i * 0.05}s` }}
                  />
                  <div className="flex-1">
                    <div
                      className="h-4 w-32 rounded-md bg-zinc-200"
                      style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.55 + i * 0.05}s` }}
                    />
                    <div
                      className="mt-1 h-3 w-24 rounded-md bg-zinc-100"
                      style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.6 + i * 0.05}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Offene Angebote skeleton */}
            <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow)]">
              <div
                className="h-12 bg-zinc-300"
                style={{ animation: "skeletonPulse 1.5s ease-in-out infinite 0.6s" }}
              />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div
                      className="h-4 w-28 rounded-md bg-zinc-200"
                      style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.65 + i * 0.05}s` }}
                    />
                    <div
                      className="mt-1 h-3 w-16 rounded-md bg-zinc-100"
                      style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.7 + i * 0.05}s` }}
                    />
                  </div>
                  <div
                    className="h-6 w-14 rounded-full bg-zinc-200"
                    style={{ animation: `skeletonPulse 1.5s ease-in-out infinite ${0.75 + i * 0.05}s` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
