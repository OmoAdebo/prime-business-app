# Prime Business — Approved Plan (with Admin Updates)

Original 7-part scope approved. Adding the following amendments per latest feedback:

## Amendments

### A. Remove `/admin-register`
- Delete `src/pages/AdminRegister.tsx` and its route.
- Remove the "PRIME-ADMIN-2026" registration code path entirely.
- Update memory `auth/admin-access`: admins are now provisioned only by existing super admins (no self-registration).

### B. Seed Super Admin Account
- Create user **oreoneinc@gmail.com** / **Pa$$w0rd!** via Supabase admin API (edge function `seed-super-admin` run once, or direct insert through the SQL admin path).
- Auto-confirm email so the user can log in immediately.
- Insert row into `user_roles` with role `super_admin`.
- Insert/seed corresponding `profiles` row (full_name: "Oreon Admin").

### C. Dynamic Admin Management (Super Admin only)
- New page `src/pages/admin/AdminManagement.tsx` accessible at `/admin/admins`.
- Lists every user with role `super_admin` or any admin-tier role.
- **Create Admin** dialog: email + full_name + role (super_admin, admin, support_admin) → calls new edge function `create-admin-user` (service role) that:
  - Creates auth user with random temp password
  - Auto-confirms email
  - Sends welcome email with password-reset link
  - Inserts user_roles row
- **Edit role / Deactivate / Delete admin** actions, with confirmation dialogs.
- Guarded so only `super_admin` can mutate; other admin tiers have read-only access.
- New enum values may be added to `app_role`: `admin`, `support_admin` (super_admin stays the top tier).

### D. Order of Execution (updated)
1. DB migration: add onboarding fields, announcements table, new admin role enum values, admin RPCs.
2. Seed super admin (oreoneinc@gmail.com) + delete `/admin-register` route & file.
3. Auth duplicate-email edge function + Signup hardening.
4. Onboarding wizard + guard + progress UI + step-by-step toasts.
5. Financial statement downloads (PDF/CSV/Excel).
6. Import/Export utility + rollout to list pages.
7. Super Admin dashboard shell + **Admin Management** page.
8. Conversational Voice Agent rewrite (edge function + dialog-driving bus).

All other details from the previously approved plan remain unchanged.
