"use client";

import { isSameDay, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { fadeIn, transition } from "@/features/calendar/animations";
import { useCalendar } from "@/features/calendar/contexts/calendar-context";
import { AgendaEvents } from "@/features/calendar/views/agenda-view/agenda-events";
import { CalendarMonthView } from "@/features/calendar/views/month-view/calendar-month-view";
import { CalendarDayView } from "@/features/calendar/views/week-and-day-view/calendar-day-view";
import { CalendarWeekView } from "@/features/calendar/views/week-and-day-view/calendar-week-view";
import { CalendarYearView } from "@/features/calendar/views/year-view/calendar-year-view";

export function CalendarBody() {
	const { view, events } = useCalendar();

	const { singleDayEvents, multiDayEvents } = useMemo(() => {
		const single: typeof events = [];
		const multi: typeof events = [];

		events.forEach((event) => {
			if (event.isAllDay) {
				multi.push(event);
				return;
			}
			const startDate = parseISO(event.startDate);
			const endDate = parseISO(event.endDate);
			
			if (isSameDay(startDate, endDate)) {
				single.push(event);
			} else {
				multi.push(event);
			}
		});

		return { singleDayEvents: single, multiDayEvents: multi };
	}, [events]);

	return (
		<div className="w-full h-full overflow-scroll relative">
			<motion.div
				key={view}
				initial="initial"
				animate="animate"
				exit="exit"
				variants={fadeIn}
				transition={transition}
			>
				{view === "month" && (
					<CalendarMonthView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === "week" && (
					<CalendarWeekView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === "day" && (
					<CalendarDayView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === "year" && (
					<CalendarYearView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === "agenda" && (
					<motion.div
						key="agenda"
						initial="initial"
						animate="animate"
						exit="exit"
						variants={fadeIn}
						transition={transition}
					>
						<AgendaEvents />
					</motion.div>
				)}
			</motion.div>
		</div>
	);
}
