/**
 * Loading skeleton for doc pages.
 * Displayed during server-side rendering to provide immediate visual feedback.
 */
export default function Loading() {
  return (
    <div className="flex max-w-[1400px] mx-auto">
      {/* Sidebar placeholder */}
      <div className="hidden lg:block w-64 shrink-0 h-screen border-r border-gray-200" />

      {/* Main content skeleton */}
      <main className="flex-grow min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-4xl">
        <div className="animate-pulse space-y-4">
          {/* Title skeleton */}
          <div className="h-8 bg-gray-200 rounded w-2/3" />

          {/* Breadcrumbs skeleton */}
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />

          {/* Paragraph skeleton lines */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>

          {/* Heading skeleton */}
          <div className="h-6 bg-gray-200 rounded w-1/2 mt-6" />

          {/* Paragraph skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>

          {/* Image placeholder */}
          <div className="h-64 bg-gray-200 rounded w-full my-6" />

          {/* More content skeleton */}
          <div className="space-y-2 mt-6">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </main>

      {/* Table of Contents placeholder */}
      <div className="hidden xl:block w-56 shrink-0 px-4" />
    </div>
  );
}
