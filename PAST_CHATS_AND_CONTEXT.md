# SigmaGo - Past Chats & Project Context

## Project Overview
**SigmaGo** is an Enterprise Multi-Tenant Approval & Workflow Management platform built with **Next.js**, **Prisma**, **PostgreSQL / Supabase**, and **Tailwind CSS**.

---

## 📜 Retrieved Conversation Context & Past Work Log

### 1. Multi-Tenant Approval Engine Architecture
* **Request Lifecycle & Workflows**: Users submit approval requests associated with specific tenants (`tenant_id`), owner IDs, categories, conditions, and optional custom fields or beneficiary details.
* **Database Models (`prisma/schema.prisma`)**:
  * `approval_requests`: Core table for tracking requests, subject, JSON body, status (`draft`, `pending`, `approved`, `rejected`), versioning, checksum validation (`checksum_sha256`), and validity dates.
  * `approval_steps`: Sequential/parallel step approval rules, required approver roles, step statuses, and action logs.
  * `ActionToken`: Security tokens generated for fast single-click email or one-time approval/rejection actions.
  * `categories`: Request classification schemas.
  * `tenants`: Multi-tenant isolation.
  * `users` & RLS Policies: PostgreSQL Row Level Security rules isolating tenant data.

### 2. Recent Development Scripts & Fixes Included in Workspace
* `add_beneficiary_sql.js`: Migration helper for adding beneficiary relationships (`beneficiary_id`) to approval requests.
* `add_custom_fields_sql.js`: Support for dynamic JSON custom form fields.
* `add_offline_sql.js` & `add_validity_sql.js`: Schema enhancements for offline processing and validity window dates (`valid_from`, `valid_until`, `review_date`).
* `inspect_roles.js` & `inspect_tables_pg.js`: PostgreSQL introspection and RLS policy verification.
* `manage_constraint.js` & `check_constraint.js`: Foreign key integrity check scripts.

---

## 🛠️ Environment & Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```
3. **Environment Configuration**:
   Ensure `.env` or `.env.local` contains valid database credentials:
   ```env
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="..."
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. **Run Dev Server**:
   ```bash
   npm run dev
   ```

---

*This document was compiled automatically from your past session history to give you full context inside this workspace.*
