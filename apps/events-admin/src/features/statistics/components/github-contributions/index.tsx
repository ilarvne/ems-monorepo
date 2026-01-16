import { useQuery } from "@connectrpc/connect-query";
import { getEventActivityByYear } from "@repo/proto";
import { Calendar1 } from "lucide-react";
import { useState } from "react";

import { AnimatedGitHubContributionGraph, GitHubContributionFallback } from "./graph";
import type { Activity } from "@/features/statistics/components/kibo-ui/contribution-graph";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

interface EventActivityProps {
  year?: number;
}

export function EventActivity({ year: initialYear }: EventActivityProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(initialYear ?? currentYear);
  
  // Generate list of years (current year and 4 previous years)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

	const { data, isLoading } = useQuery(getEventActivityByYear, {
		year: selectedYear,
	});

	const activities = (data?.activities || []) as Activity[];
	const contributions = activities.map((activity) => ({
		date: activity.date,
		count: activity.count,
		level: activity.level,
	}));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Calendar1 className="size-5" />
            Event Activity
          </CardTitle>
          <CardDescription>
            Events created and registrations over time
          </CardDescription>
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
      </CardHeader>
		<CardContent>
			{isLoading ? (
				<GitHubContributionFallback />
			) : (
				<AnimatedGitHubContributionGraph contributions={contributions} />
			)}
		</CardContent>

    </Card>
  );
}
