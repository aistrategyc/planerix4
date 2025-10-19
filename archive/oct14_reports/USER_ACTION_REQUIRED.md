# User Action Required - Login Fix

## Problem
After attempting to login, you see a white screen.

## Root Cause
Your browser has expired/revoked authentication tokens that need to be cleared.

## Solution Steps

### Option 1: Clear Browser Storage (Recommended)

1. **Open Chrome DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)

2. **Go to Application Tab**:
   - Click "Application" in the top menu
   - Find "Storage" in left sidebar
   - Click "Clear site data" button
   - Confirm the action

3. **Reload and Login**:
   - Go to: `https://app.planerix.com/login`
   - Email: `itstep@itstep.com`
   - Password: `ITstep2025!`
   - Click "Login"

### Option 2: Use Incognito Mode (Quick Test)

1. Open Incognito/Private window
2. Go to: `https://app.planerix.com/login`
3. Login with credentials above
4. Should work immediately without white screen

## Why This Happened

Authentication tokens have a limited lifespan:
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

After long periods of inactivity or after auth system changes, tokens can become revoked and need to be refreshed by clearing browser storage and logging in again.

## Verification

After clearing storage and logging in, you should see:
- ✅ Dashboard loads successfully
- ✅ No white screen
- ✅ All analytics pages accessible
- ✅ /ads page shows updated data

---

**Date**: October 15, 2025
**Status**: System is working - requires user action only
