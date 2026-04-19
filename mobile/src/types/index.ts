// ── User & Authentication ──

/**
 * Categorization of society residents based on their occupancy and ownership status.
 * Used for role-based permissions and flat management logic.
 */
export type ResidentType = 'owner' | 'owner_family' | 'renter' | 'renter_family';

/**
 * Core User Profile:
 * Represents both Residents and Admins with their administrative and physical location data.
 */
export interface User {
  // Unique database identifier for the user
  id: string;
  // Full legal name of the resident or admin
  name: string;
  // Official email address for authentication and alerts
  email: string;
  // Contact phone number (optional)
  phone?: string;
  // Role-based access control discriminator (resident or admin)
  role: 'resident' | 'admin';
  // Physical location mapping: link to the flat entity
  flat_id?: string;
  // Link to the specific society organization
  society_id?: string;
  // The nature of their residency (Owner/Tenant)
  resident_type?: ResidentType;
  // Flag indicating if the user has been verified by the system
  is_approved: boolean; 
  // Flag indicating if the admin has reviewed their KYC/flat proof
  is_approved_by_admin: boolean; 
  // Final composite flag for full application feature access
  is_fully_approved: boolean; 
  // Government-issued ID (optional, used for KYC)
  aadhar_number?: string;
  // Tax identity number (optional)
  pan_number?: string;
  // Human-readable flat identifier (e.g. "101")
  flat_number?: string;
  // Building block or wing identifier (e.g. "A")
  block?: string;
  // Vertical floor level
  floor?: string;
  // Financial metadata for reimbursement settlements (UPI/Account)
  payment_address?: string;
  // ISO timestamp of registration
  created_at: string;
}

/**
 * Payload for the standard OAuth2 password login flow.
 * Note: Sent as x-www-form-urlencoded in the API layer.
 */
export interface LoginRequest {
  // Map to the 'username' field required by multipart/form-data for OAuth2
  username: string; 
  // Plaintext password for transit
  password: string;
}

/**
 * Response structure for successful authentication.
 * contains the bearer token for subsequent headers.
 */
export interface TokenResponse {
  // The actual JWT string
  access_token: string;
  // Usually "Bearer"
  token_type: string;
}

/**
 * Request structure for registering a new user account.
 * Basic profile info required for initial identity creation.
 */
export interface RegisterRequest {
  // Full name
  name: string;
  // Email address
  email: string;
  // Contact phone
  phone?: string;
  // Desired password
  password: string;
}

/**
 * Partial update object for refining user profile details.
 * Used in the profile settings screen.
 */
export interface UserUpdate {
  // New name
  name?: string;
  // New phone
  phone?: string;
  // Updated reimbursement destination
  payment_address?: string;
}

/**
 * Security request for revolving user passwords.
 * Requires verification of existing credentials.
 */
export interface ChangePasswordRequest {
  // Current known password
  old_password: string;
  // New desired password
  new_password: string;
}

// ── Physical Structure: Flat ──

/**
 * Represents a physical real estate unit within a society.
 * Used for mapping residents to their homes.
 */
export interface Flat {
  // Unique unit ID
  id: string;
  // Number identifier (e.g. "402")
  flat_number: string;
  // Block or Wing name (e.g. "Wing B")
  block: string;
  // Floor number
  floor: string;
}

// ── Financial Domain: Billing ──

/**
 * Categories of financial obligations.
 * 'maintenance' for recurring dues, 'extra' for special projects or penalties.
 */
export type BillType = 'maintenance' | 'extra';

/**
 * Current lifecycle state of a user's obligation.
 * Tracks compliance and overdue status.
 */
export type PaymentStatus = 'paid' | 'due' | 'overdue' | 'overdue_paid';

/**
 * Represents a society-wide billing cycle (e.g., Monthly Maintenance).
 * Contains common details applied to all residents.
 */
export interface Bill {
  // Unique cycle ID
  id: string;
  // Title of the bill (e.g. "Jan 2024 Maintenance")
  title: string;
  // Detailed breakdown or notes
  description?: string;
  // The type of charge
  bill_type: BillType;
  // Base amount for the cycle
  amount: number;
  // Deadline for payment
  due_date: string;
  // ID of the admin who created the bill
  created_by: string;
  // ISO timestamp of generation
  created_at: string;
  // Injected status determined by the user's payment history (virtual field)
  payment_status?: PaymentStatus;
  // Human-readable name of the creator
  creator_name?: string;
  // Flag to enable/disable the bill cycle
  is_active: boolean;
}

/**
 * Represents an individual payment transaction against a Bill.
 * Logs the actual money movement.
 */
