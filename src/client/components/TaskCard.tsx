import { cn } from "@/lib/utils";
import React from "react";

import type { ScheduleItem } from "@/api";

import { Button } from "./ui/button";

interface TaskCardProps {
	item: ScheduleItem;
	onEdit: (item: ScheduleItem) => void;
	onDelete: (id: number) => void;
	onTrigger: (id: number) => void;
}

export function TaskCard({ item, onEdit, onDelete, onTrigger }: TaskCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm",
				!item.enabled && "opacity-60",
			)}
		>
			<div className="mb-2 flex items-start justify-between">
				<div>
					<div className="text-sm font-medium text-primary">{item.time}</div>
					<div className="text-sm font-semibold text-foreground">
						{item.title}
					</div>
					{item.description && (
						<div className="mt-1 text-xs text-muted-foreground leading-relaxed">
							{item.description}
						</div>
					)}
				</div>
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
					variant="outline"
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
