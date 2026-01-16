import { zodResolver } from "@hookform/resolvers/zod";
import { addMinutes, format, set } from "date-fns";
import { type ReactNode, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import {
	Modal,
	ModalClose,
	ModalContent,
	ModalDescription,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	ModalTrigger,
} from "@repo/ui/components/responsive-modal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { COLORS, EVENT_COLOR_CLASSES } from "@/features/calendar/constants";
import { useCalendar } from "@/features/calendar/contexts/calendar-context";
import { useDisclosure } from "@/features/calendar/hooks";
import type { IEvent } from "@/features/calendar/interfaces";
import {
	eventSchema,
	type TEventFormData,
} from "@/features/calendar/schemas";

interface IProps {
	children: ReactNode;
	startDate?: Date;
	startTime?: { hour: number; minute: number };
	event?: IEvent;
}

export function AddEditEventDialog({
	children,
	startDate,
	startTime,
	event,
}: IProps) {
	const { isOpen, onClose, onToggle } = useDisclosure();
	const { addEvent, updateEvent } = useCalendar();
	const isEditing = !!event;

	const initialDates = useMemo(() => {
		if (!isEditing && !event) {
			if (!startDate) {
				const now = new Date();
				return { startDate: now, endDate: addMinutes(now, 30) };
			}
			const start = startTime
				? set(new Date(startDate), {
						hours: startTime.hour,
						minutes: startTime.minute,
						seconds: 0,
					})
				: new Date(startDate);
			const end = addMinutes(start, 30);
			return { startDate: start, endDate: end };
		}

		return {
			startDate: new Date(event.startDate),
			endDate: new Date(event.endDate),
		};
	}, [startDate, startTime, event, isEditing]);

	const form = useForm<TEventFormData>({
		resolver: zodResolver(eventSchema),
		defaultValues: {
			title: event?.title ?? "",
			description: event?.description ?? "",
			startDate: initialDates.startDate,
			endDate: initialDates.endDate,
			hasTime: true,
			startTime: format(initialDates.startDate, "HH:mm"),
			endTime: format(initialDates.endDate, "HH:mm"),
			color: event?.color ?? "blue",
		},
	});

	useEffect(() => {
		form.reset({
			title: event?.title ?? "",
			description: event?.description ?? "",
			startDate: initialDates.startDate,
			endDate: initialDates.endDate,
			hasTime: true,
			startTime: format(initialDates.startDate, "HH:mm"),
			endTime: format(initialDates.endDate, "HH:mm"),
			color: event?.color ?? "blue",
		});
	}, [event, initialDates, form]);

	const onSubmit = (values: TEventFormData) => {
		try {
			const startDate = new Date(values.startDate)
			const endDate = new Date(values.endDate)

			if (values.hasTime) {
				const [startHour, startMinute] = (values.startTime ?? "00:00")
					.split(":")
					.map(Number)
				const [endHour, endMinute] = (values.endTime ?? "23:59").split(":").map(Number)
				startDate.setHours(startHour, startMinute, 0, 0)
				endDate.setHours(endHour, endMinute, 0, 0)
			} else {
				startDate.setHours(0, 0, 0, 0)
				endDate.setHours(23, 59, 0, 0)
			}

			const formattedEvent: IEvent = {
				...values,
				startDate: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
				endDate: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
				id: isEditing ? event.id : Math.floor(Math.random() * 1000000),
				user: isEditing
					? event.user
					: {
							id: Math.floor(Math.random() * 1000000).toString(),
							name: "Jeraidi Yassir",
							picturePath: null,
						},
				color: values.color,
			};

			if (isEditing) {
				updateEvent(formattedEvent);
				toast.success("Event updated successfully");
			} else {
				addEvent(formattedEvent);
				toast.success("Event created successfully");
			}

			onClose();
			form.reset();
		} catch (error) {
			console.error(`Error ${isEditing ? "editing" : "adding"} event:`, error);
			toast.error(`Failed to ${isEditing ? "edit" : "add"} event`);
		}
	};

	return (
		<Modal open={isOpen} onOpenChange={onToggle} modal={false}>
			<ModalTrigger asChild>{children}</ModalTrigger>
			<ModalContent>
				<ModalHeader>
					<ModalTitle>{isEditing ? "Edit Event" : "Add New Event"}</ModalTitle>
					<ModalDescription>
						{isEditing
							? "Modify your existing event."
							: "Create a new event for your calendar."}
					</ModalDescription>
				</ModalHeader>

				<Form {...form}>
					<form
						id="event-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid gap-4 py-4"
					>
						<div className="rounded-lg border bg-muted/30 p-4 space-y-4">
						<FormField
							control={form.control}
							name="title"
							render={({ field, fieldState }) => (
								<FormItem>
									<FormLabel htmlFor="title" className="required">
										Title
									</FormLabel>
									<FormControl>
										<Input
											id="title"
											placeholder="Enter a title"
											{...field}
											className={fieldState.invalid ? "border-red-500" : ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startDate"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="required">Start Date</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={
															"w-full justify-start text-left font-normal " +
															(fieldState.invalid ? "border-red-500" : "")
														}
													>
														{field.value ? format(field.value, "PPP") : "Pick a date"}
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={(date) => {
														if (date) {
															field.onChange(date)
														}
													}}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="endDate"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="required">End Date</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={
															"w-full justify-start text-left font-normal " +
															(fieldState.invalid ? "border-red-500" : "")
														}
													>
														{field.value ? format(field.value, "PPP") : "Pick a date"}
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={(date) => {
														if (date) {
															field.onChange(date)
														}
													}}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="hasTime"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between gap-3">
									<div>
										<FormLabel>Include Time</FormLabel>
										<div className="text-sm text-muted-foreground">
											Turn off for all-day / date-only
										</div>
									</div>
									<FormControl>
										<Switch checked={field.value} onCheckedChange={(checked) => {
										field.onChange(checked)
										if (!checked) {
											form.setValue("startTime", undefined)
											form.setValue("endTime", undefined)
										}
									}} />
									</FormControl>
								</FormItem>
							)}
						/>

						{form.watch("hasTime") ? (
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="startTime"
									render={({ field, fieldState }) => (
										<FormItem>
											<FormLabel className="required">Start Time</FormLabel>
											<FormControl>
												<Input
													type="time"
													{...field}
													className={fieldState.invalid ? "border-red-500" : ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="endTime"
									render={({ field, fieldState }) => (
										<FormItem>
											<FormLabel className="required">End Time</FormLabel>
											<FormControl>
												<Input
													type="time"
													{...field}
													className={fieldState.invalid ? "border-red-500" : ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						) : null}
						<FormField
							control={form.control}
							name="color"
							render={({ field, fieldState }) => (
								<FormItem>
									<FormLabel className="required">Variant</FormLabel>
									<FormControl>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger
												className={`w-full ${
													fieldState.invalid ? "border-red-500" : ""
												}`}
											>
												<SelectValue placeholder="Select a variant" />
											</SelectTrigger>
									<SelectContent>
										{COLORS.map((color) => (
											<SelectItem value={color} key={color}>
												<div className="flex items-center gap-2">
													<div
														className={
															"size-3.5 rounded-full " + EVENT_COLOR_CLASSES[color]
														}
													/>
													{color}
												</div>
											</SelectItem>
										))}
									</SelectContent>

										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field, fieldState }) => (
								<FormItem>
									<FormLabel className="required">Description</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Enter a description"
											className={fieldState.invalid ? "border-red-500" : ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					</form>
				</Form>
				<ModalFooter className="flex justify-end gap-2">
					<ModalClose asChild>
						<Button type="button" variant="outline">
							Cancel
						</Button>
					</ModalClose>
					<Button form="event-form" type="submit">
						{isEditing ? "Save Changes" : "Create Event"}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
