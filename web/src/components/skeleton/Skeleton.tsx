import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
  style,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded h-3.5';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
      default:
        return 'rounded-xl';
    }
  };

  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <div
      className={`skeleton-shimmer bg-slate-200/75 select-none pointer-events-none ${getVariantClass()} ${className}`}
      style={inlineStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className = '', lastLineWidth = '65%' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="w-full"
          style={i === lines - 1 && lines > 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
};

export const SkeletonCircle: React.FC<{
  size?: number | string;
  className?: string;
}> = ({ size = 40, className = '' }) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;
  return (
    <Skeleton
      variant="circular"
      style={{ width: sizeValue, height: sizeValue }}
      className={`shrink-0 ${className}`}
    />
  );
};

export const SkeletonButton: React.FC<{
  className?: string;
  width?: string | number;
  height?: string | number;
}> = ({ className = '', width = 96, height = 36 }) => {
  return <Skeleton variant="rounded" width={width} height={height} className={`rounded-lg ${className}`} />;
};
