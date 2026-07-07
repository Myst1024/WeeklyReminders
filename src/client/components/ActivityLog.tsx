import { Temporal } from "@js-temporal/polyfill";

import type { ActivityLogEntry } from "@/api";

import { Button } from "./ui/button";

interface ActivityLogProps {
	entries: ActivityLogEntry[];
	isLoading: boolean;
	error: string;
	onRefresh: () => void;
}

function formatTimestamp(timestamp: string): string {
	const instant = Temporal.Instant.from(timestamp);
	return instant.toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

function toLabel(event: ActivityLogEntry["event"]): string {
	switch (event) {
		case "created":
			return "Created";
		case "edited":
			return "Edited";
		case "deleted":
			return "Deleted";
		case "completion_changed":
			return "Completion Changed";
		case "reminder_sent":
			return "Reminder Sent";
		default:
			return event;
	}
}

export function ActivityLog({
	entries,
	isLoading,
	error,
	onRefresh,
}: ActivityLogProps) {
	return (
		<div className="rounded-lg bg-card border border-border p-6 shadow-sm">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-foreground">
						Activity Log
					</h2>
					<p className="text-sm text-muted-foreground">
						History of reminder creation, edits, deletion, and completion state
						changes.
					</p>
				</div>
				<Button variant="secondary" onClick={onRefresh} disabled={isLoading}>
					{isLoading ? "Refreshing..." : "Refresh"}
				</Button>
			</div>

			{error && (
				<div className="mb-4 rounded-md bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			{entries.length === 0 && !isLoading ? (
				<div className="rounded-md border border-border p-6 text-center text-muted-foreground">
					No activity recorded yet.
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm text-foreground">
						<thead>
							<tr className="border-b border-border bg-muted/60 text-muted-foreground">
								<th className="px-3 py-2 pr-3">When</th>
								<th className="px-3 py-2 pr-3">Event</th>
								<th className="px-3 py-2 pr-3">Reminder</th>
								<th className="px-3 py-2 pr-3">Completed</th>
								<th className="px-3 py-2">Notes</th>
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr
									key={entry.id}
									className="border-b border-border/60 odd:bg-card even:bg-muted/20"
								>
									<td className="px-3 py-2 pr-3 whitespace-nowrap text-foreground">
										{formatTimestamp(entry.timestamp)}
									</td>
									<td className="px-3 py-2 pr-3 text-foreground">
										{toLabel(entry.event)}
									</td>
									<td className="px-3 py-2 pr-3 text-foreground">
										{entry.title}
									</td>
									<td className="px-3 py-2 pr-3 text-foreground">
										{entry.completed ? "Yes" : "No"}
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{entry.notes || "-"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
