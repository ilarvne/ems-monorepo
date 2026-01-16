"use client";

import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker as ReactDayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

type TDayPickerProps = ComponentProps<typeof ReactDayPicker>;

function DayPicker({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: TDayPickerProps) {
	const defaultClassNames = getDefaultClassNames();

	return (
		<ReactDayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3 bg-background", className)}
			classNames={{
				// react-day-picker v9 classNames
				root: cn("w-fit", defaultClassNames.root),
				months: cn(
					"flex flex-col select-none sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
					defaultClassNames.months
				),
				month: cn("space-y-4", defaultClassNames.month),
				month_caption: cn(
					"flex justify-center pt-1 relative items-center capitalize",
					defaultClassNames.month_caption
				),
				caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
				nav: cn("flex items-center gap-1", defaultClassNames.nav),
				button_previous: cn(
					buttonVariants({ variant: "outline" }),
					"absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
					defaultClassNames.button_previous
				),
				button_next: cn(
					buttonVariants({ variant: "outline" }),
					"absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
					defaultClassNames.button_next
				),
				weekdays: cn("flex", defaultClassNames.weekdays),
				weekday: cn(
					"w-9 font-medium text-sm text-muted-foreground capitalize",
					defaultClassNames.weekday
				),
				week: cn("flex w-full mt-2", defaultClassNames.week),
				day: cn(
					"size-9 flex items-center justify-center text-muted-foreground text-center text-sm p-0 relative",
					"focus-within:relative focus-within:z-20",
					"[&:has([aria-selected].range_end)]:rounded-r-lg",
					"[&:last-child:has([aria-selected])]:rounded-r-lg",
					"[&:first-child:has([aria-selected])]:rounded-l-lg",
					"[&:has([aria-selected])]:bg-accent",
					defaultClassNames.day
				),
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"size-8 p-0 font-normal aria-selected:opacity-100",
					defaultClassNames.day_button
				),
				selected: cn(
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
					defaultClassNames.selected
				),
				today: cn("text-primary font-semibold", defaultClassNames.today),
				outside: cn(
					"opacity-50 aria-selected:opacity-40",
					defaultClassNames.outside
				),
				range_middle: cn(
					"aria-selected:bg-accent aria-selected:text-accent-foreground",
					defaultClassNames.range_middle
				),
				hidden: cn("invisible", defaultClassNames.hidden),
				disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
				...classNames,
			}}
			components={{
				Chevron: ({ orientation, ...props }) => {
					if (orientation === "left") {
						return <ChevronLeft className="size-4" {...props} />;
					}
					return <ChevronRight className="size-4" {...props} />;
				},
			}}
			locale={enUS}
			{...props}
		/>
	);
}

export { DayPicker };
