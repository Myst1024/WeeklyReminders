import fs from "node:fs";
import path from "node:path";
import express from "express";
import type { ScheduleData, ScheduleItem, WebhookResult } from "./types";

const app = express();
const PORT = process.env.PORT || 32123;
const HOME_ASSISTANT_URL =
	process.env.HA_URL || "http://homeassistant.local:31013";
const WEBHOOK_ID = process.env.WEBHOOK_ID || "";
// URL that Home Assistant can use to reach this server
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Data storage - use /app/data for persistence
const dataDir = process.env.DATA_DIR || "/app/data";
const dbPath = path.join(dataDir, "schedule.json");

// Initialize data file
function initializeData(): void {
	// Ensure data directory exists
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	if (!fs.existsSync(dbPath)) {
		const data: ScheduleData = { items: [], nextId: 1 };
		fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
	}
}

// Load data from file
function loadData(): ScheduleData {
	try {
		const raw = fs.readFileSync(dbPath, "utf-8");
		const data = JSON.parse(raw);
		// Ensure backward compatibility: add completed field if missing
		for (const item of data.items) {
			if (item.completed === undefined) {
				item.completed = false;
			}
		}
		return data;
	} catch {
		return { items: [], nextId: 1 };
	}
}

// Save data to file
function saveData(data: ScheduleData): void {
	fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "dist/client")));

// API Routes

// Get all schedule items
app.get("/api/items", (_req, res) => {
	try {
		const data = loadData();
		res.json(data.items);
	} catch (error) {
		console.error("Error fetching items:", error);
		res.status(500).json({ error: "Failed to fetch items" });
	}
});

// Get items for a specific day
app.get("/api/items/day/:day", (req, res) => {
	try {
		const day = Number.parseInt(req.params.day);
		if (day < 0 || day > 6) {
			return res.status(400).json({ error: "Invalid day (0-6)" });
		}
		const data = loadData();
		const items = data.items.filter((item) => item.day_of_week === day);
		res.json(items);
	} catch (error) {
		console.error("Error fetching day items:", error);
		res.status(500).json({ error: "Failed to fetch items" });
	}
});

// Create a new schedule item
app.post("/api/items", (req, res) => {
	try {
		const { day_of_week, title, description, time, enabled } = req.body;

		if (!title || day_of_week === undefined) {
			return res
				.status(400)
				.json({ error: "title and day_of_week are required" });
		}

		if (day_of_week < 0 || day_of_week > 6) {
			return res.status(400).json({ error: "Invalid day (0-6)" });
		}

		const data = loadData();
		const now = new Date().toISOString();

		const newItem: ScheduleItem = {
			id: data.nextId,
			day_of_week,
			title,
			description: description || "",
			time: time || "08:00",
			enabled: enabled !== false,
			completed: false,
			created_at: now,
			updated_at: now,
		};

		data.items.push(newItem);
		data.nextId++;
		saveData(data);

		res.status(201).json(newItem);
	} catch (error) {
		console.error("Error creating item:", error);
		res.status(500).json({ error: "Failed to create item" });
	}
});

// Update a schedule item
app.put("/api/items/:id", (req, res) => {
	try {
		const id = Number.parseInt(req.params.id);
		const { day_of_week, title, description, time, enabled, completed } =
			req.body;

		const data = loadData();
		const itemIndex = data.items.findIndex((i) => i.id === id);

		if (itemIndex === -1) {
			return res.status(404).json({ error: "Item not found" });
		}

		const existing = data.items[itemIndex];

		// Update fields
		if (day_of_week !== undefined) existing.day_of_week = day_of_week;
		if (title !== undefined) existing.title = title;
		if (description !== undefined) existing.description = description;
		if (time !== undefined) existing.time = time;
		if (enabled !== undefined) existing.enabled = enabled;
		if (completed !== undefined) existing.completed = completed;
		existing.updated_at = new Date().toISOString();

		saveData(data);
		res.json(existing);
	} catch (error) {
		console.error("Error updating item:", error);
		res.status(500).json({ error: "Failed to update item" });
	}
});

// Delete a schedule item
app.delete("/api/items/:id", (req, res) => {
	try {
		const id = Number.parseInt(req.params.id);
		const data = loadData();
		const initialLength = data.items.length;

		data.items = data.items.filter((item) => item.id !== id);

		if (data.items.length === initialLength) {
			return res.status(404).json({ error: "Item not found" });
		}

		saveData(data);
		res.json({ success: true });
	} catch (error) {
		console.error("Error deleting item:", error);
		res.status(500).json({ error: "Failed to delete item" });
	}
});

// Trigger webhook endpoint (for testing)
app.post("/api/trigger/:id", async (req, res) => {
	try {
		const id = Number.parseInt(req.params.id);
		const data = loadData();
		const item = data.items.find((i) => i.id === id);

		if (!item) {
			return res.status(404).json({ error: "Item not found" });
		}

		// Reset completed state when triggering
		item.completed = false;
		item.updated_at = new Date().toISOString();
		saveData(data);

		const result = await triggerWebhook(item);
		res.json(result);
	} catch (error) {
		console.error("Error triggering webhook:", error);
		res.status(500).json({ error: "Failed to trigger webhook" });
	}
});

