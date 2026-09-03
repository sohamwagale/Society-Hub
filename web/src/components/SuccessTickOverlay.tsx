import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessTickOverlayProps {
  show: boolean;
  message?: string;
}

export const SuccessTickOverlay: React.FC<SuccessTickOverlayProps> = ({ show, message = 'Completed!' }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 animate-in fade-in zoom-in duration-200">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-emerald-200/60 animate-bounce">
        <CheckCircle2 size={36} />
      </div>
      <p className="font-bold text-slate-800 text-sm tracking-tight">{message}</p>
    </div>
  );
};

export default SuccessTickOverlay;
