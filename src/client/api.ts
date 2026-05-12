import type { HealthStatus, ScheduleItem, WebhookResult } from "../types";

export type { HealthStatus, ScheduleItem };

export async function fetchItems(): Promise<ScheduleItem[]> {
	const response = await fetch("/api/items");
	if (!response.ok) throw new Error("Failed to fetch items");
	return response.json();
}

export async function fetchItemsByDay(day: number): Promise<ScheduleItem[]> {
	const response = await fetch(`/api/items/day/${day}`);
	if (!response.ok) throw new Error("Failed to fetch items");
	return response.json();
}

export async function createItem(
	item: Omit<ScheduleItem, "id" | "created_at" | "updated_at">,
): Promise<ScheduleItem> {
	const response = await fetch("/api/items", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(item),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create item");
	}
	return response.json();
}

export async function updateItem(
	id: number,
	item: Partial<Omit<ScheduleItem, "id" | "created_at" | "updated_at">>,
): Promise<ScheduleItem> {
	const response = await fetch(`/api/items/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(item),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update item");
	}
	return response.json();
}

export async function deleteItem(id: number): Promise<void> {
	const response = await fetch(`/api/items/${id}`, {
		method: "DELETE",
	});
	if (!response.ok) throw new Error("Failed to delete item");
}

export async function triggerItem(id: number): Promise<WebhookResult> {
	const response = await fetch(`/api/trigger/${id}`, {
		method: "POST",
	});
	if (!response.ok) throw new Error("Failed to trigger item");
	return response.json();
}

export async function toggleComplete(id: number): Promise<ScheduleItem> {
	const response = await fetch(`/api/items/${id}/toggle-complete`, {
		method: "POST",
	});
	if (!response.ok) throw new Error("Failed to toggle completion");
	return response.json();
}

export async function checkHealth(): Promise<HealthStatus> {
	const response = await fetch("/api/health");
	if (!response.ok) throw new Error("Failed to check health");
	return response.json();
}
