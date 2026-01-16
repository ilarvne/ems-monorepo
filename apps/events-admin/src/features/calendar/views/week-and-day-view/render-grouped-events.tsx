import { areIntervalsOverlapping, parseISO } from "date-fns";
import { getEventBlockStyle } from "@/features/calendar/helpers";
import type { IEvent } from "@/features/calendar/interfaces";
import { EventBlock } from "@/features/calendar/views/week-and-day-view/event-block";

interface RenderGroupedEventsProps {
	groupedEvents: IEvent[][];
	day: Date;
}

export function RenderGroupedEvents({
	groupedEvents,
	day,
}: RenderGroupedEventsProps) {
	return groupedEvents.map((group, groupIndex) =>
		group.map((event) => {
			// Basic style from helper
            // eslint-disable-next-line
			let style: any = getEventBlockStyle(
				event,
				day,
				groupIndex,
				groupedEvents.length,
			);
			
            // Intelligent overlapping logic:
            // If there are multiple groups (columns), each takes 1/N width.
            // But if we want them to expand when not overlapping with neighbors, that's complex.
            // Current helper logic: width = 100 / groupSize.
            
            // Refine: Check strictly for overlap with OTHER groups.
            // If this event overlaps with ANY event in ANY other group, it keeps narrow width.
            // If it DOES NOT overlap with any concurrent groups, it could technically take more space,
            // but for simple column layout, uniform width is safest and most consistent visually.
            // The previous logic was checking overlap to decide if it should be full width (100%).
            
			const hasOverlap = groupedEvents.some(
				(otherGroup, otherIndex) =>
					otherIndex !== groupIndex &&
					otherGroup.some((otherEvent) =>
						areIntervalsOverlapping(
							{
								start: parseISO(event.startDate),
								end: parseISO(event.endDate),
							},
							{
								start: parseISO(otherEvent.startDate),
								end: parseISO(otherEvent.endDate),
							},
						),
					),
			);

            // If there is NO overlap with events in other columns, expand to full width.
            // This handles cases where we have 3 columns but at 09:00 only one event exists.
			if (!hasOverlap) {
                style = { ...style, width: "100%", left: "0%" };
            }

			return (
				<div key={event.id} className="absolute p-1" style={style}>
					<EventBlock event={event} />
				</div>
			);
		}),
	);
}
