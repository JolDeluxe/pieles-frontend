import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface CuadraLoadingProps {
  className?: string;
  imageClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'screen';
  alt?: string;
}

export function CuadraLoading({
  className,
  imageClassName,
  size = 'md',
  alt = 'Cargando...',
}: CuadraLoadingProps): ReactNode {
  const sizeClasses = {
    sm: 'w-24',
    md: 'w-36',
    lg: 'w-48',
    screen: 'w-56',
  };

  const isFullScreen = size === 'screen';

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        isFullScreen ? 'min-h-screen w-full bg-app-bg' : 'min-h-[220px] w-full',
        className,
      )}
      role="status"
      aria-label={alt}
    >
      <img
        src="/img/01_Cuadra.png"
        alt={alt}
        className={cn(
          'h-auto object-contain select-none animate-pulse transition-opacity duration-1000 dark:invert',
          sizeClasses[size],
          imageClassName,
        )}
      />
    </div>
  );
}
