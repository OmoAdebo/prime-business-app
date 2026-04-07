

# Mobile & Tablet UX Polish — Auto-Close Sidebar + Flow Fixes

## Problem

From the screenshot and code review, the primary issues are:

1. **Sidebar doesn't auto-close on mobile after nav click** — On mobile, the sidebar is a Sheet overlay. When a user taps a nav item, the page navigates but the sidebar stays open, blocking the content.
2. **No route-change listener on mobile sidebar** — The Sheet's `openMobile` state is only toggled by `SidebarTrigger`, not by navigation events.
3. **ModuleLayout sub-nav tabs don't close sidebar either** — If sidebar is open and user somehow navigates via sub-tabs, same issue.
4. **Sign Out button doesn't close sidebar before navigating**.
5. **Touch targets and spacing inconsistencies** in sidebar footer items on short mobile screens.

---

## Plan

### 1. Auto-close mobile sidebar on route change

**File: `src/components/AppSidebar.tsx`**

- Import `useLocation` from react-router-dom and `useSidebar` (already imported)
- Access `setOpenMobile` and `isMobile` from `useSidebar()`
- Add a `useEffect` that watches `location.pathname` — when it changes and `isMobile` is true, call `setOpenMobile(false)`
- This single change fixes ALL nav item clicks, sign out, and any programmatic navigation

### 2. Ensure sidebar nav links have proper touch sizing

**File: `src/components/AppSidebar.tsx`**

- Footer nav items already have `py-2` but should match the `min-h-[44px]` pattern used in main nav items
- Add `min-h-[44px]` to footer `NavLink` and `SidebarMenuButton` (Sign Out)

### 3. Add `overflow-y-auto` to sidebar footer for short screens

**File: `src/components/AppSidebar.tsx`**

- On very short mobile screens (e.g. landscape phone), the footer items (Settings, Help, Sign Out) can get cut off
- Wrap `SidebarFooter` content or ensure the overall sidebar has proper scroll behavior (the `SidebarContent` already has `overflow-y-auto`, but the footer is outside it)
- Add `max-h-[30vh] overflow-y-auto` to the footer's `SidebarMenu` as a safety net

### 4. Improve header touch area and mobile spacing

**File: `src/components/AppLayout.tsx`**

- The `SidebarTrigger` already has `min-h-[44px]` — verify it's consistent
- Ensure the mobile search close button and Home button all have `min-h-[44px]` (already done in Batch 1 — verify no regression)

### 5. Smooth sheet transition

**File: `src/components/ui/sidebar.tsx`**

- The Sheet already handles animations via Radix. No changes needed unless we want to customize duration — skip for now as Radix defaults are good.

---

## Technical Details

The core fix is a single `useEffect` in `AppSidebar.tsx`:

```text
const location = useLocation();
const { setOpenMobile, isMobile } = useSidebar();

useEffect(() => {
  if (isMobile) setOpenMobile(false);
}, [location.pathname]);
```

This pattern is the standard approach for Sheet-based mobile sidebars — close on navigation.

**Files modified**: `src/components/AppSidebar.tsx` (primary), minor touch-up to footer sizing.

**No database changes. No new files.**

