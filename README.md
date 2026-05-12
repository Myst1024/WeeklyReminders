# Weekly Reminders - Home Assistant Scheduler

A lightweight Bun/TypeScript web application that runs on TrueNAS and provides a kanban-style UI for scheduling Home Assistant automations on a weekly basis.

## Features

- 📋 **Kanban Board UI** - Organize tasks by day of the week (Monday-Sunday)
- ⏰ **Flexible Scheduling** - Set custom times for each task (default 8 AM)
- 💾 **Persistent Storage** - All schedules saved to a simple JSON file
- 🔗 **Home Assistant Integration** - Trigger automations via webhooks
- 🎨 **Beautiful UI** - Clean, responsive web interface with drag-and-drop
- 🐳 **Docker Ready** - Container image for TrueNAS deployment
- ⚡ **Minimal Resources** - Lightweight Bun-based server (~40MB image)
- 🔄 **Background Scheduler** - Automatically runs tasks at specified times

## How It Works

1. **Create Tasks**: Use the web UI to add tasks to any day of the week
2. **Set Times**: Each task has a configurable time (default 8 AM)
3. **Automatic Triggering**: The background scheduler checks every minute and triggers webhooks at the specified time
4. **Manual Testing**: Click "Trigger" on any task to manually test its webhook

## Configuration

The app is configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `HA_URL` | Home Assistant URL | `http://home-assistant:8123` |
| `WEBHOOK_ID` | Home Assistant webhook ID | (optional - required for automation triggering) |
| `PORT` | Server port | `3000` |

### Setting up a Webhook Trigger in Home Assistant

1. In Home Assistant, go to **Settings** → **Automations & Scenes** → **Create Automation**
2. Switch to **Edit in YAML** mode
3. Create a webhook trigger (example):

```yaml
alias: My Scheduled Task
description: "Triggered by scheduler webhook"
trigger:
  - platform: webhook
    webhook_id: your_unique_webhook_id
    allowed_methods:
      - POST
action:
  - service: light.turn_on
    data:
      entity_id: light.bedroom
```

4. Copy the webhook ID from the automation editor
5. Set the `WEBHOOK_ID` environment variable to this value
6. Save the automation

Now the scheduler will automatically trigger this automation at the times you set in the UI.

## Web Interface

### Adding a Task

1. Click on any day column (Monday-Sunday)
2. Fill in the task details:
   - **Title** (required): Name of the task
   - **Description** (optional): Additional details
   - **Time** (default 8:00 AM): When to trigger this task
3. Click **Add Task**

### Managing Tasks

- **Move Tasks**: Drag and drop tasks between days to reschedule
- **Edit Tasks**: Click the ✏️ button to modify a task's details
- **Delete Tasks**: Click the ✕ button to remove a task
- **Manual Trigger**: Click **Trigger** to immediately execute the webhook (useful for testing)

## Tech Stack

- **Runtime**: Bun 1.3.13
- **Backend**: Express.js 4.18.2 (TypeScript)
- **Frontend**: React 18.3.1 with shadcn/ui components
- **Styling**: Tailwind CSS + Radix UI
- **Build Tool**: Vite 5.4.21
- **Data Storage**: JSON file-based (no database)
- **Container**: Docker with `oven/bun` base image (~40MB)

### Prerequisites

1. TrueNAS system with container/Kubernetes support
2. Home Assistant running and accessible from TrueNAS network
3. A webhook configured in Home Assistant (see Configuration section above)

### Using Helm

1. **Add the Helm Repository**:
   ```bash
   helm repo add weekly-reminders https://yourusername.github.io/weekly-reminders
   helm repo update
   ```

2. **Install the Chart**:
   ```bash
   helm install weekly-reminders weekly-reminders/weekly-reminders \
     --set env.HA_URL=http://home-assistant:8123 \
     --set env.WEBHOOK_ID="your-webhook-id"
   ```

3. **Verify Installation**:
   ```bash
   kubectl get pods -l app.kubernetes.io/name=weekly-reminders
   kubectl logs -f deployment/weekly-reminders-weekly-reminders
   ```

### Updating via TrueNAS UI

Once installed, updates can be applied directly through the TrueNAS Apps UI:

1. Navigate to **Apps** in TrueNAS
2. Find **weekly-reminders** in your installed apps
3. Click **Update** to pull the latest version from GitHub
4. The app will restart with the new version

## Local Development

### Prerequisites

- [Bun](https://bun.sh) installed
- Node.js types installed via `bun add -d @types/node`

### Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Create a `.env` file (optional):
   ```
   HA_URL=http://localhost:8123
   WEBHOOK_ID=your_webhook_id
   PORT=3000
   ```

3. Build the React frontend:
   ```bash
   bun run build:client
   ```

4. Start the server:
   ```bash
   bun run start
   ```

5. Open http://localhost:3000 in your browser

### Development Mode

For development with hot-reload:

```bash
bun run dev
```

This runs Vite dev server (with hot reload) and Express server concurrently. Vite will proxy API requests to the Express server.

### Available Scripts

- `bun run dev` - Start development mode (Vite + Express)
- `bun run dev:server` - Start only the Express server
- `bun run dev:client` - Start only the Vite dev server
- `bun run build:client` - Build the React app for production
- `bun run start` - Start the production server (requires built client)
- `bun run check` - Run Biome linting checks on backend
- `bun run format` - Auto-format code with Biome

## Data Format

Tasks are stored in `data/tasks.json`:

```json
[
  {
    "id": 1,
    "day": 0,
    "title": "Morning Coffee",
    "description": "Brew coffee",
    "time": "08:00"
  },
  {
    "id": 2,
    "day": 1,
    "title": "Lights On",
    "description": "",
    "time": "08:00"
  }
]
```

- `day`: 0-6 (Monday-Sunday)
- `time`: HH:MM format (24-hour)
- `id`: Auto-incrementing identifier

## API Endpoints

### Tasks

- `GET /api/items` - Get all tasks
- `GET /api/items/day/:day` - Get tasks for a specific day (0-6)
- `POST /api/items` - Create a new task
  ```json
  {
    "day": 0,
    "title": "Task name",
    "description": "Optional description",
    "time": "08:00"
  }
  ```
- `PUT /api/items/:id` - Update a task
- `DELETE /api/items/:id` - Delete a task
- `POST /api/trigger/:id` - Manually trigger a task's webhook

## Docker

Build the container image:

```bash
bun run build:client
docker build -t weekly-reminders:latest .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e HA_URL=http://home-assistant:8123 \
  -e WEBHOOK_ID=your_webhook_id \
  -v scheduler_data:/app/data \
  weekly-reminders:latest
```

The Docker build includes building the React app during the build stage, so the resulting image contains both the compiled frontend and backend.

## Troubleshooting

### Tasks not triggering at the specified time

1. Check that `HA_URL` is correct and Home Assistant is accessible
2. Verify `WEBHOOK_ID` matches the webhook in your Home Assistant automation
3. Check the server logs for any webhook execution errors
4. Try using the manual "Trigger" button in the UI to test the webhook

### Cannot access the web UI

1. Verify the `PORT` environment variable is correct (default 3000)
2. Check firewall rules allow traffic to the port
3. Ensure the server is running: `docker logs <container_id>`

### Persistent storage not working

1. Ensure the container has write permissions to `/app/data`
2. Check that the `data/` directory exists and is mounted properly
3. Look for errors in the server logs related to file operations

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

- Code passes `bun check`
- Follows the existing code style
- Tests pass (add tests for new features)
