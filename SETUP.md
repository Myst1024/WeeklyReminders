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

### Using TrueNAS App Store (Recommended)

TrueNAS has a built-in **Kubernetes** container runtime with an **Apps** UI that can deploy Helm charts directly from GitHub.

#### Initial Setup on TrueNAS:

1. **Update the Helm chart** with your GitHub username:
   - Edit `helm-chart/values.yaml`
   - Change `repository: ghcr.io/myst1024/weeklyreminders` to match your GitHub username and repository
   - **Important:** Use all lowercase with no hyphens (e.g., `YourName/My-Repo` → `ghcr.io/yourname/myrepo`)
   - Also update `helm-chart/Chart.yaml` with your maintainer info
   - Commit and push these changes

2. In TrueNAS UI, go to **Apps** → **Discover**
3. Click **Custom App Repositories** (or similar option)
4. Add your GitHub repository:
   - **Name**: `weekly-reminders`
   - **Repository URL**: `https://github.com/yourusername/weekly-reminders`
   - **Branch**: `main`

#### Deploying the App:

1. Go to **Apps** → **Discover**
2. Search for `weekly-reminders`
3. Click **Install**
4. Configure the deployment:
   - **Release Name**: `weekly-reminders`
   - **WEBHOOK_ID**: Enter your Home Assistant webhook ID
   - **HA_URL**: `http://home-assistant:8123` (or your Home Assistant URL)
   - **Port**: `6789` (already configured)

5. Click **Install** and wait for deployment

#### How Updates Work:

1. **Push changes** to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update configuration"
   git push
   ```

2. **GitHub Actions will automatically**:
   - Build the Docker image
   - Push to ghcr.io with the `main` tag

3. **In TrueNAS UI**:
   - Navigate to **Apps** → **Installed**
   - Find `weekly-reminders`
   - Click the **Update** button (appears when new version is available)
   - The app will restart with the new code

#### Customizing Deployment:

To modify app settings after deployment:

1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Click **Edit** or **Update**
3. Modify environment variables or settings
4. Click **Update** to apply changes

## Monitoring

### View Logs

In TrueNAS UI:

1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Click **Logs** to view real-time application logs
3. View pod logs and container events

Or via CLI:

```bash
# SSH into TrueNAS
ssh admin@truenas-ip

# View logs
kubectl logs -l app.kubernetes.io/name=weekly-reminders -f

# View pod details
kubectl describe pod -l app.kubernetes.io/name=weekly-reminders

# View all resources
kubectl get all -l app.kubernetes.io/name=weekly-reminders
```

### Check Status

In TrueNAS UI:

1. Go to **Apps** → **Installed** → **weekly-reminders**
2. Check the **Status** indicator (should show "Active")
3. View resource usage (CPU, Memory)
4. Check any alerts or warnings

## Troubleshooting

### "Webhook not triggering"

1. Verify the webhook ID matches your Home Assistant automation:
   ```bash
   kubectl logs -l app.kubernetes.io/name=weekly-reminders | grep webhook
   ```

2. Check the webhook automation is enabled in Home Assistant:
   - Go to **Settings** → **Automations & Scenes**
   - Find your webhook automation
   - Ensure it's enabled (toggle at the top right)

3. Verify Home Assistant is accessible from the pod:
   ```bash
   kubectl exec -it deployment/weekly-reminders-weekly-reminders -- curl http://home-assistant:8123/api/
   ```

4. Check full logs for errors:
   ```bash
   kubectl logs -l app.kubernetes.io/name=weekly-reminders
   ```

### "Cannot reach Home Assistant"

- Verify Home Assistant URL is accessible from TrueNAS (check network connectivity)
- Check firewall rules between TrueNAS and Home Assistant
- Verify Home Assistant service is running and accessible at the configured HA_URL
- Verify the HA_URL environment variable is set correctly in the TrueNAS App settings
- Check the Kubernetes pod logs for connection errors

## Next Steps

1. Test locally: `bun src/index.ts`
2. Push to GitHub (GitHub Actions will automatically build and push the Docker image)
3. Add the repository to TrueNAS Apps (see "Deploying on TrueNAS" section)
4. Install the app via TrueNAS UI and configure the WEBHOOK_ID
5. Configure your Home Assistant webhook automation (see section 3)
6. View logs and status in TrueNAS UI under Apps → Installed
7. Future pushes will be detected by TrueNAS and marked as available for update!
