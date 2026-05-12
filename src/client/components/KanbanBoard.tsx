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

// Convert display index (0=Monday) to storage day_of_week (0=Sunday, 1=Monday, etc.)
function displayToStorage(displayIndex: number): number {
	return (displayIndex + 1) % 7;
}

interface KanbanBoardProps {
	items: ScheduleItem[];
	onAddTask: (day: number) => void;
	onEditTask: (item: ScheduleItem) => void;
	onDeleteTask: (id: number) => void;
	onToggleComplete: (id: number) => void;
	isLoading: boolean;
}

export function KanbanBoard({
	items,
	onAddTask,
	onEditTask,
	onDeleteTask,
	onToggleComplete,
	isLoading,
}: KanbanBoardProps) {
	// Get current day of the week (0=Monday in our display system)
	const now = Temporal.Now.plainDateISO();
	const todayDayOfWeek = now.dayOfWeek; // 1=Monday, 7=Sunday in ISO
	const todayDisplayIndex = todayDayOfWeek === 7 ? 6 : todayDayOfWeek - 1; // Convert to 0=Monday, 6=Sunday

	return (
		<div className="overflow-x-auto rounded-lg bg-background py-8 shadow-sm">
			<div className="flex gap-4 min-w-max px-2">
				{DAYS.map((day, displayIndex) => {
					// Convert display index to storage day_of_week for filtering
					const storageDayOfWeek = displayToStorage(displayIndex);
					const isToday = displayIndex === todayDisplayIndex;
					const dayItems = items
						.filter((item) => item.day_of_week === storageDayOfWeek)
						.sort((a, b) => {
							const aTime = Temporal.PlainTime.from(a.time);
							const bTime = Temporal.PlainTime.from(b.time);
							return Temporal.PlainTime.compare(aTime, bTime);
						});

					return (
						<div
							key={day}
							className={cn(
								"flex flex-col flex-shrink-0 w-80 rounded-lg bg-card overflow-hidden border border-border shadow-sm transition-all",
								isToday && "shadow-[0_0_25px_5px_hsl(var(--primary)/0.6)]",
							)}
						>
							<div className="border-b border-border bg-muted px-4 py-3">
								<h3 className="font-semibold text-foreground">
									{day}
								</h3>
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
											onToggleComplete={onToggleComplete}
										/>
									))
								)}
							</div>

							<div className="border-t border-border bg-muted p-3">
								<Button
									className="w-full"
									onClick={() => onAddTask(storageDayOfWeek)}
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