export interface BillPayment {
  // Unique receipt ID
  id: string;
  // Link to the parent bill cycle
  bill_id: string;
  // Link to the payer
  user_id: string;
  // Actual amount transferred
  amount: number;
  // Method used (Cash, Razorpay, etc.)
  payment_method?: string;
  // External gateway transaction hash
  transaction_ref?: string;
  // Storage path for visualizing the physical receipt image/file
  receipt_path?: string;
  // ISO timestamp of clearance
  paid_at: string;
}

/**
 * Administrative view: summarizes the payment status of a specific resident for a bill.
 * Used in the admin audit screens.
 */
export interface BillResidentStatus {
  // Payer ID
  user_id: string;
  // Payer Name
  name: string;
  // Payer Flat label
  flat: string;
  // Binary status for quick filtering
  status: 'paid' | 'due';
  // Precise time of payment
  paid_at?: string;
  // Personal amount (might differ due to overrides)
  amount?: number;
}

/**
 * Model for handling non-standard charges for specific flats.
 * Allows charging different rates for shops, penthouses, etc.
 */
export interface FlatAmountOverride {
  // Target unit
  flat_id: string;
  // Specific amount to charge instead of the base rate
  amount: number;
}

/**
 * Request payload for admins to initialize a new billing cycle.
 * Full configuration for a bill blast.
 */
export interface BillCreate {
  // Broad title
  title: string;
  // Optional breakdown
  description?: string;
  // Classification
  bill_type: BillType;
  // Global base price
  amount: number;
  // Deadline
  due_date: string;
  // Optional specific pricing for unique flats in this cycle
  flat_overrides?: FlatAmountOverride[];
}

/**
 * Request payload for a user to settle a bill.
 * Used when performing manual payments or logging gateway successes.
 */
export interface PayBillRequest {
  // Target cycle
  bill_id: string;
  // Amount paid
  amount: number;
  // Method identifier
  payment_method?: string;
  // Reference for auditing
  transaction_ref?: string;
}

// ── Operational: Complaints ──

/**
 * Lifecycle stages of a service request.
 * 'resolved' indicates final closure.
 */
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

/**
 * Categorization for routing and analysis.
 * Helps in assigning tickets to specific vendors/staff.
 */
export type ComplaintCategory = 'plumbing' | 'electrical' | 'cleaning' | 'security' | 'noise' | 'parking' | 'other' | 'lift' | 'water supply';

/**
 * Represents a resident-initiated service request.
 * Core unit of the society's helpdesk system.
 */
export interface Complaint {
  // Ticket ID
  id: string;
  // Originating user
  user_id: string;
  // Subject area
  category: ComplaintCategory;
  // Short summary
  title: string;
  // Full detail of the issue
  description: string;
  // Current resolution stage
  status: ComplaintStatus;
  // Cloud URLs to uploaded evidence photos
  images?: string[];
  // Internal workspace for committee discussion
  admin_notes?: string;
  // ISO timestamp of creation
  created_at: string;
  // ISO timestamp of last modification
  updated_at: string;
}

/**
 * Request payload for submitting a new grievance.
 * Minimal required data to start a ticket.
 */
export interface ComplaintCreate {
  // Selection from enum
  category: ComplaintCategory;
  // Headline
  title: string;
  // Detailed text
  description: string;
}

/**
 * Threaded discourse within a complaint context.
 * Allows residents and admins to collaborate on a resolution.
 */
export interface ComplaintComment {
  // Unique comment ID
  id: string;
  // Target ticket
  complaint_id: string;
  // Author ID
  user_id: string;
  // Author name mirror for performance
  user_name?: string;
  // Author role mirror
  user_role?: string;
  // Actual message content
  message: string;
  // Posting timestamp
  created_at: string;
}

// ── Engagement: Polls ──

/**
 * Choice within a poll.
 * Stores the option text and aggregated results.
 */
export interface PollOption {
  // Option ID
  id: string;
  // Display text (e.g. "Yes", "No")
  text: string;
  // Current number of votes received
  vote_count: number;
}

/**
 * Represents a community-wide vote or opinion gathering exercise.
 * Drives democratic participation in the society.
 */
export interface Poll {
  // Unique poll ID
  id: string;
  // Survey title
  title: string;
  // Detailed context or reasoning
  description?: string;
  // Author ID
  created_by: string;
  // ISO date by which votes must be cast
  deadline: string;
  // Flag indicating if the poll is taking votes
  is_active: boolean;
  // Initialization timestamp
  created_at: string;
  // List of possible choices
  options: PollOption[];
  // Virtual status check for the viewing user's eligibility
  user_voted?: boolean;
}

/**
 * Request payload for starting a community vote.
 * Used by admins to blast out a survey.
 */
export interface PollCreate {
  // Survey subject
  title: string;
  // Clarification
  description?: string;
  // Expiry date
  deadline: string;
  // Set of choices
  options: { text: string }[];
}

