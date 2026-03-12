# CI/CD Pipeline Setup Guide

This guide will help you configure the CI/CD pipeline for the HungerJet microservices project.

## 📋 Overview

The CI/CD pipeline automatically:

- ✅ Builds and tests all microservices
- ✅ Runs security scans and dependency checks
- ✅ Builds Docker images
- ✅ Pushes images to Docker Hub
- ✅ Prepares for automated deployment

---

## 🎯 Phase 2 Checklist

- [ ] Create Docker Hub account
- [ ] Configure GitHub repository secrets
- [ ] Push code to trigger first pipeline run
- [ ] Verify pipeline execution
- [ ] Check Docker Hub for images

---

## Step 1: Create Docker Hub Account

### 1.1 Sign Up for Docker Hub

1. Go to [Docker Hub](https://hub.docker.com/)
2. Click **Sign Up**
3. Create your account (username will be needed later)
4. Verify your email address

### 1.2 Create Access Token

1. Log in to Docker Hub
2. Click on your username (top right) → **Account Settings**
3. Go to **Security** tab
4. Click **New Access Token**
5. Token description: `GitHub Actions CI/CD`
6. Access permissions: **Read, Write, Delete**
7. Click **Generate**
8. **IMPORTANT**: Copy the token immediately (you won't see it again)

**Save this information:**

```
Docker Hub Username: _________________
Access Token: _______________________
```

---

## Step 2: Configure GitHub Repository Secrets

### 2.1 Navigate to Repository Settings

1. Go to your GitHub repository: https://github.com/nimashag/hungerjet-devops-microservice
2. Click on **Settings** tab (top menu)
3. In the left sidebar, expand **Secrets and variables**
4. Click **Actions**

### 2.2 Add Docker Hub Credentials

Click **New repository secret** and add these two secrets:

#### Secret 1: DOCKER_USERNAME

- **Name**: `DOCKER_USERNAME`
- **Value**: Your Docker Hub username (e.g., `nimashag`)
- Click **Add secret**

#### Secret 2: DOCKER_PASSWORD

- **Name**: `DOCKER_PASSWORD`
- **Value**: The access token you copied from Docker Hub
- Click **Add secret**

### 2.3 Verify Secrets

You should now see two secrets listed:

- ✅ DOCKER_USERNAME
- ✅ DOCKER_PASSWORD

---

## Step 3: Update Docker Compose Configuration (Optional)

If you want to use your Docker Hub images in local development:

### 3.1 Update docker-compose.yml

Edit `docker/docker-compose.yml` and replace `my-app` with your Docker Hub username:

```yaml
services:
  frontend-service:
    image: YOUR_DOCKERHUB_USERNAME/frontend-service:latest
    # ... rest of config

  restaurants-service:
    image: YOUR_DOCKERHUB_USERNAME/restaurants-service:latest
    # ... rest of config

  # ... do this for all services
```

### 3.2 Update services.config.json

Edit `services.config.json` and update Docker image names:

```json
{
  "services": [
    {
      "name": "frontend-service",
      "dockerImage": "YOUR_DOCKERHUB_USERNAME/frontend-service:latest",
      ...
    },
    ...
  ]
}
```

---

## Step 4: Commit and Push Changes

### 4.1 Check Git Status

```bash
git status
```

You should see:

- `.github/workflows/ci-cd.yml` (new)
- Updated route files with health endpoints
- `CI-CD-SETUP.md` (new)

### 4.2 Commit Changes

```bash
git add .
git commit -m "feat: Add CI/CD pipeline with GitHub Actions

- Add GitHub Actions workflow for automated builds
- Add Docker Hub integration
- Add health check endpoints to all services
- Add CI/CD setup documentation"
```

### 4.3 Push to GitHub

```bash
git push origin main
```

**Note**: Replace `main` with `master` if that's your default branch.

---

## Step 5: Verify Pipeline Execution

### 5.1 Watch the Pipeline Run

1. Go to your GitHub repository
2. Click on the **Actions** tab (top menu)
3. You should see your workflow running
4. Click on the workflow run to see details

### 5.2 Expected Workflow Jobs

You should see 4 jobs running:

1. **Build users-service** ✅
2. **Build restaurants-service** ✅
3. **Build orders-service** ✅
4. **Build delivery-service** ✅
5. **Build Frontend** ✅
6. **Docker Build & Push** (only on push to main)
7. **Security Scan**

### 5.3 Check Job Details

Click on each job to see:

- Checkout code
- Install dependencies
- Build TypeScript
- Run tests (if any)
- Docker build and push (for main branch)

---

## Step 6: Verify Docker Hub Images

### 6.1 Check Docker Hub

1. Go to [Docker Hub](https://hub.docker.com/)
2. Log in to your account
3. Click **Repositories** (top menu)
4. You should see 5 new repositories:
   - `YOUR_USERNAME/users-service`
   - `YOUR_USERNAME/restaurants-service`
   - `YOUR_USERNAME/orders-service`
   - `YOUR_USERNAME/delivery-service`
   - `YOUR_USERNAME/frontend-service`

### 6.2 Verify Image Tags

Each repository should have:

- **latest** tag
- **main-{sha}** tag (commit sha)

---

## Step 7: Test Health Endpoints Locally

Before pushing, you can test the health endpoints:

### 7.1 Start Services Locally

```bash
# Using Docker Compose
./runner_docker.sh up

# OR using Kubernetes
./runner_k8s.sh up
```

### 7.2 Test Health Endpoints

```bash
# Users Service
curl http://localhost:31003/api/auth/health

# Restaurants Service
curl http://localhost:31001/api/restaurants/health

# Orders Service
curl http://localhost:31002/api/orders/health

# Delivery Service
curl http://localhost:31004/api/delivery/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "users-service",
  "timestamp": "2026-03-12T10:30:00.000Z"
}
```

---

## 📊 Pipeline Features

### Automatic Triggers

The pipeline runs automatically on:

- ✅ Push to `main` or `master` branch
- ✅ Push to `develop` branch
- ✅ Pull requests to `main` or `master`

### Build Process

For each backend service:

1. ✅ Checkout code from GitHub
2. ✅ Setup Node.js 18
3. ✅ Install dependencies with npm ci
4. ✅ Run linting (if configured)
5. ✅ Run tests (if configured)
6. ✅ Build TypeScript to JavaScript
7. ✅ Upload build artifacts

### Docker Process (only on main/master push)

For each service:

1. ✅ Setup Docker Buildx
2. ✅ Login to Docker Hub
3. ✅ Build Docker image
4. ✅ Tag with `latest` and commit SHA
5. ✅ Push to Docker Hub
6. ✅ Use layer caching for faster builds

### Security Scanning

1. ✅ Run npm audit on all services
2. ✅ Check for dependency vulnerabilities
3. ✅ Prepared for SonarCloud (Phase 3)

---

## 🔧 Troubleshooting

### Issue: Pipeline Fails at Docker Push

**Cause**: Invalid Docker Hub credentials

**Solution**:

1. Verify your Docker Hub username is correct
2. Generate a new access token
3. Update `DOCKER_PASSWORD` secret in GitHub
4. Re-run the workflow

### Issue: Build Fails for a Service

**Cause**: Missing dependencies or TypeScript errors

**Solution**:

1. Check the job logs in GitHub Actions
2. Fix the errors locally
3. Test build locally: `cd SERVICE_NAME && npm run build`
4. Commit and push fixes

### Issue: npm ci Fails

**Cause**: package-lock.json out of sync

**Solution**:

```bash
cd SERVICE_NAME
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: Update package-lock.json"
git push
```

### Issue: Health Endpoint Not Working

**Cause**: Service not importing updated routes

**Solution**:

1. Restart the service
2. Check that routes are properly imported in app.ts/server.ts
3. Verify the endpoint path includes `/api/{service}/health`

---

## 🎯 Next Steps

After completing Phase 2, you can proceed to:

### Phase 3: SAST Integration

- Configure SonarCloud
- Add security scanning
- Fix code quality issues

### Phase 4: Cloud Deployment

- Setup AWS/Azure/GCP account
- Deploy to managed container service
- Configure load balancer
- Setup automated deployment

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Docker Build Action](https://github.com/docker/build-push-action)

---

## ✅ Phase 2 Completion Checklist

Before moving to Phase 3, ensure:

- [ ] ✅ GitHub Actions workflow file created
- [ ] ✅ Docker Hub account created
- [ ] ✅ GitHub secrets configured
- [ ] ✅ Health endpoints added to all services
- [ ] ✅ Code committed and pushed
- [ ] ✅ Pipeline runs successfully
- [ ] ✅ Docker images appear in Docker Hub
- [ ] ✅ All 5 images have `latest` tag
- [ ] ✅ Health endpoints tested and working

---

## 📞 Support

If you encounter issues:

1. Check the GitHub Actions logs
2. Review the troubleshooting section above
3. Verify all secrets are correctly configured
4. Ensure you're on the main/master branch

**Repository**: https://github.com/nimashag/hungerjet-devops-microservice
