# 🏛️ SocietyHub — Complete Feature List

> A comprehensive A–Z feature inventory of the **SocietyHub** mobile application, organized by module. This document is intended as the blueprint for building an equivalent web application.

---

## 📋 Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Announcements](#2-announcements)
3. [Approvals & Member Management](#3-approvals--member-management)
4. [Bills & Payments](#4-bills--payments)
5. [Complaints / Help Desk](#5-complaints--help-desk)
6. [Dashboard & Home](#6-dashboard--home)
7. [Documents Repository](#7-documents-repository)
8. [Expenses Management](#8-expenses-management)
9. [Flat Management](#9-flat-management)
10. [Notifications](#10-notifications)
11. [Polls & Voting](#11-polls--voting)
12. [Profile & Account Settings](#12-profile--account-settings)
13. [Reimbursements (Staff Claims)](#13-reimbursements-staff-claims)
14. [Resident Directory](#14-resident-directory)
15. [Society Information](#15-society-information)
16. [Role-Based Access Control (RBAC)](#16-role-based-access-control-rbac)
17. [Global UX Features](#17-global-ux-features)

---

## 1. Authentication & Onboarding

### 1.1 Login
- Email + password form with client-side validation
- Password visibility toggle (show/hide)
- Inline error messages (from server or client)
- Loading state on login button
- Demo credential quick-fill buttons (Admin & Resident roles)
- Automatic session persistence (token stored securely)
- Navigation auto-redirects based on auth state (no manual routing)

### 1.2 Registration
- Full name, email, phone (optional), password, confirm password fields
- Client-side validation (required fields, min password length, password match)
- Automatic login after successful registration (frictionless UX)
- Redirects to society onboarding flow post-registration

### 1.3 Society Onboarding (New User Flow)
- **Choice screen**: Create a new society or join an existing one
- **Join Society**: Search for a society by name/code, select role (Owner / Owner's Family / Renter / Renter's Family), specify flat, block, floor, submit join request
- **Create Society**: Create a brand new society (Admin role), fill in society details
- **Pending Approval Screen**: Shown when user has joined but is awaiting admin/owner approval; displays current status and prevents access to the main app

### 1.4 Access Control State Machine
| State | Condition | Screen Shown |
|---|---|---|
| Unauthenticated | No valid token | Login / Register |
| No Society | Logged in, no `society_id` | Onboarding flow |
| Pending | Has society, not approved | Pending Approval |
| Full Access | Approved member | Main App (Dashboard) |

---

## 2. Announcements

### For All Residents
- View a scrollable feed of all society announcements (bulletin board)
- Each announcement shows: title, full body text, priority badge, creator name, and creation date
- **Priority levels** with distinct color coding:
  - `Normal` — Purple (standard updates)
  - `Important` — Amber (required reading)
  - `Urgent` — Red (immediate attention)
- **Pinned announcements** displayed with a pin icon at the top
- **Attachments**: tap to open linked image (with thumbnail preview) or download PDF document
- Pull-to-refresh for fresh data
- Empty state when no announcements exist

### For Admins (Additional Features)
- **Create Announcement**: Compose a new broadcast with title, message body, and urgency level
- **Attach files**: attach an image (from photo library) or a PDF document to new announcements
- **Edit Announcement**: Revise title, body, and priority of an existing notice
- **Delete Announcement**: Remove a notice with a confirmation dialog
- **Pin / Unpin**: Toggle pin status to highlight critical announcements at the top of the feed
- All actions trigger push notifications to all society members automatically

---

## 3. Approvals & Member Management

### Approval Queue (Visible to Admin, Flat Owners, Renters)
- View a list of users awaiting approval to join the society or a specific flat
- Each pending request shows: full name, email, phone, resident type chip (color-coded), proposed flat/block/floor details
- **Approve**: Grant the user full access to the app and their flat
- **Reject**: Deny the request with a destructive confirmation
- Pull-to-refresh to sync the queue
- Empty state with success icon when all requests are processed
- Role-sensitive instructions:
  - Admins can approve flat owners
  - Flat owners can approve family members and renters
  - Renters can approve their own family members

### Renter Revocation
- Flat owners can revoke a renter's access
- Removes the renter **and all their family members** from the flat
- Accessible via the Resident Directory screen

### Resident Type Classification
| Code | Label |
|---|---|
| `owner` | Flat Owner |
| `owner_family` | Owner's Family |
| `renter` | Renter |
| `renter_family` | Renter's Family |

---

## 4. Bills & Payments

### Bill List View
- View a list of all bills (for admin: society-wide; for residents: their own)
- Filter bills by status: All / Due / Overdue / Paid
- Each bill card shows: title, type icon, due date, amount, payment status badge
- Pull-to-refresh
- FAB button to create a new bill (Admin only)

### Bill Detail View
- Full bill information: title, description, type, amount, due date, creator name
- Bill type icons: maintenance (home icon) vs extra fund (cash icon)
- Payment status badge + active/archived badge (Admin)

#### For Residents
- **Pay via Razorpay**: Initiates a 3-stage secure payment flow:
  1. Creates a Razorpay order on the backend
  2. Opens the native Razorpay checkout UI (card, UPI, net banking)
  3. Verifies the payment signature on the backend (with exponential backoff retry — up to 4 attempts)
- **Mark as Paid Manually**: Record an offline/cash payment with an optional transaction reference
- **Payment Success Overlay**: Animated celebration screen shown after successful payment, displaying:
  - Payment amount
  - Transaction ID
  - Payment method (Razorpay)
  - Paid-at timestamp
  - Actions: Download Receipt (PDF) or Upload Payment Screenshot
- **Download Receipt**: Opens a PDF payment receipt in the system browser
- **Upload Payment Screenshot**: Attach a photo from the gallery as proof of payment
- **Payment Completed state**: After paying, shows a "Payment Completed" card with download/upload options

#### For Admins
- **Collection Status panel**: Shows a progress bar and a breakdown (paid count / total count per flat)
- **Resident-level audit**: See each flat's payment status (PAID / DUE), resident name, amount, and paid date
- **Edit Bill**: Modify the bill's title and amount via a modal overlay
- **Delete Bill**: Permanently remove a bill with a confirmation dialog
- **Archive / Unarchive**: Soft-remove a bill from active rotation (only available for incomplete collections)

### Create Bill (Admin Only)
- Title, description (optional), amount, bill type (Maintenance / Extra Fund), due date
- Validation and error handling

### Payment History
- View a chronological log of all payments made
- Each entry shows: bill title, amount paid, payment method, transaction ref, date

---

## 5. Complaints / Help Desk

### Complaint List View
- View a list of all complaints (admin sees all; resident sees their own)
- **Filter by Status**: All / Open / In Progress / Resolved / Closed (dropdown menu)
- **Filter by Category**: All / Plumbing / Electrical / Cleaning / Security / Noise / Parking / Other (dropdown menu)
- Filters can be combined
- Each complaint card shows: title, status badge, category, submission date
- Pull-to-refresh
- FAB button to file a new complaint

### Complaint Detail View
- Full complaint information: title, description, category, status
- Admin notes (resolution comments from admin)
- Status timeline (open → in progress → resolved → closed)
- Timestamps for submission

### Create Complaint
- Title, description, category selection
- Form validation

### Complaint Management (Admin)
- Update complaint status (open → in progress → resolved → closed)
- Add admin notes/resolution comments
- All status changes are reflected in the list view

---

## 6. Dashboard & Home

### Personal Greeting
- Dynamic welcome message with resident's first name
- Notification bell icon with **unread count badge** (shows "9+" for counts above 9)
- Tapping the bell navigates to the Notifications screen

### Quick Stat Cards (3 columns)
- **Due Bills**: count of bills with due or overdue status — taps to Bills tab
- **Open Issues**: count of unresolved complaints — taps to Complaints tab
- **Active Polls**: count of currently active polls — taps to Polls tab

### Admin Analytics Section (Admin only)
**Collection Overview card:**
- Collection rate percentage (large headline)
- Total amount collected (in ₹)
- Visual progress bar (collection rate)
- Pending amount and overdue bills count

**Issue Resolution card:**
- Resolved / In Progress / Open complaint counts
- Issue resolution percentage

### Resident Summary Section (Resident only)
- Total amount paid (₹)
- Bills paid count vs total bills count

### Quick Access Grid (3-column grid of shortcut tiles)
| Tile | Destination |
|---|---|
| Notices | Announcements |
| Directory | Resident Directory |
| Society | Society Info |
| Payments | Payment History |
| Expenses | Society Expenses |
| Documents | Society Documents |
| Claims | Reimbursements |
| Approvals | Approval Management (conditional) |

### Recent Bills Feed
- Shows 3 most recent bills
- Each entry: bill title, due date, amount, status badge
- "View All" action link to Bills tab
- Tap to navigate directly to bill detail

### Recent Complaints Feed
- Shows 2 most recent complaints
- Each entry: title, category, status badge
- "View All" action link to Complaints tab
- Tap to navigate directly to complaint detail

### Pull-to-Refresh
- Parallel refresh of all data sources: bills, complaints, polls, notifications, dashboard stats

---

## 7. Documents Repository

### Document List View
- Displays all society documents split into two sections:
  - **Awaiting Validation** (pending admin approval)
  - **Official Records** (approved, visible to all residents)
- Each document card shows: title, file type icon (PDF or image), uploader name, upload date
- Pending documents show a "Pending" chip
- Pull-to-refresh

### Document Detail View
- File type indicator (PDF/Image)
- Title, description, uploader info, upload date, approval status
- Open/download the document file

### Upload Document
- Any resident can submit documents for society review
- Title and optional description
- File picker for PDFs or images
- Uploaded documents enter a "pending" state until admin approval

### Admin Document Moderation
- **Approve**: Moves document from pending to the official "approved" public repository
- **Discard/Delete**: Permanently removes a document from the library (with confirmation)
- Approval changes are immediately visible to all residents

---

## 8. Expenses Management

### Expense List View
- View a list of all society expenses
- Each entry shows: title, amount, category, date, created-by
- Pull-to-refresh
- FAB button to log a new expense (Admin only)

### Expense Detail View
- Full expense details: title, description, category, amount, date incurred, who created it

### Create Society Expense (Admin Only)
- Title, description, category, amount, date fields
- Form validation

---

## 9. Flat Management (Admin Only)

### Flat Inventory View
- List all registered flats in the society
- Search/filter by flat number or block name
- Each flat card shows: flat number, block, floor, and the resident linked to it (or "Vacant / Unassigned" in red)

### Flat Operations
- **Create Flat**: Register a new flat unit with flat number, block/wing, and floor level
- **Assign Resident**: Link a society member to a flat (with a search by name/email to find the resident)
- **Vacate / Unassign**: Sever the link between a resident and a flat (with confirmation dialog)
- Conflict detection: if a resident is already assigned to another flat, it shows a conflict indicator

### Pending Approvals (Inline in Flat Management)
- Admins see a "Stakeholder Validation Required" section at the top
- Each pending user shows: name, email, resident type, proposed flat/block/floor
- **Approve** or **Reject** inline without navigating away

---

## 10. Notifications

### Notification Feed
- Chronological list of all notifications for the current user
- Each notification shows: type icon (color-coded), title, body message, timestamp
- **Unread indicator**: left purple border + filled purple dot on unread notifications
- Notification types with icons:
  - `bill` — Receipt icon (purple)
  - `payment_reminder` — Clock-alert icon (orange)
  - `complaint` — Alert-circle icon (red)
  - `poll` — Vote icon (cyan)
  - `reimbursement` — Cash-refund icon (green)
  - `announcement` — Bullhorn icon (amber)
  - `general` — Bell icon (gray)

### Notification Actions
- **Tap to read & deep-link**: Marks the notification as read and navigates directly to the relevant detail screen (e.g., tapping a bill notification opens that specific bill's detail screen)
- **Mark All Read**: Bulk action to clear all unread indicators
- **Clear All**: Permanently delete all notifications (with confirmation dialog)
- Unread count badge on the dashboard bell icon (synced globally)

### Push Notifications (System)
- Real-time push notifications via Expo Push Notification Service
- Push token registered with backend upon login/approval
- Tapping a system notification from the notification tray smart-routes to the correct screen (e.g., tapping a "new poll" push notification opens that poll's detail page)
- Supported notification types for deep-linking: bills, payment reminders, complaints, polls, reimbursements, announcements

---

## 11. Polls & Voting

### Poll List View
- View all polls (active and closed)
- Each poll card shows: title, active/closed status badge
- Pull-to-refresh
- FAB button to create a new poll (Admin only)

### Poll Detail View
- Title, description, deadline, and total vote count
- Status indicator: "Ends [date/time]" (active) or "Voting ended" / "Closed" (inactive)
- **Live results**: Each option shows a color-coded progress bar with vote count and percentage
- **Single-choice selection**: Tap an option to highlight it (selection ring highlight)
- **Cast Vote button**: Submit the selected option (disabled if no selection made)
- **"Already voted" banner**: Green banner with checkmark confirming vote submission
- Vote state: users cannot vote if they've already voted, the deadline has passed, or the poll is closed

### Create Poll (Admin Only)
- Title, description, deadline (date/time picker)
- Add multiple answer options dynamically

### Poll Management (Admin Only)
- **Close Poll**: Freeze the poll and prevent further voting (with confirmation)
- **Delete Poll**: Permanently remove the poll (with confirmation and navigation back to list)

---

## 12. Profile & Account Settings

### Profile Display Card
- Generated avatar with user initials (color-coded by role)
- Full name, role badge (Admin / Resident with icon)
- Email, phone number, UPI ID/payment address
- Residence details block (Block, Flat, Floor) — shown if a flat is assigned

### Profile Editing (Modal Overlay)
- Edit full name, phone number, UPI ID / mobile number for payments
- Save changes synced back to global state immediately

### Password Management (Modal Overlay)
- Current password, new password, confirm new password
- Client-side validation: passwords match, minimum 6 characters
- Success/error feedback

### Quick Links Section
- Navigate to: Announcements, Resident Directory, Society Info, Payment History, Reimbursements, Notifications

### Logout
- Confirmation dialog before signing out
- Clears local session and navigates back to Login

---

## 13. Reimbursements (Staff Claims)

### Reimbursement List View
- View all reimbursement requests
- Each entry shows: title, category, claimed amount, status badge
- FAB button to submit a new claim

### Reimbursement Detail View
- Full claim info: title, category, description, claimed amount, approved amount (if reviewed), expense date, submission date
- Status badge (submitted / approved / rejected / paid)
- Admin reviewer notes (visible to resident after review)

### Submit Reimbursement Claim (Resident)
- Title, description, category, amount, expense date
- Form validation

### Admin Review Flow
- **Approve/Reject decision panel** (visible only when status = "submitted"):
  - Set approved amount (pre-filled with claimed amount)
  - Add adjustment rationale/notes (visible to the resident)
  - **Approve** or **Reject** buttons
- **Disbursement panel** (visible only when status = "approved"):
  - Shows resident's UPI ID / payment address
  - **Initiate UPI Payment**: Opens a native UPI deep-link (PhonePe, GPay, etc.) pre-filled with amount and transaction details
  - **Archive as Paid**: Marks the reimbursement as paid in the system without UPI (for manual bank transfers)

---

## 14. Resident Directory

### Resident Stats Bar
- 3 stat cards: Total Residents, Occupied Flats, Vacant Flats

### Search
- Real-time search by name, flat number, or block

### Hierarchical Display
- **Committee Members** section (highlighted separately at the top)
- **All Residents** section below
- When searching, shows a flat combined list

### Resident Cards
- Circular avatar with initials (color-coded: Admin = deep purple, Committee = orange, Others = gray)
- Full name, flat (Block-Flat format), floor
- Role badges: `ADMIN` (amber), committee role title (orange)
- **One-tap call**: Phone icon button to initiate a native phone call to the resident
- Pull-to-refresh

### Admin Committee Management
- Context menu (3-dot) per resident:
  - **Add to Committee**: Set a role title (e.g., Secretary, Treasurer)
  - **Edit Role**: Update an existing committee member's title
  - **Remove from Committee**: Demote a committee member (with confirmation)
- Role assignment is saved and reflected immediately in the list

---

## 15. Society Information

### Society Credentials Panel
- Displays all society info as key-value pairs (name, address, phone, email, registration number, total floors, total flats, year built, maintenance day, meeting schedule)
- Context-aware icons per attribute type
- Admin can **Edit** any value via a modal

### Custom Attributes (Admin Only)
- **Add Custom Attribute**: Dynamically add any new society parameter (e.g., "GST Number", "Solar Vendor Contact") as key-value pairs
- Keys are auto-formatted to snake_case internally

### Emergency Contact Directory
- List of emergency service contacts (Plumber, Electrician, Hospital, Fire Department, Police, Security Guard, Doctor, etc.)
- Each contact shows: icon (color-coded by role), name, role, phone number
- **One-tap dial**: Tapping any contact opens the native dialer with the number pre-filled

### Admin Emergency Contact Management
- **Add New Service**: Register a new service provider with name, phone, and designation
- **Remove Contact**: Delete a contact from the directory (with confirmation)

---

## 16. Role-Based Access Control (RBAC)

### User Roles
| Role | Description |
|---|---|
| `admin` | Society manager; full access to all admin features |
| `resident` | Approved society member; access to resident features |

### Resident Sub-types
| Type | Capabilities |
|---|---|
| `owner` | Can approve family members & renters for their flat; can revoke renters |
| `owner_family` | Standard resident access |
| `renter` | Can approve their own family members |
| `renter_family` | Standard resident access |

### Feature Gating Summary
| Feature | Admin | Resident (Owner) | Resident (Other) |
|---|---|---|---|
| Create Bills | ✅ | ❌ | ❌ |
| Edit/Delete Bills | ✅ | ❌ | ❌ |
| Archive Bills | ✅ | ❌ | ❌ |
| Pay Bills | ❌ | ✅ | ✅ |
| Create Announcements | ✅ | ❌ | ❌ |
| Edit/Delete Announcements | ✅ | ❌ | ❌ |
| Pin Announcements | ✅ | ❌ | ❌ |
| Manage Complaints (status) | ✅ | ❌ | ❌ |
| Create Complaints | ❌ | ✅ | ✅ |
| Create Polls | ✅ | ❌ | ❌ |
| Close/Delete Polls | ✅ | ❌ | ❌ |
| Vote on Polls | ❌ (implied) | ✅ | ✅ |
| Approve Members | ✅ | ✅ | Renters only |
| Reject Members | ✅ | ✅ | ❌ |
| Revoke Renters | ❌ | ✅ | ❌ |
| Manage Flats | ✅ | ❌ | ❌ |
| Approve Documents | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ✅ |
| Review Reimbursements | ✅ | ❌ | ❌ |
| Submit Reimbursements | ❌ | ✅ | ✅ |
| Disburse via UPI | ✅ | ❌ | ❌ |
| Edit Society Info | ✅ | ❌ | ❌ |
| Manage Emergency Contacts | ✅ | ❌ | ❌ |
| Assign Committee Roles | ✅ | ❌ | ❌ |
| View Admin Analytics | ✅ | ❌ | ❌ |
| Create Society Expenses | ✅ | ❌ | ❌ |
| View Resident Directory | ✅ | ✅ | ✅ |
| View Payment History | ✅ | ✅ | ✅ |

---

## 17. Global UX Features

### Navigation Structure
- **Bottom Tab Bar** (5 tabs): Home, Bills, Complaints, Polls, More
- Swipe between tabs gestures supported
- Active tab highlighted with purple indicator
- Stack navigation within each tab (list → detail → create)

### Pull-to-Refresh
- Available on: Dashboard, Bills, Complaints, Polls, Announcements, Notifications, Approvals, Reimbursements, Documents, Resident Directory

### Loading States
- Full-screen loading spinner for initial data loads
- Button loading indicators during API calls
- Activity indicator during payment processing

### Empty States
- Illustrated empty states with icon, title, and subtitle for every empty list

### Error Handling
- Inline error messages on forms
- Alert dialogs for API errors (with specific server error messages)
- Graceful silent failures for non-critical background fetches

### Push Notification Deep Linking
- Tapping any push notification routes the user to the exact detail screen for that entity (Bill, Complaint, Poll, Reimbursement, Announcement)
- Works even when the app is in the background

### Focus-Aware Data Sync
- All screens automatically refetch data whenever the user navigates back to them (using `useFocusEffect`)
- Ensures the user always sees the latest state after making changes in a detail view

### Multi-Society Support
- Complete data isolation between different societies
- Each user can only see data for their own society

### Payment Integration (Razorpay)
- Native Razorpay SDK integration for card, UPI, net banking, and wallet payments
- 3-stage payment flow: Order Creation → Native Checkout → Signature Verification
- Retry logic for verification (up to 4 attempts with exponential backoff)
- Handles user cancellation gracefully (no error shown for cancelled payments)

### UPI Deep Linking
- Admin can initiate UPI payments for reimbursements directly from the app
- Opens native UPI apps (PhonePe, GPay, Paytm, etc.) pre-filled with payee UPI ID and amount

### PDF & File Management
- Download payment receipts as PDFs (opened in system browser)
- Upload payment screenshots (image gallery picker)
- Attach images or PDFs to announcements (multi-part upload)
- Upload documents to the society repository (PDF/image)

### Theme & Design System
- Dark navy theme (`#0F0F1A` background, `#1A1A2E` cards)
- Brand color: `#7C4DFF` (Deep Purple)
- Consistent card radius (16–24px), spacing, and typography
- Status badges: color-coded (green = paid/resolved, red = overdue/open, amber = pending/in-progress)
- Priority badges, role badges, resident type chips throughout

---

*Generated from source analysis of the SocietyHub React Native (Expo) mobile application. All features verified against screen code.*
