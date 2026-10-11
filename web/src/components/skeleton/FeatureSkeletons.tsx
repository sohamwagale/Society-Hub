import React from 'react';
import { Skeleton, SkeletonText, SkeletonCircle } from './Skeleton';

// ----------------------------------------------------
// 1. Overview Tab Skeleton
// ----------------------------------------------------
export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton variant="text" width={180} height={26} />
        <Skeleton variant="text" width={300} height={14} />
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <Skeleton variant="text" width="60%" height={13} />
            <Skeleton variant="text" width="45%" height={28} />
            <Skeleton variant="text" width="75%" height={11} />
          </div>
        ))}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements feed skeleton */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <Skeleton variant="text" width={190} height={18} />
            <Skeleton variant="rounded" width={95} height={28} className="rounded-lg" />
          </div>
          <div className="p-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="rounded" width={65} height={18} className="rounded" />
                    <Skeleton variant="circular" width={14} height={14} />
                  </div>
                  <Skeleton variant="text" width={75} height={12} />
                </div>
                <Skeleton variant="text" width="70%" height={18} />
                <SkeletonText lines={2} lastLineWidth="80%" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton variant="text" width={110} height={12} />
                  <Skeleton variant="text" width={150} height={10} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key details & emergency skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between h-[500px]">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <Skeleton variant="text" width={110} height={18} />
            </div>
            <div className="space-y-3">
              <Skeleton variant="text" width={75} height={11} />
              <div className="space-y-2">
                <Skeleton variant="text" width="90%" height={12} />
                <Skeleton variant="text" width="80%" height={12} />
                <Skeleton variant="text" width="60%" height={12} />
              </div>
            </div>
            <hr className="my-2 border-slate-100" />
            <div className="space-y-3">
              <Skeleton variant="text" width={130} height={11} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                  <Skeleton variant="text" width="55%" height={12} />
                  <Skeleton variant="text" width="30%" height={12} />
                </div>
              ))}
            </div>
          </div>
          <Skeleton variant="rounded" width="100%" height={40} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Announcements Tab Skeleton
// ----------------------------------------------------
export const AnnouncementsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={240} height={22} />
          <Skeleton variant="text" width={320} height={12} />
        </div>
        <Skeleton variant="rounded" width={140} height={34} className="rounded-lg" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton variant="rounded" width={70} height={20} className="rounded" />
                <Skeleton variant="circular" width={16} height={16} />
              </div>
              <Skeleton variant="rounded" width={55} height={24} className="rounded" />
            </div>
            <Skeleton variant="text" width="60%" height={20} />
            <SkeletonText lines={2} lastLineWidth="85%" />
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <Skeleton variant="text" width={130} height={12} />
              <Skeleton variant="text" width={160} height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Residents Tab Skeleton
