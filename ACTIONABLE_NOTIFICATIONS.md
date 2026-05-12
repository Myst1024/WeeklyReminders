# Setting Up Actionable Notifications

This guide explains how to set up interactive notifications that mark tasks as complete when you tap them or dismiss them.

## How It Works

1. **WeeklyReminders** sends a webhook to Home Assistant with task details and a callback URL (and resets the task's "completed" state to false)
2. **Home Assistant** receives the webhook and sends an actionable notification to your phone
3. **Your phone** shows the notification with action buttons (e.g., "Mark Complete", "Dismiss")
4. When you tap an action, **Home Assistant** calls back to the WeeklyReminders server
5. **WeeklyReminders** marks the task as complete (a bright green checkmark appears on the card in the UI)

## Setup Steps

### 0. Configure Server URL

The server needs to know what URL Home Assistant should use to call it back. Set the `SERVER_URL` environment variable:

**Docker Compose / Kubernetes:**
```bash
SERVER_URL=http://weekly-reminders:32123
```

**Development (local):**
```bash
SERVER_URL=http://localhost:32123
# Or if Home Assistant is on a different machine:
SERVER_URL=http://192.168.1.100:32123
```

**Add to your docker-compose.yml or deployment:**
```yaml
environment:
  - SERVER_URL=http://weekly-reminders:32123
  - HA_URL=http://home-assistant:31013
  - WEBHOOK_ID=your_webhook_id
```

The default is `http://localhost:32123`, but Home Assistant probably can't reach that unless it's running on the same machine.

### 1. Update Your Server (Already Done ✓)

The server now includes:
- A new callback endpoint: `POST /api/callback/complete/:id`
- A new toggle completion endpoint: `POST /api/items/:id/toggle-complete`
- Enhanced webhook payload with `callback_url` (uses `SERVER_URL` env var)
- Configurable server URL via `SERVER_URL` environment variable
- New `completed` boolean field on each task (separate from enabled/disabled)
- Automatic reset of `completed` state to `false` when a task is triggered (either manually or by scheduler)

### 2. Configure Home Assistant

Copy the automation from `home-assistant-config.yaml` to your Home Assistant configuration.

**Important customizations:**

1. Replace `YOUR_WEBHOOK_ID_HERE` with your actual webhook ID
2. Replace `YOUR_DEVICE` with your mobile device name (check in Home Assistant > Settings > Devices & Services > Mobile App)
   - Example: `mobile_app_iphone` or `mobile_app_pixel_6`

To find your device name:
- Go to Developer Tools > Services in Home Assistant
- Search for "notify.mobile_app"
- Your device name will be listed (e.g., `notify.mobile_app_iphone_john`)

### 3. Test the Integration

#### Option A: Manual Test
1. In Home Assistant, go to Developer Tools > Services
2. Call the webhook manually:
   ```yaml
   service: webhook
   data:
     webhook_id: YOUR_WEBHOOK_ID_HERE
     data:
       trigger: scheduler
       item_id: 1
       title: Test Reminder
       description: This is a test
       callback_url: http://weekly-reminders:32123/api/callback/complete/1
   ```

#### Option B: Use the Trigger Button
1. Open your WeeklyReminders app
2. Click the "Trigger" button on any task
3. You should receive a notification with action buttons

### 4. Interact with the Notification

When you receive a notification:
- **Tap "Mark Complete"**: Disables the task in WeeklyReminders
- **Tap "Dismiss"**: Also disables the task
- **Swipe away**: No action (notification just dismisses)

### 5. Verify It Worked

After tapping an action:
1. Check your WeeklyReminders app - the task should now show a bright green checkmark
2. Check Home Assistant logs for the callback response
3. Check WeeklyReminders server logs for the completion message

### 6. Task Completion in the UI

Each task card now has a circular checkmark button in the top-right corner:
- **Green checkmark**: Task is completed
- **Gray checkmark**: Task is sets `completed: true` on the task object. The task remains enabled and will continue to trigger at its scheduled time. You can modify this in [src/index.ts](src/index.ts):

```typescript
// In the callback endpoint, you could also:
// 1. Disable the task
item.enabled = false;

// 2. Delete the task
data.items = data.items.filter((i) => i.id !== id);

// 3. Move to a different day
// Instead of disabling, you could:
// 1. Delete the task
data.items = data.items.filter((i) => i.id !== id);

// 2. Add a completion timestamp
item.completed_at = new Date().toISOString();

// 3. Move to a different list
item.day_of_week = -1; // Mark as archived

// 4. Increment a completion counter
item.completed_count = (item.completed_count || 0) + 1;
```

### Add More Actions

You can add additional actions to the notification:

```yaml
actions:
  - action: "COMPLETE_TASK_{{ trigger.json.item_id }}"
    title: "Mark Complete"
  - action: "SNOOZE_TASK_{{ trigger.json.item_id }}"
    title: "Snooze 1hr"
  - action: "SKIP_TASK_{{ trigger.json.item_id }}"
    title: "Skip This Week"
```

Then add corresponding automations in Home Assistant to handle those actions.

### Platform-Specific Features

#### iOS
- Add icons using SF Symbols: `icon: "sfsymbols:checkmark.circle"`
- Set interruption level: `interruption-level: time-sensitive`
- Add sound: `sound: default`

#### Android
- Set notification channel: `channel: reminders`
- Set importance: `importance: high`
- Add vibration: `vibrationPattern: "100, 200, 100"`
- Add LED color: `ledColor: "green"`

## Troubleshooting

### Notification appears but buttons don't work
- Check that the automation IDs are unique
- Verify the event type is `mobile_app_notification_action`
- Check Home Assistant logs for errors

### Callback fails
- Ensure Wat `SERVER_URL` environment variable is set correctly
- Verify the hostname resolves from Home Assistant's perspective
  - Test: `docker exec -it home-assistant ping weekly-reminders` (or your hostname)
- Verify port `32123` is accessible
- Check WeeklyReminders server logs for incoming request
- Check WeeklyReminders server logs

### Task doesn't get marked complete
- Open browser developer tools and check the Network tab
- Verify the callback endpoint is being called
- Check WeeklyReminders server logs for the completion message
- Ensure the task ID matches
The callback URL is now automatically set via the `SERVER_URL` environment variable:

**For Docker/Kubernetes networks:**
```bash
export SERVER_URL=http://weekly-reminders:32123
```

**For local development:**
```bash
export SERVER_URL=http://localhost:32123
```

**For specific IP address:**
```bash
export SERVER_URL=http://192.168.1.100:32123
```

**Using a domain name:**
```bash
export SERVER_URL=https://reminders.yourdomain.com
```typescript
callback_url: `http://YOUR_HOST_OR_IP:${PORT}/api/callback/complete/${item.id}`,
```

## Security Considerations

Currently, the callback endpoint is unprotected. For production use, consider:

1. **Add authentication**: Require a token in the callback request
2. **IP whitelist**: Only accept callbacks from Home Assistant
3. **Use HTTPS**: If exposing to the internet
4. **Add request validation**: Verify the request came from Home Assistant

Example with token authentication:

```typescript
const CALLBACK_TOKEN = process.env.CALLBACK_TOKEN || "change-me";

app.post("/api/callback/complete/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CALLBACK_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // ... rest of the code
});
```

Then in Home Assistant:

```yaml
rest_command:
  weekly_reminders_mark_complete:
    url: "http://weekly-reminders:32123/api/callback/complete/{{ item_id }}"
    method: POST
    headers:
      Authorization: "Bearer YOUR_TOKEN_HERE"
```
