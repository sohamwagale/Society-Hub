import React from 'react';
import { Skeleton, SkeletonCircle } from './Skeleton';

interface DashboardSkeletonProps {
  children?: React.ReactNode;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mock Sidebar Skeleton */}
      <aside className="w-64 bg-indigo-900 border-r border-slate-800 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-5 space-y-6">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" width={36} height={36} className="bg-slate-800/80 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton variant="text" width="70%" height={14} className="bg-slate-800/80" />
              <Skeleton variant="text" width="45%" height={10} className="bg-slate-800/60" />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40">
                <Skeleton variant="circular" width={18} height={18} className="bg-slate-700/60 shrink-0" />
                <Skeleton
                  variant="text"
                  width={`${50 + (i % 4) * 12}%`}
                  height={12}
                  className="bg-slate-700/60"
                />
              </div>
            ))}
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={36} height={36} className="bg-slate-800/90" />
            <div className="space-y-1.5 flex-1">
              <Skeleton variant="text" width="60%" height={12} className="bg-slate-800/80" />
              <Skeleton variant="text" width="40%" height={10} className="bg-slate-800/60" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mock Header Skeleton */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
            <div className="space-y-1">
              <Skeleton variant="text" width={140} height={14} />
              <Skeleton variant="text" width={85} height={10} />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <SkeletonCircle size={32} />
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <SkeletonCircle size={32} />
              <div className="hidden md:block space-y-1">
                <Skeleton variant="text" width={80} height={12} />
                <Skeleton variant="text" width={50} height={10} />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Viewport */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children || <DefaultDashboardContentSkeleton />}
          </div>
        </div>
      </main>
    </div>
  );
};

const DefaultDashboardContentSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header title skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="text" width={280} height={14} />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <Skeleton variant="text" width="55%" height={12} />
            <Skeleton variant="text" width="40%" height={26} />
            <Skeleton variant="text" width="70%" height={10} />
          </div>
        ))}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <Skeleton variant="text" width={160} height={16} />
            <Skeleton variant="rounded" width={90} height={28} className="rounded-lg" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <Skeleton variant="rounded" width={60} height={18} className="rounded" />
                <Skeleton variant="text" width={80} height={10} />
              </div>
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="95%" height={12} />
              <Skeleton variant="text" width="75%" height={12} />
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm h-[500px]">
          <Skeleton variant="text" width={120} height={16} />
          <div className="space-y-3 pt-2">
            <Skeleton variant="text" width="90%" height={12} />
            <Skeleton variant="text" width="80%" height={12} />
            <Skeleton variant="text" width="65%" height={12} />
          </div>
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <Skeleton variant="text" width={110} height={12} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between">
                <Skeleton variant="text" width="55%" height={12} />
                <Skeleton variant="text" width="30%" height={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