// ----------------------------------------------------
export const ResidentsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={180} height={22} />
          <Skeleton variant="text" width={280} height={12} />
        </div>
        <Skeleton variant="rounded" width={240} height={34} className="rounded-lg" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              {['Resident', 'Flat Mapping', 'Board Role', 'Email Address', 'One-Tap Call', 'Actions'].map((h, i) => (
                <th key={i} className="p-3.5">
                  <Skeleton variant="text" width={70} height={12} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3.5 space-y-1">
                  <Skeleton variant="text" width={120} height={14} />
                  <Skeleton variant="text" width={60} height={10} />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="text" width={110} height={13} />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="rounded" width={80} height={20} className="rounded" />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="text" width={150} height={13} />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="rounded" width={85} height={24} className="rounded-lg" />
                </td>
                <td className="p-3.5 text-right">
                  <Skeleton variant="rounded" width={70} height={24} className="rounded-lg ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. Billing Tab Skeleton
// ----------------------------------------------------
export const BillingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="space-y-1.5">
            <Skeleton variant="text" width={210} height={22} />
            <Skeleton variant="text" width={310} height={12} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton variant="rounded" width={100} height={34} className="rounded-lg" />
            <Skeleton variant="rounded" width={120} height={34} className="rounded-lg" />
            <Skeleton variant="rounded" width={135} height={34} className="rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billing cycles list */}
          <div className="lg:col-span-2 space-y-4">
            <Skeleton variant="text" width={110} height={12} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton variant="rounded" width={90} height={20} className="rounded" />
                    <Skeleton variant="text" width={180} height={18} />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton variant="text" width={80} height={22} />
                    <Skeleton variant="text" width={100} height={10} />
                  </div>
                </div>
                <SkeletonText lines={2} lastLineWidth="70%" />
                <div className="pt-3 border-t border-slate-200/60 flex flex-wrap justify-between items-center gap-2">
                  <Skeleton variant="text" width={150} height={12} />
                  <div className="flex gap-2">
                    <Skeleton variant="rounded" width={90} height={30} className="rounded-lg" />
                    <Skeleton variant="rounded" width={110} height={30} className="rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Flat audit panel skeleton */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <Skeleton variant="text" width={140} height={14} />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div className="space-y-1">
                    <Skeleton variant="text" width={60} height={13} />
                    <Skeleton variant="text" width={90} height={10} />
                  </div>
                  <Skeleton variant="rounded" width={50} height={18} className="rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 5. Complaints Tab Skeleton
// ----------------------------------------------------
export const ComplaintsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={190} height={22} />
          <Skeleton variant="text" width={320} height={12} />
        </div>
        <Skeleton variant="rounded" width={135} height={34} className="rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grievance list */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2.5">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="rounded" width={70} height={18} className="rounded" />
                  <Skeleton variant="text" width="65%" height={16} />
                </div>
                <Skeleton variant="rounded" width={65} height={20} className="rounded" />
              </div>
              <SkeletonText lines={2} lastLineWidth="80%" />
              <div className="pt-2 flex justify-end">
                <Skeleton variant="text" width={110} height={10} />
              </div>
            </div>
          ))}
        </div>

        {/* Complaint detail thread preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm h-[500px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div className="space-y-2 flex-1">
                <Skeleton variant="rounded" width={75} height={18} className="rounded" />
                <Skeleton variant="text" width="70%" height={18} />
              </div>
              <SkeletonCircle size={20} />
            </div>
            <SkeletonText lines={3} lastLineWidth="60%" />
            <Skeleton variant="rounded" width="100%" height={120} className="rounded-lg" />
          </div>
          <div className="pt-3 border-t border-slate-200 flex gap-2">
            <Skeleton variant="rounded" width="80%" height={36} className="rounded-lg" />
            <Skeleton variant="rounded" width="20%" height={36} className="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 6. Documents Tab Skeleton
// ----------------------------------------------------
export const DocumentsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={230} height={22} />
          <Skeleton variant="text" width={320} height={12} />
        </div>
        <Skeleton variant="rounded" width={145} height={34} className="rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 flex flex-col justify-between h-[210px]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Skeleton variant="rounded" width={32} height={32} className="rounded-lg" />
                <Skeleton variant="text" width="60%" height={16} />
              </div>
              <SkeletonText lines={2} lastLineWidth="75%" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <Skeleton variant="text" width={90} height={10} />
              <Skeleton variant="rounded" width={95} height={28} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 7. Expenses Tab Skeleton
// ----------------------------------------------------
export const ExpensesSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={220} height={22} />
          <Skeleton variant="text" width={290} height={12} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={110} height={34} className="rounded-lg" />
          <Skeleton variant="rounded" width={135} height={34} className="rounded-lg" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              {['Expense Title', 'Spent On', 'Amount', 'Invoice File'].map((h, i) => (
                <th key={i} className="p-3.5">
                  <Skeleton variant="text" width={80} height={12} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3.5 space-y-1">
                  <Skeleton variant="text" width={160} height={14} />
                  <Skeleton variant="text" width={220} height={11} />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="text" width={90} height={12} />
                </td>
                <td className="p-3.5">
                  <Skeleton variant="text" width={80} height={14} />
                </td>
                <td className="p-3.5 text-right">
                  <Skeleton variant="rounded" width={95} height={26} className="rounded-lg ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 8. Reimbursements Tab Skeleton
// ----------------------------------------------------
export const ReimbursementsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={200} height={22} />
          <Skeleton variant="text" width={320} height={12} />
        </div>
        <Skeleton variant="rounded" width={110} height={34} className="rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50/40 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <Skeleton variant="rounded" width={80} height={20} className="rounded" />
                <Skeleton variant="text" width={85} height={20} />
              </div>
              <Skeleton variant="text" width="60%" height={17} />
              <SkeletonText lines={2} lastLineWidth="80%" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <Skeleton variant="text" width={110} height={11} />
              <Skeleton variant="rounded" width={85} height={28} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 9. Polls Tab Skeleton
// ----------------------------------------------------
export const PollsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={230} height={22} />
          <Skeleton variant="text" width={340} height={12} />
        </div>
        <Skeleton variant="rounded" width={115} height={34} className="rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50/20 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton variant="rounded" width={60} height={18} className="rounded" />
              <Skeleton variant="text" width={90} height={12} />
            </div>
            <Skeleton variant="text" width="75%" height={18} />
            <SkeletonText lines={2} lastLineWidth="70%" />

            {/* Poll options bars */}
            <div className="space-y-2 pt-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Skeleton variant="text" width={80} height={12} />
                    <Skeleton variant="text" width={40} height={12} />
                  </div>
                  <Skeleton variant="rounded" width="100%" height={6} className="rounded-full" />
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <Skeleton variant="text" width={100} height={11} />
              <Skeleton variant="text" width={80} height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 10. Emergency Info Tab Skeleton
