# Weekly Reminders - Setup Guide

## Initial Setup

### 1. Create Your GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Add your remote (replace USERNAME/REPO)
git remote add origin https://github.com/USERNAME/weekly-reminders.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Container Registry (ghcr.io)

1. Go to your GitHub repository settings
2. Navigate to **Actions** → **General**
3. Under "Workflow permissions", select **Read and write permissions**
4. Make sure "Allow GitHub Actions to create and approve pull requests" is checked
5. Save changes

The GitHub Actions workflow will automatically build and push Docker images to `ghcr.io/yourusername/weekly-reminders`

### 3. Set Up a Webhook in Home Assistant

1. In Home Assistant UI:
   - Go to **Settings** → **Automations & Scenes**
   - Click **"Create Automation"**
   - Switch to **Edit in YAML** mode
   - Create an automation with a webhook trigger:

```yaml
alias: TrueNAS Scheduled Task
trigger:
  - platform: webhook
    webhook_id: your_unique_webhook_id
    allowed_methods:
      - POST
action:
  - service: your_service
    data:
      # Your automation actions here
```

   - Save the automation
   - Copy the `webhook_id` value (you'll use this during deployment)

**Note**: Treat the webhook ID like a password—keep it secret and don't commit it to GitHub!

### 4. Update the Helm Chart

Edit `helm-chart/Chart.yaml` and `helm-chart/values.yaml`:

```yaml
# helm-chart/Chart.yaml
maintainers:
  - name: Your Name
    email: your-email@example.com

home: https://github.com/yourusername/weekly-reminders
sources:
  - https://github.com/yourusername/weekly-reminders
```

Also update `values.yaml` with your repository:

```yaml
image:
  repository: ghcr.io/yourusername/weekly-reminders
  tag: "main"  # or use specific version tags
```

## Deploying on TrueNAS

### Option 1: Using TrueNAS App Store (Recommended)

TrueNAS can discover and deploy Helm charts from GitHub. To do this:

1. **Make your Helm chart available** (via GitHub releases or Helm repository):
   - Create a `gh-pages` branch for Helm chart hosting
   - Push your chart there, or
   - Use GitHub Releases to distribute the chart

2. **Add to TrueNAS**:
   - In TrueNAS UI → **Apps** → **Discover**
   - Search for your chart or add custom Helm repository
   - Install with your configuration

### Option 2: Manual Helm Installation

If you have SSH access to TrueNAS:

```bash
# SSH into TrueNAS
ssh admin@truenas-ip

# Add Helm repository (if using Helm chart repository)
helm repo add my-apps https://yourusername.github.io/weekly-reminders
helm repo update

# Or use the local chart from GitHub:
git clone https://github.com/yourusername/weekly-reminders.git
cd weekly-reminders

# Install
helm install weekly-reminders ./helm-chart \
  --namespace default \
  --set env.HA_URL=http://home-assistant:8123 \
  --set env.WEBHOOK_ID="<your-webhook-id>"

# Verify
kubectl get pods
kubectl logs -f deployment/weekly-reminders-weekly-reminders
```

### Option 3: Using Docker Directly (No Kubernetes)

If TrueNAS doesn't have Kubernetes available, you can use Docker:

```bash
docker run -d \
  --name ha-scheduler \
  --restart unless-stopped \
  -e HA_URL=http://home-assistant:8123 \
  -e WEBHOOK_ID="<your-webhook-id>" \
  -e SCHEDULE_TIME="0 8 * * *" \
  ghcr.io/yourusername/ha-scheduler:main
```

## Configuration for Your Setup

### Example: Simple Morning Automation

If you want to trigger an automation every morning at 8 AM:

1. In Home Assistant, create an automation with a webhook trigger:
   ```yaml
   alias: Morning Routine
   description: "Runs at 8 AM via webhook"
   trigger:
     - platform: webhook
       webhook_id: morning_routine_webhook
       allowed_methods:
         - POST
   action:
     - service: light.turn_on
       target:
         entity_id: light.bedroom
     - service: climate.set_temperature
       target:
         entity_id: climate.living_room
       data:
         temperature: 22
   ```

2. Deploy with the webhook ID:
   ```bash
   helm install ha-scheduler ./helm-chart \
     --set env.WEBHOOK_ID="morning_routine_webhook"
   ```

### Example: Multiple Times Per Day

To trigger at 8 AM and 6 PM, just change the cron expression:

```bash
helm install ha-scheduler ./helm-chart \
  --set env.WEBHOOK_ID="my_webhook_id" \
  --set env.SCHEDULE_TIME="0 8,18 * * *"
```

## Automatic Updates

Once deployed on TrueNAS:

1. **Push changes** to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update configuration"
   git push
   ```

2. **GitHub Actions will automatically**:
   - Build the Docker image
   - Push to ghcr.io
   - Apply appropriate version tags

3. **In TrueNAS UI**:
   - Navigate to **Apps**
   - Find your app
   - Click **Update** (when a new version is available)
   - The app will restart with the new code

## Monitoring

### View Logs

```bash
# Real-time logs
kubectl logs -f deployment/ha-scheduler-ha-scheduler

# Last 100 lines
kubectl logs deployment/ha-scheduler-ha-scheduler --tail=100

# Last hour of logs
kubectl logs deployment/ha-scheduler-ha-scheduler --since=1h
```

### Check Status

```bash
# Pod status
kubectl get pods -l app.kubernetes.io/name=ha-scheduler

# Describe deployment
kubectl describe deployment ha-scheduler-ha-scheduler
```

## Troubleshooting

### "Webhook not triggering"

1. Verify the webhook ID is correct in both the Home Assistant automation and the app configuration:
   ```bash
   kubectl logs deployment/ha-scheduler-ha-scheduler | grep "Triggering"
   ```

2. Check the webhook automation is enabled in Home Assistant:
   - Go to **Settings** → **Automations & Scenes**
   - Find your webhook automation
   - Ensure it's enabled (toggle at the top right)

3. Verify Home Assistant is accessible from the pod:
   ```bash
   kubectl exec -it deployment/ha-scheduler-ha-scheduler -- curl http://home-assistant:8123/api/
   ```

4. Check logs for errors:
   ```bash
   kubectl logs deployment/ha-scheduler-ha-scheduler
   ```

### "Cannot reach Home Assistant"

- Verify Home Assistant URL is accessible from the pod's network
- Check firewall rules between TrueNAS and Home Assistant
- Verify Home Assistant service is running
- Check that the HA_URL environment variable is set correctly

### "Invalid cron expression"

Check your `SCHEDULE_TIME` variable. Common patterns:
- `0 8 * * *` - 8 AM daily
- `0 */4 * * *` - Every 4 hours
- `*/30 * * * *` - Every 30 minutes
- `0 0 1 * *` - First day of month at midnight

## Next Steps

1. Test locally: `bun src/index.ts`
2. Push to GitHub
3. Deploy to TrueNAS
4. Configure your Home Assistant automation
5. Verify logs in TrueNAS UI

For more information on Cron expressions, see: https://crontab.guru/
