"use client";

import { useSuspenseQuery } from "@connectrpc/connect-query";
import { Suspense } from "react";
import { CalendarBody } from "@/features/calendar/calendar-body";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context";
import { DndProvider } from "@/features/calendar/contexts/dnd-context";
import { CalendarHeader } from "@/features/calendar/header/calendar-header";
import { CalendarSkeleton } from "@/features/calendar/skeletons/calendar-skeleton";
import { listEventsForAdmin } from "@repo/proto";
import type { Event } from "@repo/proto";
import type { IEvent, IUser } from "@/features/calendar/interfaces";
import type { TEventColor } from "@/features/calendar/types";

// Color palette for events
const EVENT_COLORS: TEventColor[] = ["blue", "green", "red", "yellow", "purple", "orange"];

import { differenceInHours, parseISO } from "date-fns";

// ... existing imports ...

/**
 * Transform API Event to Calendar IEvent format
 */
function transformEventToCalendarEvent(event: Event, index: number): IEvent {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    // Infer all day if duration is >= 24h
    const isAllDay = differenceInHours(end, start) >= 24;

	return {
		id: Number(event.id),
		title: event.title,
		description: event.description,
		startDate: event.startTime,
		endDate: event.endTime,
		color: EVENT_COLORS[index % EVENT_COLORS.length],
        isAllDay,
		user: {
			id: String(event.userId),
			name: event.organization?.title || "Unknown",
			picturePath: event.organization?.imageUrl || null,
		},
	};
}

function CalendarContent() {
	const { data } = useSuspenseQuery(listEventsForAdmin, { page: 1, limit: 1000 });
	
	const events: IEvent[] = (data?.events || []).map(transformEventToCalendarEvent);
	
	// Extract unique users from events
	const usersMap = new Map<string, IUser>();
	events.forEach((event) => {
		if (!usersMap.has(event.user.id)) {
			usersMap.set(event.user.id, event.user);
		}
	});
	const users: IUser[] = Array.from(usersMap.values());

	return (
		<CalendarProvider events={events} users={users} view="month">
			<DndProvider showConfirmation={false}>
				<div className="w-full border rounded-xl">
					<CalendarHeader />
					<CalendarBody />
				</div>
			</DndProvider>
		</CalendarProvider>
	);
}

export function Calendar() {
	return (
		<Suspense fallback={<CalendarSkeleton />}>
			<CalendarContent />
		</Suspense>
	);
}
