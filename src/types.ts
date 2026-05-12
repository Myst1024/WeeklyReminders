/**
 * Shared types for server and client communication
 */

export interface ScheduleItem {
	id: number;
	day_of_week: number;
	title: string;
	description: string;
	time: string;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface ScheduleData {
	items: ScheduleItem[];
	nextId: number;
}

export interface HealthStatus {
	status: string;
	database: string;
	webhook_id_configured: boolean;
}

export interface WebhookResult {
	success: boolean;
	message: string;
}
