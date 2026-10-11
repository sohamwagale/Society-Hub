import React from 'react';
import { Skeleton } from './Skeleton';

export const AuthSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center">
        {/* Logo skeleton */}
        <div className="bg-slate-200/80 p-3 rounded-2xl mb-4 w-15 h-15 flex items-center justify-center">
          <Skeleton variant="rounded" width={36} height={36} className="bg-slate-300" />
        </div>
        {/* Title & subtitle */}
        <Skeleton variant="text" width={180} height={28} className="mb-2" />
        <Skeleton variant="text" width={260} height={16} />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-md rounded-2xl sm:px-10 space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <Skeleton variant="text" width={80} height={14} />
            <Skeleton variant="rounded" width="100%" height={42} className="rounded-xl" />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Skeleton variant="text" width={70} height={14} />
            <Skeleton variant="rounded" width="100%" height={42} className="rounded-xl" />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <Skeleton variant="rounded" width="100%" height={44} className="rounded-xl" />
          </div>

          {/* Footer link */}
          <div className="flex justify-center pt-2">
            <Skeleton variant="text" width={180} height={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSkeleton;
