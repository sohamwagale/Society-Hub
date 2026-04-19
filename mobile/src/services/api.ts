// Import axios for performing asynchronous HTTP requests to the backend
import axios from 'axios';
// Import all domain interfaces from the centralized types repository for type safety
import {
  TokenResponse, User, Bill, BillCreate, BillPayment, PayBillRequest,
  Complaint, ComplaintCreate, ComplaintComment, Poll, PollCreate,
  ReimbursementRequest, ReimbursementCreate, Notification, Flat,
  Announcement, AnnouncementCreate, ResidentInfo, ResidentStats,
  DashboardStats, SocietyInfoItem, EmergencyContact,
  UserUpdate, ChangePasswordRequest, RegisterRequest,
  Society, SocietyFlatSummary, CreateSocietyRequest, PendingUser,
  SocietyExpense, SocietyExpenseCreate, SocietyDocument
} from '../types';

// ── 1. Secure Token Vault ──
// In-memory cache for the JWT to avoid constant filesystem hits and improve performance
let _token: string | null = null;

/**
 * tokenStorage:
 * Bridges the gap between in-memory state and the device's secure hardware enclave.
 * Uses expo-secure-store for encrypted persistence of sensitive credentials.
 */
const tokenStorage = {
  /**
   * Retrieves the access token from persistent secure storage or memory.
   */
  get: async (): Promise<string | null> => {
    // Check if we already have it in the local variable for speed
    if (_token) return _token;
    try {
      // Lazy-load SecureStore to improve initial application boot time
      const SecureStore = require('expo-secure-store');
      // Await retrieval from the encrypted disk partition
      _token = await SecureStore.getItemAsync('access_token');
      // Return the found token or null
      return _token;
    } catch {
      // Return null if retrieval fails (usually on first run)
      return _token;
    }
  },
  /**
   * Commits a newly acquired token to the secure vault and memory.
   */
  set: async (token: string) => {
    // Update local variable
    _token = token;
    try {
      // Lazy-load to maintain modularity
      const SecureStore = require('expo-secure-store');
      // Encrypt and save to disk
      await SecureStore.setItemAsync('access_token', token);
    } catch { } // Silently fail on storage errors
  },
  /**
   * Purges the token during logout or authentication failure sequences.
   */
  remove: async () => {
    // Clear memory
    _token = null;
    try {
      // Lazy-load for consistency
      const SecureStore = require('expo-secure-store');
      // Remove from the secure enclave
      await SecureStore.deleteItemAsync('access_token');
    } catch { } // Silently fail on purge errors
  },
};

// ── 2. Networking Configuration ──
// LOCAL_URL: Used for local physical device debugging over the same WiFi network.
const LOCAL_URL = 'http://192.168.1.5:8000/api';
// NGROK_URL: Primary production/beta endpoint hosted on AWS EC2 via proxy.
const NGROK_URL = 'http://13.126.10.73:8000/api'; 

// Final endpoint resolution — currently targeting the cloud environment
const BASE_URL = NGROK_URL;

/**
 * Axios Instance Configuration:
 * Sets a 15-second timeout and injects a mandatory header to bypass ngrok landing pages in production.
 */
const api = axios.create({
  // The root path for all subsequent relative calls
  baseURL: BASE_URL,
  // Abandon request after 15s to keep UI responsive
  timeout: 15000,
  // Required to prevent the ngrok 'browser warning' from breaking JSON responses
  headers: { 'ngrok-skip-browser-warning': '1' },
});

// Create an alias for public endpoints that might not require tokens later
export const publicApi = api;

// ── 3. Traffic Interceptors ──

/**
 * Request Interceptor:
 * Automatically injects the Bearer JWT from tokenStorage into every outgoing packet.
 */
api.interceptors.request.use(async (config) => {
  // Pull the current token (disk or memory)
  const token = await tokenStorage.get();
  // If present, add the standard Authorization header
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Continue with the request
  return config;
});

/**
 * Response Interceptor:
 * Centrally traps 401 Unauthorized errors to trigger absolute session purge on the device.
 */
api.interceptors.response.use(
  // Pass successful responses through untouched
  (response) => response,
  async (error) => {
    // Check for authorization failures at the header level
    if (error.response?.status === 401) {
      // Credentials have expired or been revoked — wipe local identity
      await tokenStorage.remove();
    }
    // Forward the error to the calling function for UI-level handling
    return Promise.reject(error);
  }
);


