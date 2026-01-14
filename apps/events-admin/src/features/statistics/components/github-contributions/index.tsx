import { Suspense, useState } from "react";
import { useQuery } from "@connectrpc/connect-query";
import { getEventActivityByYear } from "@repo/proto";
import { Calendar1 } from "lucide-react";

import { GitHubContributionFallback } from "./graph";
import { AnimatedGitHubContributionGraph } from './graph';
import type { Activity } from "@/features/statistics/components/kibo-ui/contribution-graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventActivityProps {
  year?: number;
}

export function EventActivity({ year: initialYear }: EventActivityProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(initialYear ?? currentYear);
  
  // Generate list of years (current year and 4 previous years)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data, isLoading } = useQuery(
    getEventActivityByYear, {
      year: selectedYear,
    }
  );

  const contributions = (data?.activities || []).map((activity) => ({
    date: activity.date,
    count: activity.count,
    level: activity.level,
  })) as Activity[];

  if (isLoading) {
    return <GitHubContributionFallback />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar1 className="size-5" />
            Event Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyze event creation trends and busy periods
          </p>
        </div>
        
        <div className="flex gap-1">
          {years.map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedYear(year)}
              className={cn(
                "min-w-[60px]",
                selectedYear === year && "pointer-events-none"
              )}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      <Suspense fallback={<GitHubContributionFallback />}>
        <AnimatedGitHubContributionGraph contributions={Promise.resolve(contributions)} />
      </Suspense>
    </div>
  );
}
