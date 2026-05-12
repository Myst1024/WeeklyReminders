import { useEffect } from "react";
import React from "react";

import type { ScheduleItem } from "@/api";

import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

interface TaskModalProps {
	open: boolean;
	editingItem: ScheduleItem | null;
	defaultDay?: number;
	onClose: () => void;
	onSave: (
		item: Omit<ScheduleItem, "id" | "created_at" | "updated_at">,
	) => Promise<void>;
	isLoading: boolean;
}

export function TaskModal({
	open,
	editingItem,
	defaultDay,
	onClose,
	onSave,
	isLoading,
}: TaskModalProps) {
	const [day, setDay] = React.useState<number | string>("");
	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [time, setTime] = React.useState("08:00");
	const [enabled, setEnabled] = React.useState(true);
	const [error, setError] = React.useState("");

	useEffect(() => {
		if (editingItem) {
			setDay(editingItem.day_of_week);
			setTitle(editingItem.title);
			setDescription(editingItem.description);
			setTime(editingItem.time);
			setEnabled(editingItem.enabled);
		} else {
			setDay(defaultDay ?? "");
			setTitle("");
			setDescription("");
			setTime("08:00");
			setEnabled(true);
		}
		setError("");
	}, [editingItem, defaultDay]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!title.trim() || day === "") {
			setError("Title and day are required");
			return;
		}

		try {
			await onSave({
				day_of_week: Number(day),
				title,
				description,
				time,
				enabled,
				completed: false,
			});
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save task");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{editingItem ? "Edit Task" : "Add Task"}</DialogTitle>
					<DialogDescription>
						{editingItem
							? "Update your task details"
							: "Create a new scheduled task"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSave} className="space-y-4">
					{error && (
						<div className="rounded-md bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="day">Day *</Label>
						<select
							id="day"
							value={day}
							onChange={(e) => setDay(e.target.value)}
							className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
						>
							<option value="">Select a day</option>
							{DAYS.map((d) => (
								<option key={d} value={DAYS.indexOf(d)}>
									{d}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="title">Title *</Label>
						<Input
							id="title"
							placeholder="e.g., Turn on lights"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							placeholder="Optional description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="time">Time *</Label>
						<Input
							id="time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<input
							id="enabled"
							type="checkbox"
							checked={enabled}
							onChange={(e) => setEnabled(e.target.checked)}
							className="rounded"
						/>
						<Label htmlFor="enabled" className="font-normal cursor-pointer">
							Enabled
						</Label>
					</div>

					<DialogFooter>
						<Button type="button" variant="secondary" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
