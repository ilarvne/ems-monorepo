import { motion } from "framer-motion";
import { useMemo } from "react";
import { startOfDay } from "date-fns";
import {
	staggerContainer,
	transition,
} from "@/features/calendar/animations";
import { useCalendar } from "@/features/calendar/contexts/calendar-context";

import {
	calculateMonthEventPositions,
	getCalendarCells,
	groupEventsByDay,
} from "@/features/calendar/helpers";

import type { IEvent } from "@/features/calendar/interfaces";
import { DayCell } from "@/features/calendar/views/month-view/day-cell";

interface IProps {
	singleDayEvents: IEvent[];
	multiDayEvents: IEvent[];
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonthView({ singleDayEvents, multiDayEvents }: IProps) {
	const { selectedDate } = useCalendar();

	const allEvents = useMemo(
		() => [...multiDayEvents, ...singleDayEvents],
		[multiDayEvents, singleDayEvents],
	);

	const cells = useMemo(() => getCalendarCells(selectedDate), [selectedDate]);

	const eventPositions = useMemo(
		() =>
			calculateMonthEventPositions(
				multiDayEvents,
				singleDayEvents,
				selectedDate,
			),
		[multiDayEvents, singleDayEvents, selectedDate],
	);

	const eventsByDay = useMemo(() => groupEventsByDay(allEvents), [allEvents]);

	return (
		<motion.div initial="initial" animate="animate" variants={staggerContainer}>
			<div className="grid grid-cols-7">
				{WEEK_DAYS.map((day, index) => (
					<motion.div
						key={day}
						className="flex items-center justify-center py-2"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05, ...transition }}
					>
						<span className="text-xs font-medium text-muted-foreground">{day}</span>
					</motion.div>
				))}
			</div>

			<div className="grid grid-cols-7 overflow-hidden">
				{cells.map((cell, index) => {
					const dayKey = startOfDay(cell.date).toISOString();
					const dayEvents = eventsByDay[dayKey] || [];
					return (
						<DayCell
							key={index}
							cell={cell}
							events={dayEvents}
							eventPositions={eventPositions}
						/>
					);
				})}
			</div>
		</motion.div>
	);
}
