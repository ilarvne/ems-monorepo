import type { TEventColor } from "@/features/calendar/types";

export const COLORS: TEventColor[] = [
	"blue",
	"green",
	"red",
	"yellow",
	"purple",
	"orange",
];

export const EVENT_COLOR_CLASSES: Record<TEventColor, string> = {
	blue: "bg-blue-600 dark:bg-blue-500",
	green: "bg-green-600 dark:bg-green-500",
	red: "bg-red-600 dark:bg-red-500",
	yellow: "bg-yellow-600 dark:bg-yellow-500",
	purple: "bg-purple-600 dark:bg-purple-500",
	orange: "bg-orange-600 dark:bg-orange-500",
};
