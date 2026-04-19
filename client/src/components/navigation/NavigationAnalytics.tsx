import React, { useState, useEffect } from 'react';
import { useNavigation } from './NavigationProvider';

export const NavigationAnalytics: React.FC = () => {
  const { currentPath } = useNavigation();
  const [analytics, setAnalytics] = useState({
    pageViews: 0,
    navigationTime: 0,
    userPath: [] as string[],
  });

  useEffect(() => {
    // Track page view (deferred to avoid synchronous setState in effect)
    queueMicrotask(() => {
      setAnalytics((prev) => ({
        ...prev,
        pageViews: prev.pageViews + 1,
        userPath: [...prev.userPath, currentPath],
      }));
    });

    // Track navigation time
    const startTime = Date.now();
    return () => {
      const endTime = Date.now();
      queueMicrotask(() => {
        setAnalytics((prev) => ({
          ...prev,
          navigationTime: prev.navigationTime + (endTime - startTime),
        }));
      });
    };
  }, [currentPath]);

  // Send analytics to backend (in production)
  useEffect(() => {
    if (analytics.pageViews > 0) {
      // sendAnalytics(analytics);
    }
  }, [analytics]);

  return null; // This component doesn't render anything visible
};
