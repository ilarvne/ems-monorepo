import { z } from "zod";

export const eventSchema = z
	.object({
		title: z.string().min(1, "Title is required"),
		description: z.string().min(1, "Description is required"),
		startDate: z.date({
			required_error: "Start date is required",
		}),
		endDate: z.date({
			required_error: "End date is required",
		}),
		hasTime: z.boolean().default(true),
		startTime: z.string().optional(),
		endTime: z.string().optional(),
		color: z.enum(["blue", "green", "red", "yellow", "purple", "orange"], {
			required_error: "Variant is required",
		}),
	})
	.superRefine((values, context) => {
		if (!values.hasTime) {
			return
		}

		if (!values.startTime) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Start time is required",
				path: ["startTime"],
			})
		}

		if (!values.endTime) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "End time is required",
				path: ["endTime"],
			})
		}

		if (values.startTime && values.endTime) {
			const [startHour, startMinute] = values.startTime.split(":").map(Number)
			const [endHour, endMinute] = values.endTime.split(":").map(Number)

			const startMillis = new Date(values.startDate).setHours(startHour, startMinute, 0, 0)
			const endMillis = new Date(values.endDate).setHours(endHour, endMinute, 0, 0)

			if (endMillis <= startMillis) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: "End datetime must be after start",
					path: ["endDate"],
				})
			}
		}
	});

export type TEventFormData = z.infer<typeof eventSchema>;
