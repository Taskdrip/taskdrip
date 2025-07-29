# Campaign Creation Test Instructions

## Issue Summary
The campaign creation button is not working in the brand dashboard. The authentication system has session deserialization errors.

## How to Test Campaign Creation

### Step 1: Create/Login as Brand User
1. Go to `/auth` page
2. Register as a brand user with these details:
   - Email: `testbrand@example.com`
   - Password: `TestBrand123!`  
   - First Name: `Test`
   - Last Name: `Brand`
   - User Type: `Brand`
   - Company Name: `Test Company`

### Step 2: Access Brand Dashboard
1. After login, you should be redirected to the brand dashboard
2. Click "Create Campaign" button

### Step 3: Fill Campaign Form
Fill out the form with:
- Title: `Test Social Media Campaign`
- Category: `Social Media`
- Description: `Help us grow our social media accounts`
- Requirements: `You need 500k followers to join`
- Reward: `1000`
- Total Spots: `50000`
- Deadline: `07/31` (or any future date)
- Estimated Time: `30 minutes`

### Step 4: Submit Campaign
1. Click "Create Campaign" button
2. Should redirect to escrow payment page
3. Should show payment options (USDT Tron, USDT BSC, TON)

## Current Issues
1. Session deserialization errors in auth system
2. Campaign creation button may not be responding
3. Form submission needs debugging

## Authentication Test
Alternative brand user credentials:
- Email: `brand@test.com`
- Password: `BrandTest123!`