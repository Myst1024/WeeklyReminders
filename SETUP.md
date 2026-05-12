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

The GitHub Actions workflow will automatically build and push Docker images to `ghcr.io/yourusername/repositoryname` (all lowercase). The Helm chart in this repository tells TrueNAS how to deploy that Docker image.

**Note:** GitHub repository names like `Myst1024/WeeklyReminders` are converted to lowercase without special characters: `myst1024/weeklyreminders`

**After your first push:**
1. Go to your GitHub profile → **Packages**
2. Find the `weeklyreminders` (or your repository name) package
3. Click **Package settings** → **Change visibility** → **Public**
4. This allows TrueNAS to pull the image without authentication

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

## Deploying on TrueNAS

### Repository Structure

Your repository contains everything needed for deployment:
- **Dockerfile** - Builds the application container image
- **.github/workflows/docker.yml** - Automatically builds and pushes to ghcr.io on every push
- **helm-chart/** - Kubernetes Helm chart that tells TrueNAS how to deploy the image

### Using TrueNAS App Store

TrueNAS SCALE has a built-in **Kubernetes** container runtime. Choose the method that works best for you:

#### Option A: Deploy via Custom App (TrueNAS UI)

1. In TrueNAS UI, go to **Apps** → **Discover** → **Custom App**

2. **Application Configuration:**
   - **Application Name**: `weekly-reminders`

3. **Image and Policy:**
   - **Image Repository**: `ghcr.io/myst1024/weeklyreminders`
   - **Image Tag**: `main`
   - **Image Pull Policy**: Select `IfNotPresent`

4. **Container Environment Variables:**
   - Scroll down and click **Add** for each variable:
     - `HA_URL` = `http://home-assistant:8123` (or your Home Assistant URL)
     - `WEBHOOK_ID` = `your_webhook_id_here` (from Home Assistant)

5. **Networking (Host Network - Recommended):**
   - Find **Networking** section
   - Enable **Host Network** checkbox
   - This allows the container to use the host's network directly
   - App will be accessible at port 32123 on your TrueNAS IP
   - **Benefit:** Easier to reach Home Assistant if it's on the same network
   
   **Alternative - Port Forwarding (if Host Network unavailable):**
   - If Host Network option isn't available:
     - Find **Port Forwarding** section
     - Set **Port Bind Mode**: "Publish port on the host for external access"
     - **Container Port**: `32123`
     - **Node Port**: `32123`
     - **Protocol**: TCP

6. **Storage (REQUIRED):**
   - Find **Host Path Volumes** or **Storage** section
   - Click **Add** to create a new volume:
     - **Host Path**: `/mnt/your-pool/apps/weekly-reminders` (choose a path on your TrueNAS pool)
     - **Mount Path**: `/app/data`
     - **Read Only**: Uncheck (must be read-write)
   - This persists your `schedule.json` data across container restarts

7. Click **Install** and wait for deployment

**Access the UI:** 
- With Host Network: `http://truenas-ip:32123`
- With Port Forwarding: `http://truenas-ip:32123`

#### Option B: Deploy via Helm CLI (Simpler)

SSH into TrueNAS and run:

```bash
# Clone your repository
git clone https://github.com/Myst1024/WeeklyReminders.git
cd WeeklyReminders

# Install with Helm (includes persistent storage automatically)
helm install weekly-reminders ./helm-chart \
  --set env.HA_URL=http://home-assistant:8123 \
  --set env.WEBHOOK_ID="your_webhook_id_here" \
  --namespace ix-weekly-reminders --create-namespace

# Check deployment status
kubectl get pods -n ix-weekly-reminders
kubectl logs -n ix-weekly-reminders -l app.kubernetes.io/name=weekly-reminders -f
```

The Helm chart automatically configures:
- Persistent storage for your schedule data
- NodePort service on port 32123
- All required environment variables

**Access the UI:** `http://truenas-ip:32123`

#### How Updates Work:

**GitHub Actions automatically builds and pushes** new Docker images when you push to the `main` branch.

**To update your TrueNAS deployment:**

**Option A (Custom App):**
1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Click **Edit**
3. Scroll down and click **Update Image** or change the tag
4. Click **Save** to restart with the new version

**Option B (Helm):**
```bash
cd WeeklyReminders
git pull  # Get latest chart changes
helm upgrade weekly-reminders ./helm-chart \
  --set env.HA_URL=http://home-assistant:8123 \
  --set env.WEBHOOK_ID="your_webhook_id_here" \
  --namespace ix-weekly-reminders
```

Your schedule data persists across updates since it's stored on the host filesystem.

#### Changing Settings After Deployment:

**Custom App:** Go to **Apps** → **Installed** → **weekly-reminders** → **Edit** → Modify environment variables → **Save**

**Helm:** Run `helm upgrade` with new values:
```bash
helm upgrade weekly-reminders ./helm-chart \
  --set env.HA_URL=http://new-url:8123 \
  --set env.WEBHOOK_ID="new_webhook_id" \
  --namespace ix-weekly-reminders
```

## Monitoring

### View Logs

**In TrueNAS UI:**

1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Click the **Shell** icon or **Logs** button to view real-time application logs
3. View pod logs and container events

**Via CLI:**

```bash
# SSH into TrueNAS
ssh admin@truenas-ip

# For Custom App deployments (usually in 'ix-' namespace)
kubectl logs -l app=weekly-reminders -n ix-weekly-reminders -f

# For Helm deployments
kubectl logs -l app.kubernetes.io/name=weekly-reminders -n ix-weekly-reminders -f

# List all pods to find the exact name
kubectl get pods -A | grep weekly

# View specific pod logs
kubectl logs <pod-name> -n <namespace> -f
```

### Check Status

In TrueNAS UI:

1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Check the **Status** indicator (should show "Active")
3. View resource usage (CPU, Memory)
4. Check any alerts or warnings

## Troubleshooting

### "Failed to deploy app - manifest unknown"

**Error:** `Error manifest unknown` or `manifest for ghcr.io/myst1024/weeklyreminders:main not found`

**Cause:** The Docker image doesn't exist yet because GitHub Actions hasn't built it.

**Fix:**
1. Go to your GitHub repository → **Actions** tab
2. Verify "Build and Push Docker Image" workflow ran successfully (green checkmark ✅)
3. If no workflow ran, push a commit to trigger it:
   ```bash
   git add .
   git commit -m "Trigger build"
   git push
   ```
4. Wait 2-5 minutes for the build to complete
5. Verify the image exists: GitHub profile → **Packages** → `weeklyreminders`
6. Retry the TrueNAS deployment

### "Webhook not triggering"

1. Check the logs for webhook activity:
   ```bash
   # Find your pod
   kubectl get pods -A | grep weekly
   
   # View logs
   kubectl logs <pod-name> -n <namespace> | grep webhook
   ```

2. Check the webhook automation is enabled in Home Assistant:
   - Go to **Settings** → **Automations & Scenes**
   - Find your webhook automation
   - Ensure it's enabled (toggle at the top right)

3. Verify Home Assistant is accessible from the pod:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- curl http://home-assistant:8123/api/
   ```

4. Check environment variables are set correctly:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Environment:"
   ```

### "Cannot reach Home Assistant"

- Verify Home Assistant URL is accessible from TrueNAS (check network connectivity)
- Check firewall rules between TrueNAS and Home Assistant
- Verify Home Assistant service is running and accessible at the configured HA_URL
- Verify the HA_URL environment variable is set correctly in the TrueNAS App settings
- Check the Kubernetes pod logs for connection errors

## Actionable Notifications (Optional)

Enable interactive notifications that let you mark tasks complete by tapping them on your phone.

### How It Works

1. Task triggers (manually or scheduled) → sends webhook to Home Assistant → resets task to "incomplete"
2. Home Assistant sends actionable notification to your phone (with "Mark Complete" button)
3. You tap the button → Home Assistant calls back to WeeklyReminders server → task shows green checkmark

### Configuration

**1. Add SERVER_URL environment variable:**

When deploying (Custom App or Helm), add an additional environment variable:
- `SERVER_URL` = URL that Home Assistant can use to reach this server
  - Docker/K8s: `http://weekly-reminders:32123`
  - Local dev: `http://localhost:32123`
  - By IP: `http://192.168.1.100:32123`

**2. Configure Home Assistant automations:**

Copy the automations from `home-assistant-config.yaml` into your Home Assistant configuration:
- Replace `YOUR_WEBHOOK_ID_HERE` with your actual webhook ID
- Replace `YOUR_DEVICE` with your mobile device name (e.g., `mobile_app_iphone`)

Find your device name: Home Assistant → Developer Tools → Services → search "notify.mobile_app"

**3. Task Completion in UI:**

Each task card has a checkmark button in the top-right:
- **Green** = completed
- **Gray** = incomplete
- Click to toggle, or tap the phone notification to mark complete
- Triggering a task resets it to incomplete

## Next Steps

1. Test locally: `bun src/index.ts`
2. Push to GitHub (GitHub Actions will automatically build and push the Docker image)
3. **Wait for GitHub Actions to complete** - Go to **Actions** tab and verify build succeeded (green ✅)
4. Make sure the ghcr.io package is public (see section 2)
5. **Verify image exists:** GitHub profile → **Packages** → confirm `weeklyreminders` package exists with `main` tag
6. Deploy to TrueNAS using **Option A** (Custom App) or **Option B** (Helm - recommended)
7. Configure environment variables: `HA_URL`, `WEBHOOK_ID`, and optionally `SERVER_URL`
8. **Set up persistent storage** (host path to `/app/data`)
9. Configure your Home Assistant webhook automation (see section 3)
10. (Optional) Configure actionable notifications for interactive task completion
11. Access the UI at `http://truenas-ip:32123`
12. Create tasks and test the webhook triggers!
