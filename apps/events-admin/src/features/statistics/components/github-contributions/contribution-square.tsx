import { forwardRef, useCallback, useImperativeHandle, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

import type { Activity } from '@/features/statistics/components/kibo-ui/contribution-graph';

export type ColorScheme = {
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
};

// GitHub contribution graph color scheme supporting light and dark themes
export const GITHUB_COLOR_SCHEME: { light: ColorScheme; dark: ColorScheme } = {
  light: {
    level0: 'hsl(210 40% 93%)',
    level1: 'hsl(143 43% 79%)',
    level2: 'hsl(142 52% 51%)',
    level3: 'hsl(142 62% 43%)',
    level4: 'hsl(142 71% 29%)',
  },
  dark: {
    level0: 'hsl(215 28% 17%)',
    level1: 'hsl(142 85% 15%)',
    level2: 'hsl(142 100% 22%)',
    level3: 'hsl(142 71% 45%)',
    level4: 'hsl(142 71% 58%)',
  },
};

export type ContributionSquareProps = {
  activity: Activity;
  weekIndex: number;
  dayIndex: number;
  colorScheme: ColorScheme;
  blockSize: number;
  blockMargin: number;
  blockRadius: number;
  labelHeight: number;
};

const getColorForLevel = (level: number, colorScheme: ColorScheme): string => {
  switch (level) {
    case 0:
      return colorScheme.level0;
    case 1:
      return colorScheme.level1;
    case 2:
      return colorScheme.level2;
    case 3:
      return colorScheme.level3;
    case 4:
      return colorScheme.level4;
    default:
      return colorScheme.level0;
  }
};

const springConfig = {
  duration: 0.6,
  ease: "elastic.out(1, 0.5)",
};

const resetSpringConfig = {
  duration: 0.4,
  ease: "power2.out",
};

export type SquareAnimationControls = {
  startAnimation: () => Promise<void>;
  resetAnimation: () => Promise<void>;
};

export const AnimatedContributionSquare = forwardRef<
  SquareAnimationControls,
  ContributionSquareProps
>(
  (
    {
      activity,
      weekIndex,
      dayIndex,
      colorScheme,
      blockSize,
      blockMargin,
      blockRadius,
      labelHeight,
    },
    ref
  ) => {
    const rectRef = useRef<SVGRectElement>(null);

    useEffect(() => {
      if (rectRef.current) {
        gsap.set(rectRef.current, {
          scale: 1,
          fill: getColorForLevel(activity.level, colorScheme),
          transformOrigin: 'center center',
          opacity: 0,
        });
      }
    }, [activity.level, colorScheme]);

    const startAnimation = useCallback(async () => {
      if (!rectRef.current) return;

      // Bottom-left to top-right: start from Sunday (dayIndex=6) of first week (weekIndex=0)
      const delay = 45 * (weekIndex + (6 - dayIndex)) / 1000;

      return new Promise<void>((resolve) => {
        gsap.timeline({
          onComplete: resolve,
        })
        .to(rectRef.current, {
          opacity: 1,
          scale: 0.4,
          duration: springConfig.duration / 2,
          ease: "power2.in",
          delay,
        })
        .to(rectRef.current, {
          scale: 1,
          fill: getColorForLevel(activity.level, colorScheme),
          duration: springConfig.duration,
          ease: springConfig.ease,
        });
      });
    }, [weekIndex, dayIndex, activity.level, colorScheme]);

    const resetAnimation = useCallback(async () => {
      if (!rectRef.current) return;

      return new Promise<void>((resolve) => {
        gsap.to(rectRef.current, {
          scale: 1,
          opacity: 0,
          fill: colorScheme.level0,
          delay: Math.random() * 0.5,
          ...resetSpringConfig,
          onComplete: resolve,
        });
      });
    }, [colorScheme]);

    useImperativeHandle(
      ref,
      () => ({
        startAnimation: startAnimation,
        resetAnimation: resetAnimation,
      }),
      [startAnimation, resetAnimation]
    );

    return (
      <rect
        ref={rectRef}
        data-count={activity.count}
        data-date={activity.date}
        data-level={activity.level}
        height={blockSize}
        rx={blockRadius}
        ry={blockRadius}
        width={blockSize}
        x={(blockSize + blockMargin) * weekIndex}
        y={labelHeight + (blockSize + blockMargin) * dayIndex}
      />
    );
  }
);

AnimatedContributionSquare.displayName = 'AnimatedContributionSquare';