// Toggle completion state endpoint
app.post("/api/items/:id/toggle-complete", async (req, res) => {
	try {
		const id = Number.parseInt(req.params.id);
		const data = loadData();
		const item = data.items.find((i) => i.id === id);

		if (!item) {
			return res.status(404).json({ error: "Item not found" });
		}

		// Toggle completed state
		item.completed = !item.completed;
		item.updated_at = new Date().toISOString();
		saveData(data);

		console.log(
			`[${new Date().toISOString()}] Task ${id} completion toggled to ${item.completed}: ${item.title}`,
		);
		res.json(item);
	} catch (error) {
		console.error("Error toggling completion:", error);
		res.status(500).json({ error: "Failed to toggle completion" });
	}
});

// Callback endpoint for Home Assistant to mark task as complete
app.post("/api/callback/complete/:id", async (req, res) => {
	try {
		const id = Number.parseInt(req.params.id);
		console.log(
			`[${new Date().toISOString()}] Received completion callback for task ${id}`,
		);

		const data = loadData();
		const item = data.items.find((i) => i.id === id);

		if (!item) {
			console.error(`Task ${id} not found`);
			return res.status(404).json({ error: "Task not found" });
		}

		// Mark the task as complete
		item.completed = true;
		item.updated_at = new Date().toISOString();
		saveData(data);

		console.log(
			`[${new Date().toISOString()}] Task ${id} marked as complete: ${item.title}`,
		);
		res.json({ success: true, message: "Task marked as complete" });
	} catch (error) {
		console.error("Error handling completion callback:", error);
		res.status(500).json({ error: "Failed to mark task as complete" });
	}
});

// Webhook trigger function
async function triggerWebhook(item: ScheduleItem): Promise<WebhookResult> {
	if (!WEBHOOK_ID) {
		return {
			success: false,
			message: "WEBHOOK_ID not configured",
		};
	}

	try {
		const url = `${HOME_ASSISTANT_URL}/api/webhook/${WEBHOOK_ID}`;

		console.log(
			`[${new Date().toISOString()}] Triggering webhook for: ${item.title}`,
		);
		console.log(`[${new Date().toISOString()}] Target URL: ${url}`);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					trigger: "scheduler",
					item_id: item.id,
					title: item.title,
					description: item.description,
					day_of_week: item.day_of_week,
					time: item.time,
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					`Failed to trigger webhook. Status: ${response.status}, Response: ${errorText}`,
				);
				return {
					success: false,
					message: `HTTP ${response.status}: ${errorText}`,
				};
			}

			console.log(
				`[${new Date().toISOString()}] Successfully triggered: ${item.title}`,
			);
			return {
				success: true,
				message: "Webhook triggered successfully",
			};
		} catch (fetchError) {
			clearTimeout(timeoutId);
			throw fetchError;
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Error triggering webhook: ${errorMessage}`);
		console.error("Full error:", error);

		// Provide more helpful error messages
		let userMessage = errorMessage;
		if (
			errorMessage.includes("fetch failed") ||
			errorMessage.includes("ENOTFOUND")
		) {
			userMessage = `Cannot connect to ${HOME_ASSISTANT_URL}. Check that the hostname resolves and Home Assistant is running.`;
		} else if (errorMessage.includes("ECONNREFUSED")) {
			userMessage = `Connection refused to ${HOME_ASSISTANT_URL}. Check that Home Assistant is running on the correct port.`;
		} else if (errorMessage.includes("abort")) {
			userMessage = `Connection timeout to ${HOME_ASSISTANT_URL}. Home Assistant may be unreachable.`;
		}

		return {
			success: false,
			message: userMessage,
		};
	}
}

// Scheduler - checks every minute for tasks to run
const lastChecked: { [key: number]: string } = {};

function startScheduler(): void {
	console.log(`[${new Date().toISOString()}] Starting scheduler`);

	// Check every minute
	setInterval(() => {
		checkAndTriggerTasks();
	}, 60000); // 60 seconds

	// Also check immediately on startup
	checkAndTriggerTasks();
}

function checkAndTriggerTasks(): void {
	try {
		const now = new Date();
		const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
		const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

		const data = loadData();
		const items = data.items.filter(
			(item) => item.day_of_week === currentDay && item.enabled,
		);

		for (const item of items) {
			const itemKey = `item_${item.id}_${item.time}`;

			// Only trigger once per scheduled time
			if (lastChecked[item.id] !== itemKey && item.time === currentTime) {
				lastChecked[item.id] = itemKey;
				// Reset completed state before triggering
				item.completed = false;
				item.updated_at = new Date().toISOString();
				saveData(data);
				triggerWebhook(item).catch((error) => {
					console.error(`Failed to trigger item ${item.id}:`, error);
				});
			}
		}
	} catch (error) {
		console.error("Error in scheduler:", error);
	}
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
	res.json({
		status: "ok",
		database: "connected",
		webhook_id_configured: !!WEBHOOK_ID,
	});
});

// 404 handler - serve index.html for SPA
app.use((_req, res) => {
	res.sendFile(path.join(process.cwd(), "dist/client", "index.html"));
});

// Initialize and start
initializeData();

const server = app.listen(PORT, () => {
	console.log(
		`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`,
	);
	console.log(`Home Assistant URL: ${HOME_ASSISTANT_URL}`);
	console.log(`Server callback URL: ${SERVER_URL}`);
	console.log(`Webhook ID: ${WEBHOOK_ID || "(not configured)"}`);
	startScheduler();
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully...");
	server.close(() => {
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	console.log("SIGINT received, shutting down gracefully...");
	server.close(() => {
		process.exit(0);
	});
});
