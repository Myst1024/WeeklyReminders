import { useEffect, useState } from "react";

import {
	type HealthStatus,
	type ScheduleItem,
	checkHealth,
	createItem,
	deleteItem,
	fetchItems,
	triggerItem,
	updateItem,
} from "./api";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskModal } from "./components/TaskModal";
import { Button } from "./components/ui/button";

function App() {
	const [items, setItems] = useState<ScheduleItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
	const [defaultDay, setDefaultDay] = useState<number | undefined>();
	const [health, setHealth] = useState<HealthStatus | null>(null);
	const [error, setError] = useState<string>("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		document.documentElement.classList.add("dark");
	}, []);

	useEffect(() => {
		loadData();
		checkHealthStatus();
		const healthInterval = setInterval(checkHealthStatus, 10000);
		return () => clearInterval(healthInterval);
	}, []);

	const loadData = async () => {
		try {
			setLoading(true);
			const data = await fetchItems();
			setItems(data);
			setError("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load tasks");
		} finally {
			setLoading(false);
		}
	};

	const checkHealthStatus = async () => {
		try {
			const status = await checkHealth();
			setHealth(status);
		} catch (err) {
			setHealth(null);
		}
	};

	const handleAddTask = (day: number) => {
		setEditingItem(null);
		setDefaultDay(day);
		setModalOpen(true);
	};

	const handleEditTask = (item: ScheduleItem) => {
		setEditingItem(item);
		setDefaultDay(undefined);
		setModalOpen(true);
	};

	const handleDeleteTask = async (id: number) => {
		if (!confirm("Are you sure you want to delete this task?")) return;

		try {
			await deleteItem(id);
			await loadData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete task");
		}
	};

	const handleTriggerTask = async (id: number) => {
		try {
			const result = await triggerItem(id);
			if (result.success) {
				alert("Task triggered successfully!");
			} else {
				alert(`Failed to trigger: ${result.message}`);
			}
		} catch (err) {
			alert(
				`Error triggering task: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	};

	const handleSaveTask = async (
		item: Omit<ScheduleItem, "id" | "created_at" | "updated_at">,
	) => {
		setIsSaving(true);
		try {
			if (editingItem) {
				await updateItem(editingItem.id, item);
			} else {
				await createItem(item);
			}
			await loadData();
		} finally {
			setIsSaving(false);
		}
	};

	const statusColor = health?.webhook_id_configured
		? "text-primary"
		: "text-destructive";
	const statusText = health?.webhook_id_configured
		? "✓ Connected to Home Assistant"
		: "⚠ Home Assistant webhook not configured";

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="mx-auto max-w-7xl">
				{/* Header */}
				<div className="mb-8 rounded-lg bg-card border border-border p-6 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-foreground">
								📅 Home Assistant Scheduler
							</h1>
							<p className={`mt-2 text-sm ${statusColor}`}>{statusText}</p>
						</div>
						<Button onClick={loadData} disabled={loading}>
							{loading ? "Loading..." : "Refresh"}
						</Button>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mb-6 rounded-lg bg-destructive/10 border border-destructive p-4 text-sm text-destructive">
						{error}
					</div>
				)}

				{/* Loading State */}
				{loading && (
					<div className="flex items-center justify-center rounded-lg bg-card border border-border p-12 shadow-sm">
						<div className="text-center">
							<div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
							<p className="text-muted-foreground">Loading schedule...</p>
						</div>
					</div>
				)}

				{/* Kanban Board */}
				{!loading && (
					<KanbanBoard
						items={items}
						onAddTask={handleAddTask}
						onEditTask={handleEditTask}
						onDeleteTask={handleDeleteTask}
						onTriggerTask={handleTriggerTask}
						isLoading={isSaving}
					/>
				)}

				{/* Task Modal */}
				<TaskModal
					open={modalOpen}
					editingItem={editingItem}
					defaultDay={defaultDay}
					onClose={() => {
						setModalOpen(false);
						setEditingItem(null);
						setDefaultDay(undefined);
					}}
					onSave={handleSaveTask}
					isLoading={isSaving}
				/>
			</div>
		</div>
	);
}

export default App;
