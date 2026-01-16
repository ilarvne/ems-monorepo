"use client";

import dayjs from "dayjs";
import { LoaderIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@repo/ui/hooks/use-theme";

import type { Activity } from "@/features/statistics/components/kibo-ui/contribution-graph";
import {
  ContributionGraph,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/features/statistics/components/kibo-ui/contribution-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

import {
  AnimatedContributionSquare,
  GITHUB_COLOR_SCHEME,
  type SquareAnimationControls,
} from "./contribution-square";

type AnimationState = "idle" | "animating" | "resetting";

export function AnimatedGitHubContributionGraph({
  contributions,
  autoPlay = true,
}: {
  contributions: Activity[];
  autoPlay?: boolean;
}) {
  const data = contributions;
  const squareRefs = useRef<Map<string, SquareAnimationControls>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleAnimation = useCallback(async () => {
    if (animationState === "animating") return;

    setAnimationState("animating");

    // Trigger all animations
    const animations = Array.from(squareRefs.current.values()).map((ref) =>
      ref.startAnimation()
    );

    await Promise.all(animations);
    setAnimationState("idle");
    setHasPlayedOnce(true);
  }, [animationState]);

  const handleReset = useCallback(async () => {
    if (animationState === "resetting") return;

    setAnimationState("resetting");

    // Trigger all reset animations
    const resets = Array.from(squareRefs.current.values()).map((ref) =>
      ref.resetAnimation()
    );

    await Promise.all(resets);
    setAnimationState("idle");
    setHasPlayedOnce(false);
  }, [animationState]);

  useEffect(() => {
    if (!autoPlay || hasPlayedOnce || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && animationState === "idle" && !hasPlayedOnce) {
            setHasPlayedOnce(true);
            handleAnimation();
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of the element is visible
        rootMargin: "0px",
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [autoPlay, animationState, hasPlayedOnce, handleAnimation]);

  return (
    <div ref={containerRef} className="space-y-4">
      <ContributionGraph
        className="mx-auto py-2"
        data={data}
        blockSize={11}
        blockMargin={3}
        blockRadius={2}
      >
        <ContributionGraphCalendar
          className="no-scrollbar px-2"
          title="GitHub Contributions"
        >
          {({ activity, dayIndex, weekIndex }) => {
            const key = `${weekIndex}-${dayIndex}`;

            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <g>
                    <AnimatedContributionSquare
                      ref={(ref) => {
                        if (ref) {
                          squareRefs.current.set(key, ref);
                        } else {
                          squareRefs.current.delete(key);
                        }
                      }}
                      activity={activity}
                      dayIndex={dayIndex}
                      weekIndex={weekIndex}
                      colorScheme={isDark ? GITHUB_COLOR_SCHEME.dark : GITHUB_COLOR_SCHEME.light}
                      blockSize={11}
                      blockMargin={3}
                      blockRadius={2}
                      labelHeight={22}
                    />
                  </g>
                </TooltipTrigger>

                <TooltipContent className="font-sans" sideOffset={0}>
                  <p>
                    {activity.count} contribution
                    {activity.count !== 1 ? "s" : null} on{" "}
                    {dayjs(activity.date).format("DD.MM.YYYY")}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          }}
        </ContributionGraphCalendar>

        <ContributionGraphFooter className="px-2">
          <ContributionGraphTotalCount>
            {({ totalCount, year }) => (
               <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{totalCount.toLocaleString("en")}</span> event
                  {totalCount !== 1 ? "s" : ""} created in
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20 animate-in fade-in zoom-in duration-300">
                  {year}
                </span>
              </div>
            )}
          </ContributionGraphTotalCount>

          <ContributionGraphLegend />
        </ContributionGraphFooter>
      </ContributionGraph>

      <div className="flex justify-center gap-2">
        <button
          onClick={handleAnimation}
          disabled={animationState === "animating"}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {animationState === "animating" ? "Animating..." : "Play Animation"}
        </button>
        <button
          onClick={handleReset}
          disabled={animationState === "resetting"}
          className="rounded bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
        >
          {animationState === "resetting" ? "Resetting..." : "Reset"}
        </button>
      </div>
    </div>
  );
}

export function GitHubContributionFallback() {
  return (
    <div className="flex h-[162px] w-full items-center justify-center">
      <LoaderIcon className="animate-spin text-muted-foreground" />
    </div>
  );
}
