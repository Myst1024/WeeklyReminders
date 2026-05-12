import { cn } from "@/lib/utils";
import { Temporal } from "@js-temporal/polyfill";
import { Check } from "lucide-react";

import type { ScheduleItem } from "@/api";

import { Button } from "./ui/button";

interface TaskCardProps {
	item: ScheduleItem;
	onEdit: (item: ScheduleItem) => void;
	onDelete: (id: number) => void;
	onTrigger: (id: number) => void;
	onToggleComplete: (id: number) => void;
}

function formatTime12Hour(time24: string): string {
	const [hours, minutes] = time24.split(":").map(Number);
	const time = Temporal.PlainTime.from({ hour: hours, minute: minutes });
	return time.toLocaleString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

export function TaskCard({ item, onEdit, onDelete, onTrigger, onToggleComplete }: TaskCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border border-primary border-l-4 p-4 shadow-md glass-card transition-all",
				!item.enabled && "opacity-60",
			)}
		>
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex-1">
					<div className="text-sm font-medium text-primary">{formatTime12Hour(item.time)}</div>
					<div className="text-sm font-semibold text-foreground">
						{item.title}
					</div>
					{item.description && (
						<div className="mt-1 text-xs text-muted-foreground leading-relaxed">
							{item.description}
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => onToggleComplete(item.id)}
					className={cn(
						"flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all",
						item.completed
							? "bg-green-500 hover:bg-green-600 text-white"
							: "bg-gray-200 hover:bg-gray-300 text-gray-400",
					)}
					title={item.completed ? "Mark as incomplete" : "Mark as complete"}
				>
					<Check className="h-5 w-5" />
				</button>
			</div>
			<div className="flex gap-2">
				<Button
					size="sm"
					variant="default"
					className="flex-1"
					onClick={() => onTrigger(item.id)}
				>
					Trigger
				</Button>
				<Button
					size="sm"
					variant="secondary"
					className="flex-1"
					onClick={() => onEdit(item)}
				>
					Edit
				</Button>
				<Button
					size="sm"
					variant="destructive"
					className="flex-1"
					onClick={() => onDelete(item.id)}
				>
					Delete
				</Button>
			</div>
		</div>
	);
}