// ── 4. Authentication Services ──

export const authAPI = {
  /**
   * Authenticates user via email/password. 
   * Note: Uses x-www-form-urlencoded to comply with the backend's OAuth2PasswordRequestForm standard.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
    // Serialize credentials into a safe form body
    const formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    // Submit login POST to the server
    const { data } = await api.post<TokenResponse>('/auth/login', formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // Persist the resulting access token for future calls
    await tokenStorage.set(data.access_token);
    // Return the full token object (includes type, user profile, etc.)
    return data;
  },
  /**
   * Submits a new user registration payload.
   */
  register: async (req: RegisterRequest): Promise<User> => {
    // Push the raw JSON request to the registration endpoint
    const { data } = await api.post<User>('/auth/register', req);
    // Return the newly created user profile
    return data;
  },
  /**
   * Performs an identity check for the current token.
   */
  getMe: async (): Promise<User> => {
    // Fetch the caller's specific record from the backend
    const { data } = await api.get<User>('/auth/me');
    // Return the profile object
    return data;
  },
  /**
   * Updates basic user metadata fields.
   */
  updateProfile: async (updates: UserUpdate): Promise<User> => {
    // Partially update the user record using PATCH
    const { data } = await api.patch<User>('/auth/me', updates);
    // Return the updated profile
    return data;
  },
  /**
   * Securely rotates user passwords.
   */
  changePassword: async (req: ChangePasswordRequest): Promise<{ message: string }> => {
    // Submit the old/new credential pair for validation and update
    const { data } = await api.post<{ message: string }>('/auth/change-password', req);
    // Return success/error message
    return data;
  },
  /**
   * Client-side session termination tool.
   */
  logout: async () => {
    // Wipe all tokens from disk and memory
    await tokenStorage.remove();
  },
  /**
   * Registers a hardware push token for Firebase/Expo alerts.
   */
  registerPushToken: async (token: string): Promise<void> => {
    // Send the unique device token to the server's notification router
    await api.post('/auth/push-token', { token });
  },
};


// ── 5. Billing & Payment Logistics ──