// ----------------------------------------------------
export const EmergencySkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Statutory credentials */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1.5">
            <Skeleton variant="text" width={220} height={22} />
            <Skeleton variant="text" width={320} height={12} />
          </div>
          <Skeleton variant="rounded" width={130} height={34} className="rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <Skeleton variant="text" width={100} height={11} />
              <Skeleton variant="text" width="70%" height={16} />
            </div>
          ))}
        </div>
      </div>

      {/* Emergency contacts booklet */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1.5">
            <Skeleton variant="text" width={210} height={22} />
            <Skeleton variant="text" width={300} height={12} />
          </div>
          <Skeleton variant="rounded" width={115} height={34} className="rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton variant="text" width={110} height={15} />
                <Skeleton variant="rounded" width={75} height={16} className="rounded" />
                <Skeleton variant="text" width={95} height={12} />
              </div>
              <Skeleton variant="rounded" width={65} height={28} className="rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 11. Flats Tab Skeleton
// ----------------------------------------------------
export const FlatsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1.5">
            <Skeleton variant="text" width={200} height={22} />
            <Skeleton variant="text" width={310} height={12} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Skeleton variant="rounded" width={200} height={34} className="rounded-lg" />
            <Skeleton variant="rounded" width={110} height={34} className="rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div className="space-y-1">
                  <Skeleton variant="text" width={80} height={18} />
                  <Skeleton variant="text" width={110} height={11} />
                </div>
                <Skeleton variant="rounded" width={60} height={24} className="rounded-lg" />
              </div>
              <div className="space-y-2 pt-1">
                <Skeleton variant="text" width="60%" height={12} />
                <Skeleton variant="text" width="80%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 12. Approvals Tab Skeleton
// ----------------------------------------------------
export const ApprovalsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans space-y-6">
      <div className="pb-4 border-b border-slate-100 space-y-1.5">
        <Skeleton variant="text" width={240} height={22} />
        <Skeleton variant="text" width={360} height={12} />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" width={160} height={18} />
              <Skeleton variant="text" width={220} height={12} />
              <Skeleton variant="text" width={180} height={12} />
              <Skeleton variant="text" width={200} height={12} />
            </div>
            <div className="flex gap-2.5">
              <Skeleton variant="rounded" width={120} height={36} className="rounded-lg" />
              <Skeleton variant="rounded" width={80} height={36} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 13. Activity Log Tab Skeleton
// ----------------------------------------------------
export const ActivityLogSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1.5">
          <Skeleton variant="text" width={240} height={22} />
          <Skeleton variant="text" width={320} height={12} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={100} height={34} className="rounded-lg" />
          <Skeleton variant="rounded" width={100} height={34} className="rounded-lg" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
              {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map((h, i) => (
                <th key={i} className="py-3 px-4">
                  <Skeleton variant="text" width={70} height={12} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-3.5 px-4">
                  <Skeleton variant="text" width={120} height={12} />
                </td>
                <td className="py-3.5 px-4">
                  <Skeleton variant="text" width={100} height={14} />
                </td>
                <td className="py-3.5 px-4">
                  <Skeleton variant="text" width={130} height={13} />
                </td>
                <td className="py-3.5 px-4">
                  <Skeleton variant="rounded" width={65} height={18} className="rounded" />
                </td>
                <td className="py-3.5 px-4">
                  <Skeleton variant="text" width={180} height={12} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 14. Settings Tab Skeleton
// ----------------------------------------------------
export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans space-y-6">
      <div className="pb-4 border-b border-slate-100 space-y-1.5">
        <Skeleton variant="text" width={220} height={22} />
        <Skeleton variant="text" width={340} height={12} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton variant="text" width={140} height={16} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton variant="text" width={70} height={12} />
              <Skeleton variant="rounded" width="100%" height={36} className="rounded-lg" />
            </div>
          ))}
          <Skeleton variant="rounded" width={120} height={36} className="rounded-lg pt-2" />
        </div>

        <div className="space-y-4">
          <Skeleton variant="text" width={140} height={16} />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton variant="text" width={90} height={12} />
              <Skeleton variant="rounded" width="100%" height={36} className="rounded-lg" />
            </div>
          ))}
          <Skeleton variant="rounded" width={130} height={36} className="rounded-lg pt-2" />
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 15. Onboarding Screen Skeleton
// ----------------------------------------------------
export const OnboardingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <SkeletonCircle size={48} />
          <Skeleton variant="text" width={180} height={24} />
          <Skeleton variant="text" width={240} height={14} />
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Skeleton variant="text" width={90} height={12} />
            <Skeleton variant="rounded" width="100%" height={40} className="rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton variant="text" width={80} height={12} />
            <Skeleton variant="rounded" width="100%" height={40} className="rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton variant="text" width={110} height={12} />
            <Skeleton variant="rounded" width="100%" height={40} className="rounded-lg" />
          </div>
        </div>

        <Skeleton variant="rounded" width="100%" height={44} className="rounded-xl mt-4" />
      </div>
    </div>
  );
};
