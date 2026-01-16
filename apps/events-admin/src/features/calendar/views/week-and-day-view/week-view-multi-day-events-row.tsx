import {
	addDays,
	differenceInDays,
	endOfWeek,
	isAfter,
	isBefore,
	parseISO,
	startOfDay,
	startOfWeek,
} from "date-fns";
import { useMemo } from "react";
import type { IEvent } from "@/features/calendar/interfaces";
import { MonthEventBadge } from "@/features/calendar/views/month-view/month-event-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { ScrollArea } from "@repo/ui/components/scroll-area";

interface IProps {
	selectedDate: Date;
	multiDayEvents: IEvent[];
}

const MAX_VISIBLE_EVENTS = 3;

export function WeekViewMultiDayEventsRow({
	selectedDate,
	multiDayEvents,
}: IProps) {
	const weekStart = startOfWeek(selectedDate);
	const weekEnd = endOfWeek(selectedDate);
	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

	const processedEvents = useMemo(() => {
		return multiDayEvents
			.map((event) => {
				const start = parseISO(event.startDate);
				const end = parseISO(event.endDate);
				const adjustedStart = isBefore(start, weekStart) ? weekStart : start;
				const adjustedEnd = isAfter(end, weekEnd) ? weekEnd : end;
				const startIndex = differenceInDays(adjustedStart, weekStart);
				const endIndex = differenceInDays(adjustedEnd, weekStart);

				return {
					...event,
					adjustedStart,
					adjustedEnd,
					startIndex,
					endIndex,
				};
			})
			.sort((a, b) => {
				const startDiff = a.adjustedStart.getTime() - b.adjustedStart.getTime();
				if (startDiff !== 0) return startDiff;
				return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
			});
	}, [multiDayEvents, weekStart, weekEnd]);

	const eventRows = useMemo(() => {
		const rows: (typeof processedEvents)[] = [];

		processedEvents.forEach((event) => {
			let rowIndex = rows.findIndex((row) =>
				row.every(
					(e) => e.endIndex < event.startIndex || e.startIndex > event.endIndex,
				),
			);

			if (rowIndex === -1) {
				rowIndex = rows.length;
				rows.push([]);
			}

			rows[rowIndex].push(event);
		});

		return rows;
	}, [processedEvents]);

	const hasEventsInWeek = useMemo(() => {
		return multiDayEvents.some((event) => {
			const start = parseISO(event.startDate);
			const end = parseISO(event.endDate);

			return (
				// Event starts within the week
				(start >= weekStart && start <= weekEnd) ||
				// Event ends within the week
				(end >= weekStart && end <= weekEnd) ||
				// Event spans the entire week
				(start <= weekStart && end >= weekEnd)
			);
		});
	}, [multiDayEvents, weekStart, weekEnd]);

	if (!hasEventsInWeek) {
		return null;
	}
    
    // Calculate total rows needed, limited by MAX
    const visibleRows = eventRows.slice(0, MAX_VISIBLE_EVENTS);
    const hasMore = eventRows.length > MAX_VISIBLE_EVENTS;

	return (
		<div className="overflow-hidden flex">
			<div className="w-[72px] border-b border-border"></div>
			<div className="grid flex-1 grid-cols-7 divide-x divide-border border-b border-border border-l">
				{weekDays.map((day, dayIndex) => {
                    // Check if we need to show "Show more" for this day
                    const hiddenEventsCount = eventRows.slice(MAX_VISIBLE_EVENTS).flat().filter(
                        (e) => e.startIndex <= dayIndex && e.endIndex >= dayIndex
                    ).length;

                    return (
					<div
						key={day.toISOString()}
						className="flex h-full flex-col gap-1 py-1"
					>
						{visibleRows.map((row, rowIndex) => {
							const event = row.find(
								(e) => e.startIndex <= dayIndex && e.endIndex >= dayIndex,
							);

							if (!event) {
								return (
									<div key={`${rowIndex}-${dayIndex}`} className="h-[26px]" />
								);
							}

							let position: "first" | "middle" | "last" | "none" = "none";

							if (
								dayIndex === event.startIndex &&
								dayIndex === event.endIndex
							) {
								position = "none";
							} else if (dayIndex === event.startIndex) {
								position = "first";
							} else if (dayIndex === event.endIndex) {
								position = "last";
							} else {
								position = "middle";
							}

							return (
								<MonthEventBadge
									key={`${event.id}-${dayIndex}`}
									event={event}
									cellDate={startOfDay(day)}
									position={position}
								/>
							);
						})}
                        
                        {hasMore && hiddenEventsCount > 0 && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-xs text-muted-foreground hover:bg-accent rounded px-1 w-full text-left font-medium">
                                        +{hiddenEventsCount} more
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="start">
                                    <div className="p-2 border-b font-semibold text-sm">
                                        {startOfDay(day).toLocaleDateString()}
                                    </div>
                                    <ScrollArea className="h-64 p-2">
                                        <div className="flex flex-col gap-1">
                                            {eventRows.flat()
                                                .filter((e) => e.startIndex <= dayIndex && e.endIndex >= dayIndex)
                                                .map(event => (
                                                    <MonthEventBadge
                                                        key={`popover-${event.id}`}
                                                        event={event}
                                                        cellDate={startOfDay(day)}
                                                        position="none"
                                                    />
                                                ))
                                            }
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        )}
					</div>
				)})}
			</div>
		</div>
	);
}
