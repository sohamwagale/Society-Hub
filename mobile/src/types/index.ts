// ── User & Auth ──
export type ResidentType = 'owner' | 'owner_family' | 'renter' | 'renter_family';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'resident' | 'admin';
  flat_id?: string;
  society_id?: string;
  resident_type?: ResidentType;
  is_approved: boolean;
  is_approved_by_admin: boolean;
  is_fully_approved: boolean;
  aadhar_number?: string;
  pan_number?: string;
  flat_number?: string;
  block?: string;
  floor?: string;
  payment_address?: string;
  created_at: string;
}

export interface LoginRequest {
  username: string; // OAuth2 form field
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface UserUpdate {
  name?: string;
  phone?: string;
  payment_address?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ── Flat ──
export interface Flat {
  id: string;
  flat_number: string;
  block: string;
  floor: string;
}

// ── Billing ──
export type BillType = 'maintenance' | 'extra';
export type PaymentStatus = 'paid' | 'due' | 'overdue' | 'overdue_paid';

export interface Bill {
  id: string;
  title: string;
  description?: string;
  bill_type: BillType;
  amount: number;
  due_date: string;
  created_by: string;
  created_at: string;
  payment_status?: PaymentStatus;
  creator_name?: string;
  is_active: boolean;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  payment_method?: string;
  transaction_ref?: string;
  receipt_path?: string;
  paid_at: string;
}

export interface BillResidentStatus {
  user_id: string;
  name: string;
  flat: string;
  status: 'paid' | 'due';
  paid_at?: string;
  amount?: number;
}

export interface FlatAmountOverride {
  flat_id: string;
  amount: number;
}

export interface BillCreate {
  title: string;
  description?: string;
  bill_type: BillType;
  amount: number;
  due_date: string;
  flat_overrides?: FlatAmountOverride[];
}

export interface PayBillRequest {
  bill_id: string;
  amount: number;
  payment_method?: string;
  transaction_ref?: string;
}

// ── Complaints ──
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';
export type ComplaintCategory = 'plumbing' | 'electrical' | 'cleaning' | 'security' | 'noise' | 'parking' | 'other' | 'lift' | 'water supply';

export interface Complaint {
  id: string;
  user_id: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  status: ComplaintStatus;
  images?: string[];
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintCreate {
  category: ComplaintCategory;
  title: string;
  description: string;
}

// ── Complaint Comments (V2) ──
export interface ComplaintComment {
  id: string;
  complaint_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  message: string;
  created_at: string;
}

// ── Polls ──
export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  deadline: string;
  is_active: boolean;
  created_at: string;
  options: PollOption[];
  user_voted?: boolean;
}

export interface PollCreate {
  title: string;
  description?: string;
  deadline: string;
  options: { text: string }[];
}

// ── Reimbursements ──
export type ReimbursementStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
export type ReimbursementCategory = 'plumbing' | 'electrical' | 'cleaning' | 'maintenance' | 'event' | 'other';

export interface ReimbursementRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount: number;
  approved_amount?: number;
  expense_date: string;
  category: ReimbursementCategory;
  receipt_path?: string;
  payment_proof_path?: string;
  status: ReimbursementStatus;
  admin_notes?: string;
  reviewed_by?: string;
  payment_address?: string;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementCreate {
  title: string;
  description: string;
  amount: number;
  expense_date: string;
  category: ReimbursementCategory;
}

// ── Notifications ──
export type NotificationType = 'bill' | 'payment_reminder' | 'complaint' | 'poll' | 'reimbursement' | 'general';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: NotificationType;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

// ── Announcements (V2) ──
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  attachment_url?: string;
  attachment_type?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
}

export interface AnnouncementCreate {
  title: string;
  body: string;
  priority?: AnnouncementPriority;
  pinned?: boolean;
}

// ── Resident Directory (V2) ──
export interface ResidentInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  flat_id?: string;
  flat_number?: string;
  block?: string;
  floor?: string;
  is_committee?: boolean;
  committee_role?: string;
}

export interface ResidentStats {
  total_residents: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
}

// ── Dashboard Stats (V2) ──
export interface SocietyExpense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  expense_date: string;
  document_url?: string;
  created_by: string;
  created_at: string;
}

export interface SocietyExpenseCreate {
  title: string;
  description?: string;
  amount: number;
  expense_date: string;
  document?: any; // UploadFile/Buffer mapped properly
}

export interface DashboardStats {
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
  complaints: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    resolution_rate: number;
  };
  polls: {
    total: number;
    active: number;
    total_votes: number;
  };
  reimbursements: {
    total: number;
    pending: number;
    approved_amount: number;
  };
  community: {
    total_residents: number;
    total_flats: number;
  };
}

// ── Society Info (V2) ──
export interface SocietyInfoItem {
  key: string;
  value: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  created_at: string;
}

// ── Societies & Onboarding (V2) ──
export interface Society {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface SocietyFlatSummary {
  id: string;
  flat_number: string;
  block: string;
  floor: string;
  owner_user_id?: string | null;
}

// ── Create Society ──
export interface CreateSocietyFlat {
  flat_number: string;
  block: string;
  floor: string;
}

export interface CreateSocietyRequest {
  society_name: string;
  society_address?: string;
  flats: CreateSocietyFlat[];
}

// ── Pending User (for approval) ──
export interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  resident_type?: ResidentType;
  flat_number?: string;
  block?: string;
  floor?: string;
  created_at: string;
}

// ── Society Documents ──
export interface SocietyDocument {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: 'pdf' | 'image';
  is_approved: boolean;
  uploaded_by: string;
  uploader_name?: string;
  approved_by?: string;
  created_at: string;
}
