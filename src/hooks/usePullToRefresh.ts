import { useEffect, useState } from 'react';

export function usePullToRefresh(ref: React.RefObject<HTMLElement>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0 && !isRefreshing) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const y = e.touches[0].clientY;
      const dist = y - startY;
      
      if (dist > 0) {
        setPullDistance(Math.min(dist * 0.4, 100)); // Add resistance, max 100px
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;
      isPulling = false;
      
      setPullDistance((currentDist) => {
        if (currentDist > 60) {
          setIsRefreshing(true);
          setTimeout(() => {
            localStorage.setItem('just_refreshed', 'true');
            window.location.reload();
          }, 800);
          return 60; // hold at 60px while refreshing
        }
        return 0; // snap back if not pulled enough
      });
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, isRefreshing]);

  return { pullDistance, isRefreshing };
}
