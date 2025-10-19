# Git Repository Configuration Guide

**Date**: October 19, 2025, 12:00 CEST
**Status**: ✅ CONFIGURED AND OPTIMIZED

---

## Problem Solved

Previously, commits were going to the **wrong repository** (`planerix`) instead of the production repository (`planerix4`) that the server uses. This has been fixed by reconfiguring the git remotes.

---

## New Repository Configuration

### Remote Repositories

```bash
origin        git@github.com:aistrategyc/planerix4.git    # ✅ PRODUCTION REPO (default)
planerix_old  git@github.com:aistrategyc/planerix.git     # ⚠️  LEGACY REPO (backup only)
```

**Key Change**: `origin` now points to `planerix4` (production) instead of the old `planerix` repo.

### Branch Tracking

```bash
develop → origin/develop (planerix4)  # ✅ Tracks production develop
main    → origin/main    (planerix4)  # ✅ Tracks production main
```

### Server Configuration

**Production Server** (65.108.220.33:/opt/MONOREPv3):
```bash
origin → git@github.com:aistrategyc/planerix4.git
Branch: develop
```

**Result**: All commits to `origin` now automatically go to the **correct production repository**.

---

## How to Use (Simple Workflow)

### 1. Daily Development

```bash
# Make changes to code
git add .
git commit -m "feat: Your feature description"

# Push to production repo (automatic now)
git push
# This goes to planerix4 automatically! ✅

# Or explicit push to develop
git push origin develop
```

**No more mistakes!** By default, all pushes go to the correct production repository.

### 2. When You Need to Push to Both Repos

If you want to keep the legacy repo synchronized (optional):

```bash
# Push to production (planerix4)
git push origin develop

# Also push to legacy repo
git push planerix_old develop
```

### 3. Pull Latest Changes from Server

```bash
# Pull from production repo
git pull origin develop

# Or just
git pull  # Uses origin/develop by default
```

### 4. Check Which Remote You're Using

```bash
# See all remotes
git remote -v

# See which remote each branch tracks
git branch -vv
```

---

## Complete Git Commands Reference

### Committing Changes

```bash
# 1. Check status
git status

# 2. Stage all changes
git add .

# 3. Commit with meaningful message
git commit -m "feat: Add new feature XYZ"

# 4. Push to production (origin = planerix4)
git push origin develop
```

### Creating a New Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/my-new-feature

# Work on your feature...

# Push to production repo
git push -u origin feature/my-new-feature
```

### Merging to Main

```bash
# Switch to develop
git checkout develop
git pull origin develop

# Merge your feature
git merge feature/my-new-feature

# Push to production
git push origin develop

# Optionally merge to main for release
git checkout main
git merge develop
git push origin main
```

### Syncing with Server

```bash
# Check what's on the server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33 "cd /opt/MONOREPv3 && git log --oneline -5"

# Pull latest from server's repo
git fetch origin
git pull origin develop
```

---

## Git Remote Commands

### View Current Configuration

```bash
# List all remotes
git remote -v

# Show details about origin
git remote show origin

# See branch tracking
git branch -vv
```

### Reconfigure Remotes (if needed)

```bash
# Change origin URL
git remote set-url origin git@github.com:aistrategyc/planerix4.git

# Add a new remote
git remote add planerix_old git@github.com:aistrategyc/planerix.git

# Remove a remote
git remote remove old_remote_name

# Rename a remote
git remote rename old_name new_name
```

### Change Branch Tracking

```bash
# Make develop track origin/develop
git branch --set-upstream-to=origin/develop develop

# Make main track origin/main
git branch --set-upstream-to=origin/main main
```

---

## Deployment Workflow

### 1. Local Development & Testing

```bash
# Work on develop branch
git checkout develop

# Make changes
# ... code changes ...

# Commit locally
git add .
git commit -m "feat: Your feature"
```

### 2. Push to Production Repo

```bash
# Push to planerix4 (production)
git push origin develop
```

### 3. Deploy to Server

```bash
# SSH to server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33

# Navigate to project
cd /opt/MONOREPv3

# Pull latest changes
git pull origin develop

# Rebuild containers if needed
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=50 api
docker-compose -f docker-compose.prod.yml logs --tail=50 web
```

---

## Common Scenarios

### Scenario 1: "I accidentally pushed to wrong repo"

**Old Problem**: Commits went to `planerix` instead of `planerix4`.

**Solution**: This is now impossible! `origin` = `planerix4` by default.

If you still want to push to the old repo:
```bash
git push planerix_old develop  # Explicit push to legacy repo
```

### Scenario 2: "Server is out of sync with my local"

```bash
# Check server commit
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33 "cd /opt/MONOREPv3 && git log --oneline -1"

# Check your local commit
git log --oneline -1

# If different, push your changes
git push origin develop

# Then update server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33 "cd /opt/MONOREPv3 && git pull origin develop"
```

### Scenario 3: "I want to sync both repos"

```bash
# Push to production
git push origin develop