// ── Financial: Reimbursements ──

/**
 * Administrative workflow states for personal expense claims.
 * Tracks money from submission to final bank transfer.
 */
export type ReimbursementStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

/**
 * Reasoning for the expense.
 * Categorized for financial auditing.
 */
export type ReimbursementCategory = 'plumbing' | 'electrical' | 'cleaning' | 'maintenance' | 'event' | 'other';

/**
 * Represents a claim submitted by a user for personal funds spent on society matters.
 * Bridges the gap between resident spending and society ledger.
 */
export interface ReimbursementRequest {
  // Unique claim ID
  id: string;
  // The resident who spent the money
  user_id: string;
  // Brief title of the expense
  title: string;
  // Deep detail or justification
  description: string;
  // Total money requested (gross amount)
  amount: number; 
  // Actual amount the committee agreed to payout (net amount)
  approved_amount?: number; 
  // When the physical spending occurred
  expense_date: string;
  // Classification
  category: ReimbursementCategory;
  // Path for evidentiary receipt document
  receipt_path?: string; 
  // Path for settlement confirmation (e.g. payout bank receipt)
  payment_proof_path?: string; 
  // Current workflow state
  status: ReimbursementStatus;
  // Feedback from the reviewer
  admin_notes?: string;
  // Admin who performed the review
  reviewed_by?: string;
  // Destination for the payoff (Mirror from User if not provided)
  payment_address?: string;
  // Creation time
  created_at: string;
  // Change tracking
  updated_at: string;
}

/**
 * Request payload for initiating a claim.
 * core data required for a committee to begin review.
 */
export interface ReimbursementCreate {
  // Headline
  title: string;
  // Description
  description: string;
  // Claim amount
  amount: number;
  // Spend date
  expense_date: string;
  // Category selection
  category: ReimbursementCategory;
}

// ── Communication: Notifications ──

/**
 * Trigger source for the notification.
 * Maps to specific routing and icons in the UI.
 */
export type NotificationType = 'bill' | 'payment_reminder' | 'complaint' | 'poll' | 'reimbursement' | 'general';

/**
 * represents a personalized alert delivery to an individual user.
 * Supports deep-linking to specific entities.
 */
export interface Notification {
  // Alert ID
  id: string;
  // Target delivery user
  user_id: string;
  // Title for push surface
  title: string;
  // Detailed message body
  body: string;
  // Type discriminator
  notification_type: NotificationType;
  // ID of the linked context object (Bill ID, Ticket ID, etc.) for navigation
  reference_id?: string;
  // Binary read status
  is_read: boolean;
  // Delivery timestamp
  created_at: string;
}

// ── Communication: Announcements ──

/**
 * Visual weighting for announcements.
 * 'urgent' usually triggers extra UI emphasis.
 */
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

/**
 * Official society-wide broadcasts.
 * Used for general news, events, or critical instructions.
 */
export interface Announcement {
  // News item ID
  id: string;
  // Broadcast headline
  title: string;
  // Detailed text body
  body: string;
  // Priority level for UI styling
  priority: AnnouncementPriority;
  // Sticky status: keeps the item at the top of the feed
  pinned: boolean; 
  // Optional cloud URL for a PDF or Image attachment
  attachment_url?: string;
  // MIME type hint for handles
  attachment_type?: string;
  // Author admin ID
  created_by: string;
  // Author name for faster display
  creator_name?: string;
  // ISO timestamp of blast
  created_at: string;
}

/**
 * Request payload for blasting a new notice.
 * Administrative input for a society-wide alert.
 */
export interface AnnouncementCreate {
  // Headline
  title: string;
  // Body text
  body: string;
  // Priority hint
  priority?: AnnouncementPriority;
  // Pinned toggle
  pinned?: boolean;
}

// ── Directory & Community Management ──

/**
 * Flat summary of resident information for the public/admin directory.
 * Useful for building phonebooks or search indexes.
 */
export interface ResidentInfo {
  // Identity link
  id: string;
  // Display name
  name: string;
  // Primary email
  email: string;
  // Verified phone
  phone?: string;
  // System role
  role: string;
  // Link to residence
  flat_id?: string;
  // Human label (e.g. "B-102")
  flat_number?: string;
  // Block label
  block?: string;
  // level label
  floor?: string;
  // Flag for committee membership
  is_committee?: boolean;
  // Official title (e.g. "Chairman")
  committee_role?: string;
}

/**
 * High-level occupancy metrics.
 * Used for administrative planning and reporting.
 */
export interface ResidentStats {
  // Unique verified citizens
  total_residents: number;
  // Capacity inventory
  total_flats: number;
  // Living space in use
  occupied_flats: number;
  // Available inventory
  vacant_flats: number;
}

