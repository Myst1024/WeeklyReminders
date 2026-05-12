import { cn } from "@/lib/utils";
import { Temporal } from "@js-temporal/polyfill";

import type { ScheduleItem } from "@/api";

import { TaskCard } from "./TaskCard";
import { Button } from "./ui/button";

const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

interface KanbanBoardProps {
	items: ScheduleItem[];
	onAddTask: (day: number) => void;
	onEditTask: (item: ScheduleItem) => void;
	onDeleteTask: (id: number) => void;
	onTriggerTask: (id: number) => void;
	isLoading: boolean;
}

export function KanbanBoard({
	items,
	onAddTask,
	onEditTask,
	onDeleteTask,
	onTriggerTask,
	isLoading,
}: KanbanBoardProps) {
	return (
		<div className="w-full max-w-[85vw] overflow-x-auto rounded-lg bg-background p-4 shadow-sm">
			<div className="flex gap-4 min-w-max">
				{DAYS.map((day, dayIndex) => {
					const dayItems = items
						.filter((item) => item.day_of_week === dayIndex)
						.sort((a, b) => {
							const aTime = Temporal.PlainTime.from(a.time);
							const bTime = Temporal.PlainTime.from(b.time);
							return Temporal.PlainTime.compare(aTime, bTime);
						});

					return (
						<div
							key={day}
							className="flex flex-col flex-shrink-0 w-80 rounded-lg bg-card overflow-hidden border border-border shadow-sm"
						>
							<div className="border-b border-border bg-muted px-4 py-3">
								<h3 className="font-semibold text-foreground">{day}</h3>
							</div>

							<div
								className={cn(
									"flex-1 space-y-3 overflow-y-auto p-4 column-texture",
									dayItems.length === 0 &&
										"flex items-center justify-center min-h-[500px]",
								)}
							>
								{dayItems.length === 0 ? (
									<div className="text-center text-sm text-muted-foreground">
										No tasks scheduled
									</div>
								) : (
									dayItems.map((item) => (
										<TaskCard
											key={item.id}
											item={item}
											onEdit={onEditTask}
											onDelete={onDeleteTask}
											onTrigger={onTriggerTask}
										/>
									))
								)}
							</div>

							<div className="border-t border-border bg-muted p-3">
								<Button
									className="w-full"
									onClick={() => onAddTask(dayIndex)}
									disabled={isLoading}
								>
									+ Add Task
								</Button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
