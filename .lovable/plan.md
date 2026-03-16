

## Analysis & Plan

### 1. Root Cause of Role Assignment Bug

The `handle_new_user()` function exists but **the trigger is missing** — the database reports "There are no triggers." This means when a user signs up, no profile row and no role row are created by the trigger. The client-side code in `Signup.tsx` then tries to `UPDATE user_roles` for a row that doesn't exist, and there's no INSERT RLS policy on `user_roles` anyway — so it silently fails. Every user ends up with no role, and the code defaults to `'employee'`.

**Fix**: Create the missing trigger attaching `handle_new_user()` to `auth.users` on INSERT.

### 2. Role Architecture Redesign

Based on the PRD, the correct model is a **multi-tenant SaaS pattern**:

```text
PLATFORM LEVEL (Prime internal)
  └── Super Admin — manages Prime platform, system settings

BUSINESS LEVEL (per onboarded business)
  └── Business Owner — self-registers, creates their business
       ├── Store Manager — invited by owner
       ├── Accountant — invited by owner
       └── Employee — invited by owner
```

**Key decisions:**
- **Business Owner** is the only role that self-registers via `/signup`
- **Store Manager, Accountant, Employee** are invited by the Business Owner from their dashboard (email invite via Resend API — user receives link, sets password)
- **Super Admin** registers via a separate `/admin-register` page (protected by a secret invite code or restricted after first admin is created)
- The public signup page removes the role selector entirely — all self-registering users are Business Owners

### 3. Implementation Tasks

#### A. Database Migration
- Create the missing `on_auth_user_created` trigger
- Default role for self-signup becomes `business_owner` (not `employee`)
- Add an `invited_by` column to `user_roles` to track who invited the user
- Add INSERT policy on `user_roles` so the trigger (SECURITY DEFINER) works and admins can insert

#### B. Email Templates (for Supabase Dashboard)
Provide branded HTML templates for:
- **Confirm Signup** — Prime teal/amber branded, "Welcome to Prime" messaging
- **Password Reset** — matching design
- **Invite User** — "You've been invited to join [Company] on Prime"

These will be ready-to-paste into **Supabase Dashboard → Authentication → Email Templates**.

#### C. Dynamic Navbar with Profile Dropdown
- Update `AppLayout.tsx` header: replace hardcoded "OA" avatar with user's initials from `profile.full_name`
- Add a dropdown menu (DropdownMenu component) with: user name, email, role badge, links to Settings, and Sign Out
- Pull data from `useAuth()` context

#### D. Remove Hardcoded Data
- `Dashboard.tsx`: All KPI values (`$182,800`, `$47,320`, etc.), `revenueData`, `weeklyData`, `recentActivity` arrays are hardcoded mock data
- `AppLayout.tsx`: Hardcoded avatar initials "OA"
- These will be replaced with dynamic data or clearly marked as placeholder with a "no data yet" empty state

#### E. Signup Flow Changes
- `/signup` — remove role selector, all signups default to `business_owner`
- `/admin-register` — new page with invite code validation, creates `super_admin` role
- Future: invite flow from Business Owner dashboard (Resend API integration for sending invite emails)

#### F. Sidebar Navigation Filtering
- Filter sidebar items based on `roles` from `useAuth()` so each role only sees permitted modules

### 4. Email Template Preview (Confirm Signup)

Will provide three HTML templates styled with:
- Primary teal (`#3d8b7a`) header/buttons
- Amber (`#e8a838`) accent
- DM Sans font family
- Prime "P" logo mark
- Professional footer with company info

### Files to Create/Modify
- **New**: `supabase migration` (trigger + schema changes)
- **New**: `src/pages/AdminRegister.tsx`
- **Modify**: `src/pages/Signup.tsx` (remove role selector)
- **Modify**: `src/components/AppLayout.tsx` (dynamic navbar + profile dropdown)
- **Modify**: `src/components/AppSidebar.tsx` (role-based nav filtering)
- **Modify**: `src/components/RoleDashboard.tsx` (minor adjustments)
- **Modify**: `src/pages/Dashboard.tsx` (mark data as placeholder/empty states)
- **Modify**: `src/App.tsx` (add admin-register route)
- **Provide**: 3 HTML email templates for Supabase dashboard paste