# Push to legacy
git push planerix_old develop

# Or push to all remotes at once
git remote | xargs -L1 git push --all
```

### Scenario 4: "I need to revert the remote setup"

```bash
# Swap back if needed (not recommended)
git remote rename origin planerix4
git remote rename planerix_old origin

# Update branch tracking
git branch --set-upstream-to=origin/develop develop
git branch --set-upstream-to=origin/main main
```

---

## Verification Checklist

After configuration, verify everything is correct:

```bash
# ✅ 1. Check remotes
git remote -v
# Should show:
# origin        git@github.com:aistrategyc/planerix4.git
# planerix_old  git@github.com:aistrategyc/planerix.git

# ✅ 2. Check branch tracking
git branch -vv
# Should show:
# * develop f36d6f2 [origin/develop] docs: Add...
#   main    e1568ac [origin/main] merge: Merge...

# ✅ 3. Test push (dry run)
git push --dry-run origin develop
# Should show: To github.com:aistrategyc/planerix4.git

# ✅ 4. Verify server uses same repo
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33 "cd /opt/MONOREPv3 && git remote -v"
# Should show: origin  git@github.com:aistrategyc/planerix4.git
```

---

## Best Practices

### 1. Always Use `origin` for Production

```bash
# ✅ GOOD - Goes to production repo (planerix4)
git push origin develop
git push origin main

# ⚠️  AVOID - Explicitly using planerix_old
git push planerix_old develop  # Only use for backup sync
```

### 2. Keep Develop and Main in Sync

```bash
# Regularly merge develop to main for releases
git checkout main
git merge develop
git push origin main
```

### 3. Always Pull Before Push

```bash
# Avoid conflicts
git pull origin develop
# ... make changes ...
git push origin develop
```

### 4. Use Meaningful Commit Messages

```bash
# ✅ GOOD
git commit -m "feat: Add real data integration for /ads page"
git commit -m "fix: Resolve authentication bug in login flow"
git commit -m "docs: Update deployment documentation"

# ❌ BAD
git commit -m "update"
git commit -m "fixes"
git commit -m "wip"
```

### 5. Verify Before Production Deployment

```bash
# Test locally first
docker-compose up -d --build

# Then push to repo
git push origin develop

# Then deploy to server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33 "cd /opt/MONOREPv3 && git pull origin develop && docker-compose -f docker-compose.prod.yml up -d --build"
```

---

## Troubleshooting

### Problem: "Push failed - permission denied"

```bash
# Check SSH key is loaded
ssh-add -l

# Add SSH key if needed
ssh-add ~/.ssh/id_rsa

# Test GitHub connection
ssh -T git@github.com
```

### Problem: "Branch is behind remote"

```bash
# Pull first
git pull origin develop

# Then push
git push origin develop
```

### Problem: "Merge conflict"

```bash
# Pull and resolve conflicts
git pull origin develop

# Edit conflicting files
# ... fix conflicts ...

# Add resolved files
git add .

# Complete merge
git commit -m "merge: Resolve conflicts from origin/develop"

# Push
git push origin develop
```

### Problem: "Wrong remote configured"

```bash
# Check current remote
git remote show origin

# If wrong, update it
git remote set-url origin git@github.com:aistrategyc/planerix4.git

# Verify
git remote -v
```

---

## Quick Reference Card

### Most Used Commands

```bash
# Daily workflow
git pull origin develop      # Get latest
git add .                    # Stage changes
git commit -m "..."          # Commit
git push origin develop      # Push to production

# Check status
git status                   # Working directory status
git log --oneline -5         # Recent commits
git remote -v                # List remotes
git branch -vv               # Branch tracking

# Server deployment
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3
git pull origin develop
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Summary

### What Changed

**Before**:
- ❌ `origin` → `planerix` (wrong repo)
- ❌ `planerix4` → secondary remote
- ❌ Easy to push to wrong repo by mistake

**After**:
- ✅ `origin` → `planerix4` (production repo)
- ✅ `planerix_old` → legacy backup
- ✅ All default pushes go to correct repo
- ✅ Matches server configuration

### Key Benefits

1. **No More Mistakes**: Default `git push` goes to production repo
2. **Simplified Workflow**: No need to remember `planerix4` vs `planerix`
3. **Server Alignment**: Local `origin` matches server `origin`
4. **Backward Compatible**: Old repo still accessible as `planerix_old`

### Important URLs

- **Production Repo**: https://github.com/aistrategyc/planerix4
- **Legacy Repo**: https://github.com/aistrategyc/planerix
- **Production Server**: 65.108.220.33 (/opt/MONOREPv3)
- **Production Site**: https://app.planerix.com
- **API**: https://api.planerix.com

---

**Configuration Date**: October 19, 2025, 12:00 CEST
**Configured By**: Claude (AI Assistant)
**Status**: ✅ Production-Ready