export const billsAPI = {
  /**
   * Lists bills with optional filter for type (Maintenance/Extra) and status.
   */
  list: async (billType?: string, activeOnly?: boolean): Promise<Bill[]> => {
    // Initialize dynamic parameter container
    const params: any = {};
    // Apply filters if provided
    if (billType) params.bill_type = billType;
    if (activeOnly !== undefined) params.active_only = activeOnly;
    // Execute GET with query parameters
    const { data } = await api.get<Bill[]>('/bills', { params });
    // Return the array of bill objects
    return data;
  },
  /**
   * Fetches full metadata for a specific bill unit.
   */
  get: async (id: string): Promise<Bill> => {
    // Execute resource-specific GET
    const { data } = await api.get<Bill>(`/bills/${id}`);
    // Return the detailed bill record
    return data;
  },
  /**
   * Admin-only: Lists detailed payment compliance for all residents associated with a bill.
   */
  getResidentStatus: async (id: string): Promise<{ user_id: string; name: string; flat: string; status: 'paid' | 'due'; paid_at?: string }[]> => {
    // Fetch the audit report for this billing cycle
    const { data } = await api.get<{ user_id: string; name: string; flat: string; status: 'paid' | 'due'; paid_at?: string }[]>(`/bills/${id}/residents`);
    // Return the compliance list
    return data;
  },
  /**
   * Admin-only: Creates and broadcasts a new billing cycle to the society.
   */
  create: async (bill: BillCreate): Promise<Bill> => {
    // Post the new bill configuration
    const { data } = await api.post<Bill>('/bills', bill);
    // Return the generated bill record
    return data;
  },
  /**
   * Records a manual payment (Cash/Cheque) or handles simple transaction logging.
   */
  pay: async (payment: PayBillRequest): Promise<BillPayment> => {
    // Submit the payment record for verification
    const { data } = await api.post<BillPayment>('/bills/pay', payment);
    // Return the payment receipt record
    return data;
  },
  /**
   * Retrieves the historical financial ledger for the current user.
   */
  paymentHistory: async (): Promise<BillPayment[]> => {
    // Fetch all personal payments from the vault
    const { data } = await api.get<BillPayment[]>('/bills/payments/history');
    // Return the transaction history
    return data;
  },
  /**
   * Admin-only: Updates existing bill parameters (Amount, Due Date).
   */
  update: async (id: string, updates: { title?: string; description?: string; bill_type?: string; amount?: number; due_date?: string; is_active?: boolean }): Promise<Bill> => {
    // Use PUT for full resource update
    const { data } = await api.put<Bill>(`/bills/${id}`, updates);
    // Return updated record
    return data;
  },
  /**
   * Admin-only: Permanently deletes a bill and cascades its payment records.
   */
  delete: async (id: string): Promise<void> => {
    // Resource deletion call
    await api.delete(`/bills/${id}`);
  },
  /**
   * Transmits a binary image of a physical payment receipt to the cloud.
   */
  uploadReceipt: async (paymentId: string, uri: string): Promise<{ receipt_path: string }> => {
    // Initialize multipart form for binary data
    const formData = new FormData();
    // Wrap the image into a compatible native object
    formData.append('file', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    // Submit to the specific payment's storage endpoint
    const { data } = await api.post(`/bills/${paymentId}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return the final path in cloud storage
    return data;
  },
  /**
   * Generates a viewable URL for a receipt including a short-lived auth token.
   */
  getReceiptUrl: async (paymentId: string): Promise<string> => {
    // Get the caller's auth context
    const token = await tokenStorage.get();
    // Concatenate the URL with the token to bypass cross-origin browser issues
    return `${BASE_URL}/bills/${paymentId}/receipt?token=${encodeURIComponent(token || '')}`;
  },
  /**
   * Generates a link to the society-wide financial PDF report.
   */
  getExportReportUrl: async (): Promise<string> => {
    // Identify the admin
    const token = await tokenStorage.get();
    // Build the secure link for report download
    return `${BASE_URL}/bills/export-report?token=${encodeURIComponent(token || '')}`;
  },
  /**
   * Initializes a transaction with Razorpay to receive a secure order ID.
   */
  createRazorpayOrder: async (billId: string): Promise<{
    razorpay_order_id: string; amount: number; amount_paise: number;
    currency: string; key_id: string;
  }> => {
    // Request a session for this specific bill
    const { data } = await api.post(`/bills/${billId}/create-razorpay-order`);
    // Return gateway credentials
    return data;
  },
  /**
   * Submits proof of payment from the Razorpay SDK for server-side HMAC validation.
   */
  verifyRazorpayPayment: async (billId: string, payload: {
    razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
  }): Promise<BillPayment> => {
    // Submit the signature for cryptography verification
    const { data } = await api.post<BillPayment>(`/bills/${billId}/verify-razorpay-payment`, payload);
    // Return the verified receipt
    return data;
  },
};


// ── 6. Society Administrative Expenses ──

export const expensesAPI = {
  /**
   * Retrieves a list of official society-level expenditures.
   */
  list: async (sortBy = 'date_desc'): Promise<SocietyExpense[]> => {
    // Fetch the expense list with requested ordering
    const { data } = await api.get<SocietyExpense[]>('/expenses/', { params: { sort_by: sortBy } });
    // Return logs
    return data;
  },
  /**
   * Metadata for a singular expense item.
   */
  get: async (id: string): Promise<SocietyExpense> => {
    // Detail lookup
    const { data } = await api.get<SocietyExpense>(`/expenses/${id}`);
    // Return object
    return data;
  },
  /**
   * Logs a new administrative expense with an optional physical voucher file.
   */
  create: async (expense: SocietyExpenseCreate, documentUri?: string): Promise<SocietyExpense> => {
    // Build multipart container
    const formData = new FormData();
    // Add textual metadata
    formData.append('title', expense.title);
    formData.append('amount', String(expense.amount));
    formData.append('expense_date', expense.expense_date);
    if (expense.description) formData.append('description', expense.description);

    // If a voucher file is attached, determine its mime type and append
    if (documentUri) {
      const ext = documentUri.split('.').pop() || 'pdf';
      const type = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      formData.append('document', { uri: documentUri, name: `document.${ext}`, type } as any);
    }

    // Submit multipart payload to the cloud
    const { data } = await api.post<SocietyExpense>('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return successfully logged record
    return data;
  },
  /**
   * Helper utility to resolve absolute URLs for vouchers.
   */
  getDocumentUrl: (path: string): string => {
    // Bypass if already absolute (e.g. S3/Cloudfront)
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // Map relative backend path to the server's root
    return BASE_URL.replace('/api', '') + path;
  },
};


// ── 7. Repository: Society Documents ──

export const documentsAPI = {
  /**
   * Lists the official society document archive (Bylaws, Minutes, Certificates).
   */
  list: async (): Promise<SocietyDocument[]> => {
    // Global archive GET
    const { data } = await api.get<SocietyDocument[]>('/documents/');
    // Return list
    return data;
  },
  /**
   * Details for a specific document unit.
   */
  get: async (id: string): Promise<SocietyDocument> => {
    // Individual lookup
    const { data } = await api.get<SocietyDocument>(`/documents/${id}`);
    // Return record
    return data;
  },
  /**
   * Uploads a new document to the society repository using multipart.
   */
  upload: async (title: string, fileUri: string, description?: string): Promise<SocietyDocument> => {
    // Prepare form
    const formData = new FormData();
    // Textual fields
    formData.append('title', title);
    if (description) formData.append('description', description);

    // Resolve mime type for binary safety
    const ext = fileUri.split('.').pop()?.toLowerCase() || 'pdf';
    const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
      : 'application/pdf';
    // Append the blob
    formData.append('file', { uri: fileUri, name: `document.${ext}`, type } as any);

    // Submit the archive request
    const { data } = await api.post<SocietyDocument>('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return record
    return data;
  },
  /**
   * Admin-only: Finalizes a document upload, making it visible to all residents.
   */
  approve: async (id: string): Promise<SocietyDocument> => {
    // Update resolution state via PATCH
    const { data } = await api.patch<SocietyDocument>(`/documents/${id}/approve`);
    // Return record
    return data;
  },
  /**
   * Deletes a document record and its associated physical storage.
   */
  delete: async (id: string): Promise<void> => {
    // Removal call
    await api.delete(`/documents/${id}`);
  },
  /**
   * Resolves absolute static URLs for document downloads.
   */
  getFileUrl: (path: string): string => {
    // Map to the public static server root
    return BASE_URL.replace('/api', '') + path;
  },
};


// ── 8. Resident Collaboration: Complaints ──

export const complaintsAPI = {
  /**
   * Lists user-relevant service requests with status/category filtering.
   */
  list: async (status?: string, category?: string): Promise<Complaint[]> => {
    // Parameter container
    const params: any = {};
    if (status) params.status = status;
    if (category) params.category = category;
    // Execute filtered request
    const { data } = await api.get<Complaint[]>('/complaints/', { params });
    // Return feed
    return data;
  },
  /**
   * Retrieves the detailed resolution history of a specific complaint.
   */
  get: async (id: string): Promise<Complaint> => {
    // Detail lookup
    const { data } = await api.get<Complaint>(`/complaints/${id}`);
    // Return record
    return data;
  },
  /**
   * Starts a new resolution ticket for a resident grievance.
   */
  create: async (complaint: ComplaintCreate): Promise<Complaint> => {
    // Push the request to the committee queue
    const { data } = await api.post<Complaint>('/complaints/', complaint);
    // Return the ticket
    return data;
  },
  /**
   * Updates complaint state (Status) or records internal committee notes.
   */
  update: async (id: string, updates: { status?: string; admin_notes?: string }): Promise<Complaint> => {
    // Partial update call
    const { data } = await api.patch<Complaint>(`/complaints/${id}`, updates);
    // Return record
    return data;
  },
  /**
   * Retrieves the communicative history of a ticket thread.
   */
  listComments: async (id: string): Promise<ComplaintComment[]> => {
    // Fetch conversation logs
    const { data } = await api.get<ComplaintComment[]>(`/complaints/${id}/comments`);
    // Return thread
    return data;
  },
  /**
   * Adds a new message to the ticket's resolution thread.
   */
  addComment: async (id: string, message: string): Promise<ComplaintComment> => {
    // Post the message payload
    const { data } = await api.post<ComplaintComment>(`/complaints/${id}/comments`, { message });
    // Return the new comment record
    return data;
  },
  /**
   * Attaches an evidence photo to a complaint.
   */
  uploadImage: async (id: string, uri: string): Promise<{ image_path: string }> => {
    // Binary container
    const formData = new FormData();
    // Image wrapper
    formData.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
    // Submit multipart
    const { data } = await api.post(`/complaints/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return path
    return data;
  },
};


// ── 9. Democratic Process: Polls ──

export const pollsAPI = {
  /**
   * Syncs the latest community opinion surveys.
   */
  list: async (): Promise<Poll[]> => {
    // Pull the active surveys list
    const { data } = await api.get<Poll[]>('/polls/');
    // Return list
    return data;
  },
  /**
   * Metadata for a poll including real-time visual vote tallies.
   */
  get: async (id: string): Promise<Poll> => {
    // Detailed stats lookup
    const { data } = await api.get<Poll>(`/polls/${id}`);
    // Return survey
    return data;
  },
  /**
   * Admin-only: Launches a new society-wide survey unit.
   */
  create: async (poll: PollCreate): Promise<Poll> => {
    // POST definition
    const { data } = await api.post<Poll>('/polls/', poll);
    // Return record
    return data;
  },
  /**
   * Submits a resident's vote for a specific survey option.
   */
  vote: async (pollId: string, optionId: string): Promise<void> => {
    // Register the vote data point
    await api.post(`/polls/${pollId}/vote`, { option_id: optionId });
  },
  /**
   * Admin-only: Freezes a poll and stops all data collection.
   */
  close: async (pollId: string): Promise<void> => {
    // Update state to inactive
    await api.put(`/polls/${pollId}/close`);
  },
  /**
   * Permanent removal of a survey and its results.
   */
  delete: async (pollId: string): Promise<void> => {
    // Resource removal
    await api.delete(`/polls/${pollId}`);
  },
};


// ── 10. Financial Support: Reimbursements ──

export const reimbursementsAPI = {
  /**
   * Lists expense recovery claims for the current user.
   */
  list: async (): Promise<ReimbursementRequest[]> => {
    // Personal claim list GET
    const { data } = await api.get<ReimbursementRequest[]>('/reimbursements/');
    // Return feed
    return data;
  },
  /**
   * Retrieves fine-grained details for a specific claim.
   */
  get: async (id: string): Promise<ReimbursementRequest> => {
    // Detail lookup
    const { data } = await api.get<ReimbursementRequest>(`/reimbursements/${id}`);
    // Return record
    return data;
  },
  /**
   * Submits a new expense recovery request with justification.
   */
  create: async (req: ReimbursementCreate): Promise<ReimbursementRequest> => {
    // Create new claim unit
    const { data } = await api.post<ReimbursementRequest>('/reimbursements/', req);
    // Return record
    return data;
  },
  /**
   * Admin-only: Performs evaluation of a claim and sets final approved fund amount.
   */
  review: async (id: string, updates: { status?: string; approved_amount?: number; admin_notes?: string }): Promise<ReimbursementRequest> => {
    // Evaluative update via PATCH
    const { data } = await api.patch<ReimbursementRequest>(`/reimbursements/${id}`, updates);
    // Return decision record
    return data;
  },
  /**
   * Admin-only: Confirms the physical clearance of funds to the requester.
   */
  markPaid: async (id: string, payment: { amount: number; payment_method: string; transaction_ref?: string; payment_date: string }) => {
    // Post the clearance metadata
    const { data } = await api.post(`/reimbursements/${id}/pay`, { request_id: id, ...payment });
    // Return result
    return data;
  },
  /**
   * Attaches a bill/receipt photo to an existing reimbursement request.
   */
  uploadReceipt: async (id: string, uri: string) => {
    // Prep binary multipart
    const formData = new FormData();
    // Image wrapper
    formData.append('file', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    // Submit multipart
    const { data } = await api.post(`/reimbursements/${id}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return path
    return data;
  },
};


// ── 11. Engagement Logs: Notifications ──

export const notificationsAPI = {
  /**
   * Lists all personalized app and system notifications for the user.
   */
  list: async (): Promise<Notification[]> => {
    // Pull the alerts list
    const { data } = await api.get<Notification[]>('/notifications/');
    // Return list
    return data;
  },
  /**
   * Returns the count of unviewed alerts.
   */
  unreadCount: async (): Promise<number> => {
    // Rapid lookup for badge update
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    // Return raw integer
    return data.count;
  },
  /**
   * Silences a specific notification badge.
   */
  markRead: async (id: string) => {
    // Toggle state to read
    await api.patch(`/notifications/${id}/read`);
  },
  /**
   * Bulk marks all alerts as viewed.
   */
  markAllRead: async () => {
    // Global inbox update
    await api.patch('/notifications/read-all');
  },
  /**
   * Clears the user's notification historical record.
   */
  clearAll: async () => {
    // Entire inbox deletion
    await api.delete('/notifications/clear');
  },
};


// ── 12. Corporate Communication: Announcements ──

export const announcementsAPI = {
  /**
   * Syncs official society-wide news and broadcasts.
   */
  list: async (): Promise<Announcement[]> => {
    // Broadcast list GET
    const { data } = await api.get<Announcement[]>('/announcements/');
    // Return list
    return data;
  },
  /**
   * Admin-only: Blasts a new announcement with an optional physical attachment.
   */
  create: async (ann: AnnouncementCreate, attachmentUri?: string): Promise<Announcement> => {
    // Initialize multipart
    const formData = new FormData();
    // Add textual content
    formData.append('title', ann.title);
    formData.append('body', ann.body);
    formData.append('priority', ann.priority || 'normal');
    formData.append('pinned', String(ann.pinned || false));

    // Handle binary attachment if present
    if (attachmentUri) {
      const ext = attachmentUri.split('.').pop()?.toLowerCase() || 'pdf';
      const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
        ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
        : 'application/pdf';
      formData.append('attachment', { uri: attachmentUri, name: `attachment.${ext}`, type } as any);
    }

    // Submit the announcement broadcast
    const { data } = await api.post<Announcement>('/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Return live announcement
    return data;
  },
  /**
   * Administrative deletion of a broadcast.
   */
  delete: async (id: string) => {
    // Resource removal
    await api.delete(`/announcements/${id}`);
  },
  /**
   * Toggles the "Pinned" status of a news item.
   */
  togglePin: async (id: string): Promise<{ pinned: boolean }> => {
    // Toggle via state patch
    const { data } = await api.patch<{ pinned: boolean }>(`/announcements/${id}/pin`);
    // Return result
    return data;
  },
  /**
   * Modifies an existing announcement.
   */
  update: async (id: string, updates: { title?: string; body?: string; priority?: string }): Promise<Announcement> => {
    // Put for core update
    const { data } = await api.put<Announcement>(`/announcements/${id}`, updates);
    // Return record
    return data;
  },
  /**
   * Utility to resolve absolute download links for news attachments.
   */
  getAttachmentUrl: (path: string): string => {
    // Map to the public static server root
    return BASE_URL.replace('/api', '') + path;
  },
};


// ── 13. Member Directory ──

export const residentsAPI = {
  /**
   * Lists the detailed profiles of all verified community members.
   */
  list: async (): Promise<ResidentInfo[]> => {
    // Directory GET
    const { data } = await api.get<ResidentInfo[]>('/residents/');
    // Return profiles
    return data;
  },
  /**
   * Aggregates population and occupancy stats.
   */
  stats: async (): Promise<ResidentStats> => {
    // Stats lookup
    const { data } = await api.get<ResidentStats>('/residents/stats');
    // Return aggregate
    return data;
  },
  /**
   * Admin-only: Promotes or demotes members to the Committee Board.
   */
  setCommittee: async (userId: string, isCommittee: boolean, role?: string): Promise<any> => {
    // Update organizational hierarchy via PUT
    const { data } = await api.put(`/residents/${userId}/committee`, { is_committee: isCommittee, committee_role: role });
    // Return record
    return data;
  },
};


// ── 14. Executive Dashboard ──

export const dashboardAPI = {
  /**
   * Generates a high-level summary of society health (Financials, Complaints, Demographics).
   */
  stats: async (): Promise<DashboardStats> => {
    // Global dashboard stats GET
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    // Return snapshot
    return data;
  },
};


// ── 15. Society Configuration ──

export const societyAPI = {
  /**
   * Lists descriptive key-value pairs about the organization.
   */
  getInfo: async (): Promise<SocietyInfoItem[]> => {
    // Info retrieval
    const { data } = await api.get<SocietyInfoItem[]>('/society/info');
    // Return dictionary
    return data;
  },
  /**
   * Admin-only: Configures society metadata keys (e.g. "Security Rules").
   */
  updateInfo: async (key: string, value: string) => {
    // Parameter update call
    await api.put('/society/info', { key, value });
  },
  /**
   * Retrieves the community's emergency phonebook.
   */
  getEmergencyContacts: async (): Promise<EmergencyContact[]> => {
    // Contacts retrieval
    const { data } = await api.get<EmergencyContact[]>('/society/emergency-contacts');
    // Return list
    return data;
  },
  /**
   * Admin-only: Adds a service/person to the emergency list.
   */
  createEmergencyContact: async (contact: { name: string; phone: string; role: string }): Promise<EmergencyContact> => {
    // Register new contact
    const { data } = await api.post<EmergencyContact>('/society/emergency-contacts', contact);
    // Return record
    return data;
  },
  /**
   * Removes an emergency contact.
   */
  deleteEmergencyContact: async (id: string) => {
    // Removal call
    await api.delete(`/society/emergency-contacts/${id}`);
  },
  /**
   * Public: Lists all residential societies managed by this platform.
   */
  listSocieties: async (): Promise<Society[]> => {
    // Global societies GET
    const { data } = await api.get<Society[]>('/society/');
    // Return list
    return data;
  },
  /**
   * Lists the architecture and occupancy state for every flat in a specific society.
   */
  listFlatsForSociety: async (societyId: string): Promise<SocietyFlatSummary[]> => {
    // Structure lookup
    const { data } = await api.get<SocietyFlatSummary[]>(`/society/${societyId}/flats`);
    // Return hierarchy
    return data;
  },
};


// ── 16. Tenant Onboarding Pipelines ──

export const onboardingAPI = {
  /**
   * Submits a request to join a specific living unit in a society.
   */
  joinSociety: async (payload: {
    society_id: string; flat_id: string; resident_type: string;
    aadhar_number?: string; pan_number?: string;
  }): Promise<{ detail: string; user_id: string }> => {
    // Post the onboarding data
    const { data } = await api.post<{ detail: string; user_id: string }>('/onboarding/join', payload);
    // Return feedback
    return data;
  },
  /**
   * Seeds a new society organization and its full unit inventory.
   */
  createSociety: async (payload: CreateSocietyRequest): Promise<{ detail: string; society_id: string; flats_created: number }> => {
    // Define and deploy new organization
    const { data } = await api.post('/onboarding/create-society', payload);
    // Return deployment stats
    return data;
  },
  /**
   * Admin-only: Lists all users currently in the verification waiting room.
   */
  pendingApprovals: async (): Promise<PendingUser[]> => {
    // Pull pending KYC records
    const { data } = await api.get<PendingUser[]>('/onboarding/pending-approvals');
    // Return queue
    return data;
  },
  /**
   * Admin-only: Finalizes a binary decision for a resident's access.
   */
  approve: async (userId: string, approve = true): Promise<{ detail: string }> => {
    // Submit review decision via POST
    const { data } = await api.post<{ detail: string }>('/onboarding/approve', { user_id: userId, approve });
    // Return result
    return data;
  },
  /**
   * Terminates a renter's access rights.
   */
  revokeRenter: async (userId: string): Promise<{ detail: string }> => {
    // Access revocation call
    const { data } = await api.post<{ detail: string }>('/onboarding/revoke-renter', { user_id: userId });
    // Return result
    return data;
  },
};


// ── 17. Physical Mapping: Flats ──

export const flatsAPI = {
  /**
   * Lists all existing flats for internal inventory auditing.
   */
  list: async (): Promise<Flat[]> => {
    // Flat inventory GET
    const { data } = await api.get<Flat[]>('/auth/flats');
    // Return list
    return data;
  },
  /**
   * Registers a brand new physical living unit.
   */
  create: async (flat: { flat_number: string; block: string; floor: string }): Promise<Flat> => {
    // Create new flat record
    const { data } = await api.post<Flat>('/auth/flats', flat);
    // Return record
    return data;
  },
};
k: string; floor: string }): Promise<Flat> => {
    const { data } = await api.post<Flat>('/auth/flats', flat);
    return data;
  },
  /**
   * Admin-only: Links/Unlinks a user ID to a physical flat unit.
   */
  assignUser: async (userId: string, flatId: string | null): Promise<void> => {
    await api.put('/auth/assign-flat', { user_id: userId, flat_id: flatId });
  },
};

// Default export of the pre-configured axios agent
export default api;