// ── Administrative Tracking: Society Expenses ──

/**
 * Represents an expense incurred by the society itself (e.g., electricity bill for hallways).
 * Key for calculating the maintenance base rates.
 */
export interface SocietyExpense {
  // Unique expense ID
  id: string;
  // Title of the purchase
  title: string;
  // Breakdown
  description?: string;
  // Total cost
  amount: number;
  // When money was spent
  expense_date: string;
  // Proof of purchase link
  document_url?: string;
  // Admin who logged it
  created_by: string;
  // logging timestamp
  created_at: string;
}

/**
 * Input for logging a society expense.
 * Multi-part submission structure.
 */
export interface SocietyExpenseCreate {
  // Subject
  title: string;
  // Context
  description?: string;
  // Total cost
  amount: number;
  // Date
  expense_date: string;
  // Multi-part file blob (Voucher/Bill)
  document?: any; 
}

// ── Macro Analytics: Dashboard ──

/**
 * Aggregated KPIs for the executive landing pages.
 * Pre-calculated on the backend for heavy performance.
 */
export interface DashboardStats {
  // Financial metrics
  billing: {
    total_bills: number;
    total_amount: number;
    total_collected: number;
    collection_rate: number;
    overdue_bills: number;
    my_paid: number;
    my_bills_count: number;
    my_paid_count: number;
  };
  // Issue tracking metrics
  complaints: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    resolution_rate: number;
  };
  // Democracy engagement metrics
  polls: {
    total: number;
    active: number;
    total_votes: number;
  };
  // Recovery metrics
  reimbursements: {
    total: number;
    pending: number;
    approved_amount: number;
  };
  // Demographic metrics
  community: {
    total_residents: number;
    total_flats: number;
  };
}

// ── Society Metadata ──

/**
 * Arbitrary key-value information about the society (e.g., 'Registration Number').
 * Allows organizations to store unique metadata.
 */
export interface SocietyInfoItem {
  // Property name
  key: string;
  // Property value
  value: string;
}

/**
 * Critical contact list for residents.
 * Used for building the emergency screen.
 */
export interface EmergencyContact {
  // Unique contact record ID
  id: string;
  // Contact name (e.g. "Main Gate Security")
  name: string;
  // Telephone string
  phone: string;
  // Role context (e.g. "Security", "Plumber")
  role: string;
  // Timestamp
  created_at: string;
}

// ── Multi-Tenancy: Societies ──

/**
 * Represents the top-level society organization in the multi-tenant system.
 * Identifies independent communities.
 */
export interface Society {
  // Global ID
  id: string;
  // Official registered name
  name: string;
  // Physical address
  address?: string;
  // Creation time
  created_at: string;
}

/**
 * Overview of flat assignments for a society.
 * Mapping of space to humans.
 */
export interface SocietyFlatSummary {
  // Unit link
  id: string;
  // House number
  flat_number: string;
  // Section name
  block: string;
  // level
  floor: string;
  // Reference to the primary owner account (nullable if vacant)
  owner_user_id?: string | null;
}

/**
 * DTO for the flat structure during initial society creation.
 * blueprint for seeding house inventory.
 */
export interface CreateSocietyFlat {
  // label
  flat_number: string;
  // block
  block: string;
  // level
  floor: string;
}

/**
 * Comprehensive request for onboarding a new society into the system.
 * Seed data for an entire organization.
 */
export interface CreateSocietyRequest {
  // Display name
  society_name: string;
  // Full address
  society_address?: string;
  // List of all physical units to be generated
  flats: CreateSocietyFlat[];
}

// ── Administrative Queue: User Approvals ──

/**
 * Represents a user profile that is currently in the verification pipeline.
 * Used by admin to review KYC documents before permitting app access.
 */
export interface PendingUser {
  // Identity link
  id: string;
  // Display name
  name: string;
  // Primary email
  email: string;
  // Verified phone
  phone?: string;
  // Occupation claim
  resident_type?: ResidentType;
  // Unit number claim
  flat_number?: string;
  // Block claim
  block?: string;
  // Level claim
  floor?: string;
  // Application time
  created_at: string;
}

// ── Official Repository: Society Documents ──

/**
 * Represents a communal document (e.g., Bye-laws, Audit reports).
 * Central binary archive for the society.
 */
export interface SocietyDocument {
  // Document ID
  id: string;
  // Title for display
  title: string;
  // Detailed explanation
  description?: string;
  // Direct link to static storage
  file_url: string;
  // File classification
  file_type: 'pdf' | 'image';
  // Admin approval status
  is_approved: boolean;
  // Author admin ID
  uploaded_by: string;
  // Author name for faster lookup
  uploader_name?: string;
  // Reviewer admin ID
  approved_by?: string;
  // Date of archive
  created_at: string;
}
