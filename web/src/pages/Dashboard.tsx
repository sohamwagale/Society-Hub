import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  Building2, Users, FileText, CreditCard, PenTool,
  Settings, LogOut, Bell, Search, TrendingUp,
  AlertCircle, CheckCircle2, ChevronRight, Menu,
  Clock, DollarSign, Download, Upload, Plus, Trash2,
  PhoneCall, ShieldAlert, BarChart3, HelpCircle, Check, X,
  Megaphone, HeartHandshake, Eye, MessageSquare, Paperclip, Pin,
  Home, Landmark
} from 'lucide-react';
import {
  residentsAPI, billsAPI, complaintsAPI, documentsAPI,
  expensesAPI, reimbursementsAPI, pollsAPI, societyAPI,
  onboardingAPI, authAPI, announcementsAPI, flatsAPI
} from '../services/api';
import type {
  User, Bill, BillPayment, BillResidentStatus, Complaint, ComplaintComment,
  SocietyDocument, SocietyExpense, ReimbursementRequest, Poll,
  EmergencyContact, PendingUser, Announcement, ResidentInfo, Flat, SocietyFlatSummary
} from '../types';

export const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global State Buffers
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [societyInfo, setSocietyInfo] = useState<any[]>([]);

  // Modals & Sub-states
  const [modalType, setModalType] = useState<string | null>(null);

  // 1. Directory Tab
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [committeeRoleInput, setCommitteeRoleInput] = useState('');
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);

  // 2. Bills Tab
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<BillPayment[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [complianceList, setComplianceList] = useState<BillResidentStatus[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [newBill, setNewBill] = useState({ title: '', description: '', amount: 0, due_date: '', bill_type: 'maintenance' });
  const [billReceiptFile, setBillReceiptFile] = useState<File | null>(null);
  const [uploadingReceiptBillId, setUploadingReceiptBillId] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<BillPayment | null>(null);
  const [successPaymentBill, setSuccessPaymentBill] = useState<Bill | null>(null);

  // 3. Helpdesk/Complaints Tab
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<any>('plumbing');
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintFile, setComplaintFile] = useState<File | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState('');

  // 4. Documents Tab
  const [documents, setDocuments] = useState<SocietyDocument[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  // 5. Society Expenses Tab
  const [expenses, setExpenses] = useState<SocietyExpense[]>([]);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseFile, setExpenseFile] = useState<File | null>(null);

  // 6. Reimbursements Tab
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementRequest | null>(null);
  const [reimbTitle, setReimbTitle] = useState('');
  const [reimbDesc, setReimbDesc] = useState('');
  const [reimbAmount, setReimbAmount] = useState(0);
  const [reimbDate, setReimbDate] = useState('');
  const [reimbCategory, setReimbCategory] = useState<any>('plumbing');
  const [reimbFile, setReimbFile] = useState<File | null>(null);
  const [reimbApprovalAmount, setReimbApprovalAmount] = useState(0);
  const [reimbAdminNotes, setReimbAdminNotes] = useState('');
  const [reimbPayMethod, setReimbPayMethod] = useState('UPI');
  const [reimbPayRef, setReimbPayRef] = useState('');

  // 7. Polls Tab
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollDeadline, setPollDeadline] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);

  // 8. Emergency/Society Info Tab
  const [emergName, setEmergName] = useState('');
  const [emergPhone, setEmergPhone] = useState('');
  const [emergRole, setEmergRole] = useState('');
  const [editInfoKey, setEditInfoKey] = useState('');
  const [editInfoValue, setEditInfoValue] = useState('');
  const [newInfoKey, setNewInfoKey] = useState('');
  const [newInfoValue, setNewInfoValue] = useState('');

  // 9. Pending Approvals Tab (Admin)
  const [pendingApprovals, setPendingApprovals] = useState<PendingUser[]>([]);

  // 10. Flat Management Tab (Admin)
  const [flats, setFlats] = useState<Flat[]>([]);
  const [flatSearch, setFlatSearch] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');
  const [newFlatBlock, setNewFlatBlock] = useState('');
  const [newFlatFloor, setNewFlatFloor] = useState('');
  const [selectedFlatForAssign, setSelectedFlatForAssign] = useState<Flat | null>(null);
  const [residentAssignSearch, setResidentAssignSearch] = useState('');

  // 11. Settings Tab
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [paymentAddress, setPaymentAddress] = useState(user?.payment_address || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Announcements creation
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<any>('normal');
  const [annFile, setAnnFile] = useState<File | null>(null);

  // Initialize and Fetch
  useEffect(() => {
    if (!user) navigate('/login');
    
    // Dynamically inject Razorpay Web Checkout script
    if (typeof window !== 'undefined' && !document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [user, navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const stats = await dashboardAPI.stats();
      setDashboardStats(stats);

      const anns = await announcementsAPI.list();
      setAnnouncements(anns);

      const contacts = await societyAPI.getEmergencyContacts();
      setEmergencyContacts(contacts);

      const info = await societyAPI.getInfo();
      setSocietyInfo(info);

      const notifs = await notificationsAPI.list();
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.society_id) {
      loadDashboardData();
    }
  }, [user]);

  // Tab Load triggers
  useEffect(() => {
    if (!user?.society_id) return;
    if (activeTab === 'residents') {
      residentsAPI.list().then(setResidents).catch(console.error);
    } else if (activeTab === 'billing') {
      billsAPI.list().then(setBills).catch(console.error);
      billsAPI.paymentHistory().then(setPaymentHistory).catch(console.error);
    } else if (activeTab === 'complaints') {
      complaintsAPI.list().then(setComplaints).catch(console.error);
    } else if (activeTab === 'documents') {
      documentsAPI.list().then(setDocuments).catch(console.error);
    } else if (activeTab === 'expenses') {
      expensesAPI.list().then(setExpenses).catch(console.error);
    } else if (activeTab === 'reimbursements') {
      reimbursementsAPI.list().then(setReimbursements).catch(console.error);
    } else if (activeTab === 'polls') {
      pollsAPI.list().then(setPolls).catch(console.error);
    } else if (activeTab === 'approvals' && user.role === 'admin') {
      onboardingAPI.pendingApprovals().then(setPendingApprovals).catch(console.error);
    } else if (activeTab === 'flats') {
      flatsAPI.list().then((res) => setFlats(res.sort((a, b) => a.flat_number.localeCompare(b.flat_number)))).catch(console.error);
      residentsAPI.list().then(setResidents).catch(console.error);
      if (user.role === 'admin') {
        onboardingAPI.pendingApprovals().then(setPendingApprovals).catch(console.error);
      }
    }
  }, [activeTab, user]);

  // Sync compliance list when selected bill changes
  useEffect(() => {
    if (selectedBillId) {
      setLoadingCompliance(true);
      billsAPI.getResidentStatus(selectedBillId)
        .then(setComplianceList)
        .catch(console.error)
        .finally(() => setLoadingCompliance(false));
    }
  }, [selectedBillId]);

  // Sync comments thread when active complaint opens
  useEffect(() => {
    if (selectedComplaint) {
      complaintsAPI.listComments(selectedComplaint.id)
        .then(setComments)
        .catch(console.error);
    }
  }, [selectedComplaint]);

  // Handle Logout
  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  // 1. Directory Tab Actions
  const handleSetCommittee = async (id: string, isCommittee: boolean) => {
    try {
      await residentsAPI.setCommittee(id, isCommittee, isCommittee ? committeeRoleInput : undefined);
      setCommitteeRoleInput('');
      setActiveResidentId(null);
      const res = await residentsAPI.list();
      setResidents(res);
    } catch (e) {
      alert('Failed to update resident committee membership.');
    }
  };

  // 2. Bills Actions
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await billsAPI.create(newBill);
      setModalType(null);
      setNewBill({ title: '', description: '', amount: 0, due_date: '', bill_type: 'maintenance' });
      const list = await billsAPI.list();
      setBills(list);
      // Reload stats
      const stats = await dashboardAPI.stats();
      setDashboardStats(stats);
    } catch (e) {
      alert('Failed to generate bill cycle.');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill? This action is irreversible.')) return;
    try {
      await billsAPI.delete(id);
      const list = await billsAPI.list();
      setBills(list);
    } catch (e) {
      alert('Failed to delete bill.');
    }
  };

  const handleRazorpayCheckout = async (bill: Bill) => {
    try {
      const order = await billsAPI.createRazorpayOrder(bill.id);
      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'Society Hub',
        description: bill.title,
        order_id: order.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const payment = await billsAPI.verifyRazorpayPayment(bill.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccessPaymentBill(bill);
            setSuccessPayment(payment);
            const list = await billsAPI.list();
            setBills(list);
            const history = await billsAPI.paymentHistory();
            setPaymentHistory(history);
            const stats = await dashboardAPI.stats();
            setDashboardStats(stats);
          } catch (e) {
            alert('Signature verification failed.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || '',
        },
        theme: {
          color: '#4F46E5',
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e) {
      alert('Could not initialize payment order.');
    }
  };

  const handleUploadBillReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billReceiptFile || !uploadingReceiptBillId) return;
    try {
      const receipt = await billsAPI.pay({
        bill_id: uploadingReceiptBillId,
        amount: bills.find(b => b.id === uploadingReceiptBillId)?.amount || 0,
        payment_method: 'Manual upload',
      });
      await billsAPI.uploadReceipt(receipt.id, billReceiptFile);
      alert('Payment receipt uploaded successfully!');
      setModalType(null);
      setBillReceiptFile(null);
      setUploadingReceiptBillId(null);
      const list = await billsAPI.list();
      setBills(list);
      const history = await billsAPI.paymentHistory();
      setPaymentHistory(history);
    } catch (e) {
      alert('Failed to upload receipt.');
    }
  };

  // 3. Complaints Actions
  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const complaint = await complaintsAPI.create({
        category: complaintCategory,
        title: complaintTitle,
        description: complaintDesc,
      });

      if (complaintFile) {
        await complaintsAPI.uploadImage(complaint.id, complaintFile);
      }

      alert('Grievance logged successfully!');
      setModalType(null);
      setComplaintTitle('');
      setComplaintDesc('');
      setComplaintFile(null);
      const list = await complaintsAPI.list();
      setComplaints(list);
    } catch (e) {
      alert('Failed to register complaint.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedComplaint) return;
    try {
      const c = await complaintsAPI.addComment(selectedComplaint.id, commentInput);
      setComments([...comments, c]);
      setCommentInput('');
    } catch (e) {
      alert('Failed to submit comment.');
    }
  };

  const handleUpdateComplaintStatus = async (status: 'in_progress' | 'resolved') => {
    if (!selectedComplaint) return;
    try {
      const updated = await complaintsAPI.update(selectedComplaint.id, {
        status,
        admin_notes: adminNotesInput || undefined,
      });
      setSelectedComplaint(updated);
      setAdminNotesInput('');
      const list = await complaintsAPI.list();
      setComplaints(list);
    } catch (e) {
      alert('Failed to update ticket status.');
    }
  };

  // 4. Documents Actions
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    try {
      await documentsAPI.upload(docTitle, docFile, docDesc);
      alert('Document submitted successfully!');
      setModalType(null);
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      const list = await documentsAPI.list();
      setDocuments(list);
    } catch (e) {
      alert('Failed to upload document.');
    }
  };

  const handleApproveDocument = async (id: string) => {
    try {
      await documentsAPI.approve(id);
      const list = await documentsAPI.list();
      setDocuments(list);
    } catch (e) {
      alert('Failed to approve document.');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      const list = await documentsAPI.list();
      setDocuments(list);
    } catch (e) {
      alert('Failed to delete document.');
    }
  };

  // 5. Society Expenses Actions
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await expensesAPI.create({
        title: expenseTitle,
        description: expenseDesc,
        amount: expenseAmount,
        expense_date: expenseDate,
      }, expenseFile || undefined);

      alert('Expenditure logged successfully!');
      setModalType(null);
      setExpenseTitle('');
      setExpenseDesc('');
      setExpenseAmount(0);
      setExpenseDate('');
      setExpenseFile(null);
      const list = await expensesAPI.list();
      setExpenses(list);
      // Reload stats
      const stats = await dashboardAPI.stats();
      setDashboardStats(stats);
    } catch (e) {
      alert('Failed to record expense.');
    }
  };

  // 6. Reimbursements Actions
  const handleRaiseReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const req = await reimbursementsAPI.create({
        title: reimbTitle,
        description: reimbDesc,
        amount: reimbAmount,
        expense_date: reimbDate,
        category: reimbCategory,
      });

      if (reimbFile) {
        await reimbursementsAPI.uploadReceipt(req.id, reimbFile);
      }

      alert('Claim submitted successfully!');
      setModalType(null);
      setReimbTitle('');
      setReimbDesc('');
      setReimbAmount(0);
      setReimbDate('');
      setReimbFile(null);
      const list = await reimbursementsAPI.list();
      setReimbursements(list);
    } catch (e) {
      alert('Failed to submit reimbursement request.');
    }
  };

  const handleReviewReimbursement = async (status: 'approved' | 'rejected') => {
    if (!selectedReimbursement) return;
    try {
      const updated = await reimbursementsAPI.review(selectedReimbursement.id, {
        status,
        approved_amount: status === 'approved' ? reimbApprovalAmount : 0,
        admin_notes: reimbAdminNotes || undefined,
      });
      setSelectedReimbursement(updated);
      setReimbAdminNotes('');
      const list = await reimbursementsAPI.list();
      setReimbursements(list);
    } catch (e) {
      alert('Review submission failed.');
    }
  };

  const handleClearReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReimbursement) return;
    try {
      const updated = await reimbursementsAPI.markPaid(selectedReimbursement.id, {
        amount: selectedReimbursement.approved_amount || selectedReimbursement.amount,
        payment_method: reimbPayMethod,
        transaction_ref: reimbPayRef || undefined,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setSelectedReimbursement(updated);
      setReimbPayRef('');
      const list = await reimbursementsAPI.list();
      setReimbursements(list);
    } catch (e) {
      alert('Failed to mark claim as cleared.');
    }
  };

  // 7. Polls Actions
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pollsAPI.create({
        title: pollTitle,
        description: pollDesc || undefined,
        deadline: pollDeadline,
        options: pollOptions.map(opt => ({ text: opt })),
      });
      alert('Survey launched successfully!');
      setModalType(null);
      setPollTitle('');
      setPollDesc('');
      setPollDeadline('');
      setPollOptions(['Yes', 'No']);
      const list = await pollsAPI.list();
      setPolls(list);
    } catch (e) {
      alert('Failed to create poll.');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await pollsAPI.vote(pollId, optionId);
      const list = await pollsAPI.list();
      setPolls(list);
    } catch (e) {
      alert('Failed to register vote.');
    }
  };

  const handleClosePoll = async (id: string) => {
    try {
      await pollsAPI.close(id);
      const list = await pollsAPI.list();
      setPolls(list);
    } catch (e) {
      alert('Failed to close poll.');
    }
  };

  const handleDeletePoll = async (id: string) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await pollsAPI.delete(id);
      const list = await pollsAPI.list();
      setPolls(list);
    } catch (e) {
      alert('Failed to delete poll.');
    }
  };

  // 8. Emergency / Society Info Actions
  const handleAddEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await societyAPI.createEmergencyContact({ name: emergName, phone: emergPhone, role: emergRole });
      setModalType(null);
      setEmergName('');
      setEmergPhone('');
      setEmergRole('');
      const list = await societyAPI.getEmergencyContacts();
      setEmergencyContacts(list);
    } catch (e) {
      alert('Failed to add contact.');
    }
  };

  const handleDeleteEmergency = async (id: string) => {
    if (!window.confirm('Delete emergency contact?')) return;
    try {
      await societyAPI.deleteEmergencyContact(id);
      const list = await societyAPI.getEmergencyContacts();
      setEmergencyContacts(list);
    } catch (e) {
      alert('Failed to remove contact.');
    }
  };

  const handleUpdateSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInfoValue) return;
    try {
      await societyAPI.updateInfo(editInfoKey, editInfoValue);
      setModalType(null);
      setEditInfoKey('');
      setEditInfoValue('');
      const info = await societyAPI.getInfo();
      setSocietyInfo(info);
    } catch (e) {
      alert('Failed to update parameter.');
    }
  };

  const handleAddSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfoKey || !newInfoValue) return;
    try {
      const formattedKey = newInfoKey.trim().toLowerCase().replace(/\s+/g, '_');
      await societyAPI.updateInfo(formattedKey, newInfoValue);
      setModalType(null);
      setNewInfoKey('');
      setNewInfoValue('');
      const info = await societyAPI.getInfo();
      setSocietyInfo(info);
    } catch (e) {
      alert('Failed to add custom attribute.');
    }
  };

  // 9. Onboarding Approvals (Admin Queue)
  const handleApprovePendingUser = async (id: string, approve: boolean) => {
    try {
      await onboardingAPI.approve(id, approve);
      alert(approve ? 'User approved!' : 'Application rejected.');
      const queue = await onboardingAPI.pendingApprovals();
      setPendingApprovals(queue);
      const res = await residentsAPI.list();
      setResidents(res);
    } catch (e) {
      alert('Verification decision failed.');
    }
  };

  // 10. Flat Management Actions
  const handleCreateFlatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlatNumber || !newFlatBlock || !newFlatFloor) return;
    try {
      await flatsAPI.create({ flat_number: newFlatNumber, block: newFlatBlock, floor: newFlatFloor });
      setModalType(null);
      setNewFlatNumber('');
      setNewFlatBlock('');
      setNewFlatFloor('');
      const res = await flatsAPI.list();
      setFlats(res.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
    } catch (e) {
      alert('Failed to register flat.');
    }
  };

  const handleAssignResident = async (residentId: string) => {
    if (!selectedFlatForAssign) return;
    try {
      await flatsAPI.assignUser(residentId, selectedFlatForAssign.id);
      alert('Resident linked successfully!');
      setModalType(null);
      setSelectedFlatForAssign(null);
      setResidentAssignSearch('');
      const resFlats = await flatsAPI.list();
      setFlats(resFlats.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
      const resList = await residentsAPI.list();
      setResidents(resList);
    } catch (e) {
      alert('Failed to assign resident.');
    }
  };

  const handleVacateFlat = async (flat: Flat) => {
    const resident = residents.find(r => r.flat_id === flat.id);
    if (!resident) return;
    if (!window.confirm(`Are you sure you want to vacate ${resident.name} from Flat ${flat.flat_number}?`)) return;
    try {
      await flatsAPI.assignUser(resident.id, null);
      alert('Flat vacated successfully!');
      const resFlats = await flatsAPI.list();
      setFlats(resFlats.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
      const resList = await residentsAPI.list();
      setResidents(resList);
    } catch (e) {
      alert('Failed to vacate flat.');
    }
  };

  // 11. Settings Actions
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await authAPI.updateProfile({
        name: profileName,
        phone: profilePhone || undefined,
        payment_address: paymentAddress || undefined,
      });
      await refreshUser();
      setSettingsSuccess('Profile details updated successfully!');
    } catch (e) {
      setSettingsError('Failed to update profile settings.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setSettingsSuccess('Password changed successfully!');
    } catch (e: any) {
      setSettingsError(e.response?.data?.detail || 'Failed to rotate password.');
    }
  };

  // Announcements blasting
  const handleBlastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await announcementsAPI.create({
        title: annTitle,
        body: annBody,
        priority: annPriority,
      }, annFile || undefined);

      alert('Announcement broadcasted!');
      setModalType(null);
      setAnnTitle('');
      setAnnBody('');
      setAnnPriority('normal');
      setAnnFile(null);
      const list = await announcementsAPI.list();
      setAnnouncements(list);
    } catch (e) {
      alert('Broadcast failure.');
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      await announcementsAPI.togglePin(id);
      const list = await announcementsAPI.list();
      setAnnouncements(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete announcement?')) return;
    try {
      await announcementsAPI.delete(id);
      const list = await announcementsAPI.list();
      setAnnouncements(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      const list = await notificationsAPI.list();
      setNotifications(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Clear notifications
  const handleClearAllNotifications = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter residents
  const filteredResidents = residents.filter(res => 
    res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (res.flat_number && res.flat_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (res.block && res.block.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter flats
  const filteredFlats = flats.filter(f => 
    f.flat_number.toLowerCase().includes(flatSearch.toLowerCase()) ||
    f.block.toLowerCase().includes(flatSearch.toLowerCase())
  );

  // Filter residents for flat assignment modal
  const filteredAssignResidents = residents.filter(res => 
    res.name.toLowerCase().includes(residentAssignSearch.toLowerCase()) ||
    res.email.toLowerCase().includes(residentAssignSearch.toLowerCase())
  );

  const getResidentForFlat = (flatId: string) => residents.find(r => r.flat_id === flatId);

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar Layout */}
      <aside className={`bg-indigo-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-indigo-800">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Building2 size={24} />
          </div>
          {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight">Society Hub</h1>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'announcements', icon: Megaphone, label: 'Announcements' },
            { id: 'residents', icon: Users, label: 'Residents Directory' },
            { id: 'billing', icon: CreditCard, label: 'Bills & Payments' },
            { id: 'complaints', icon: PenTool, label: 'Helpdesk' },
            { id: 'documents', icon: FileText, label: 'Document Vault' },
            { id: 'expenses', icon: DollarSign, label: 'Society Expenses' },
            { id: 'reimbursements', icon: HeartHandshake, label: 'Reimbursements' },
            { id: 'polls', icon: BarChart3, label: 'Community Polls' },
            { id: 'emergency', icon: PhoneCall, label: 'Society Info Book' },
            ...(user?.role === 'admin' ? [
              { id: 'flats', icon: Home, label: 'Flat Management' },
              { id: 'approvals', icon: ShieldAlert, label: 'KYC Queue' }
            ] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedComplaint(null);
                setSelectedReimbursement(null);
                setSelectedBillId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === item.id ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-850 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors"
          >
            <Settings size={20} />
            {isSidebarOpen && <span className="text-sm">Settings</span>}
          </button>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors mt-2"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-slate-700">
              <Menu size={24} />
            </button>
            <div className="text-slate-700 font-medium text-sm hidden sm:block">
              {user?.flat_number ? `Flat {user.flat_number} (${user.block} Block)` : 'Management System'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell size={20} />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-2">
                  <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    <div className="flex gap-2">
                      <button onClick={handleMarkAllNotificationsRead} className="text-xs text-indigo-600 font-semibold hover:underline">Read All</button>
                      <button onClick={handleClearAllNotifications} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 border-b border-slate-50 text-xs ${n.is_read ? 'bg-white' : 'bg-indigo-50/20'}`}>
                          <p className="font-bold text-slate-800">{n.title}</p>
                          <p className="text-slate-500 mt-0.5">{n.body}</p>
                          <p className="text-slate-400 mt-1 text-[10px]">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                {user?.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-semibold text-slate-700 leading-tight">{user?.name}</p>
                <p className="text-slate-500 text-xs text-left capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab views switcher */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                  <p className="text-slate-500 text-sm mt-1">Quick metrics and society announcements feed.</p>
                </div>

                {/* Dashboard Stats */}
                {dashboardStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-sm font-medium">Billing Collection Rate</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardStats.billing.collection_rate}%</p>
                      <p className="text-xs text-slate-400 mt-1">₹{dashboardStats.billing.total_collected.toLocaleString()} / ₹{dashboardStats.billing.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-sm font-medium">Active Helpdesk Tickets</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{dashboardStats.complaints.open + dashboardStats.complaints.in_progress}</p>
                      <p className="text-xs text-slate-400 mt-1">{dashboardStats.complaints.resolved} resolved tickets</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-sm font-medium">Occupied Flats</p>
                      <p className="text-2xl font-bold text-slate-850 mt-1">{dashboardStats.community.total_residents}</p>
                      <p className="text-xs text-slate-400 mt-1">Out of {dashboardStats.community.total_flats} units total</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-sm font-medium">Pending Reimbursements</p>
                      <p className="text-2xl font-bold text-amber-500 mt-1">{dashboardStats.reimbursements.pending}</p>
                      <p className="text-xs text-slate-400 mt-1">Approved sum: ₹{dashboardStats.reimbursements.approved_amount.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Split layout: Announcements & Pinned notices */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Announcements feed */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 text-base">Announcements Broadcast</h3>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setModalType('announcement')}
                          className="flex items-center gap-1 text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus size={14} /> New Blast
                        </button>
                      )}
                    </div>
                    <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                      {announcements.length === 0 ? (
                        <p className="text-slate-400 text-center text-sm py-8">No notices or announcements posted yet.</p>
                      ) : (
                        announcements.map((ann) => (
                          <div key={ann.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-2 items-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  ann.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  ann.priority === 'important' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {ann.priority}
                                </span>
                                {ann.pinned && <Pin size={12} className="text-indigo-600 rotate-45" />}
                              </div>
                              {user?.role === 'admin' && (
                                <div className="flex gap-1">
                                  <button onClick={() => handleTogglePinAnnouncement(ann.id)} className="p-1 hover:bg-slate-200 text-slate-500 rounded">
                                    <Pin size={12} />
                                  </button>
                                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1 hover:bg-red-50 text-red-500 rounded">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-base mt-2">{ann.title}</h4>
                            <p className="text-slate-600 text-sm mt-1 leading-relaxed whitespace-pre-line">{ann.body}</p>
                            
                            {ann.attachment_url && (
                              <div className="mt-3 pt-3 border-t border-slate-200/50">
                                <a
                                  href={announcementsAPI.getAttachmentUrl(ann.attachment_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                                >
                                  <Paperclip size={12} /> View Attachment
                                </a>
                              </div>
                            )}

                            <p className="text-[10px] text-slate-400 mt-3 text-right">
                              Posted by {ann.creator_name || 'Admin'} on {new Date(ann.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick links & emergency */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between h-[500px]">
                    <div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                        <h3 className="font-bold text-slate-800 text-base">Key Details</h3>
                      </div>

                      <div className="space-y-4 max-h-[360px] overflow-y-auto">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Info</h4>
                        <div className="text-xs space-y-2">
                          <p><strong>Society Name:</strong> {societyInfo.find(i => i.key === 'society_name')?.value || 'Loading...'}</p>
                          <p><strong>Address:</strong> {societyInfo.find(i => i.key === 'address')?.value || 'Loading...'}</p>
                          <p><strong>Registration No:</strong> {societyInfo.find(i => i.key === 'registration_no')?.value || 'Loading...'}</p>
                        </div>
                        <Divider className="my-2" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency contacts</h4>
                        {emergencyContacts.slice(0, 3).map((contact) => (
                          <div key={contact.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                            <span>{contact.name} ({contact.role})</span>
                            <a href={`tel:${contact.phone}`} className="text-indigo-600 font-bold hover:underline">{contact.phone}</a>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800 leading-normal">
                      Use the sidebar to explore details about billing, documents, complaints resolution, and voting.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Announcements Notice Board</h3>
                    <p className="text-slate-500 text-xs mt-1">Read noticeboards and priority announcements from society leaders.</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setModalType('announcement')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={16} /> Broadcast Notice
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-sm">No notices posted yet.</p>
                  ) : (
                    announcements.map((ann) => (
                      <div key={ann.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between relative">
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex gap-2 items-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                ann.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                ann.priority === 'important' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {ann.priority}
                              </span>
                              {ann.pinned && <Pin size={12} className="text-indigo-600 rotate-45" />}
                            </div>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 p-1">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 text-lg mt-3">{ann.title}</h4>
                          <p className="text-slate-600 text-sm mt-2 leading-relaxed whitespace-pre-line">{ann.body}</p>
                          {ann.attachment_url && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <a
                                href={announcementsAPI.getAttachmentUrl(ann.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                              >
                                <Paperclip size={14} /> Download Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-4 text-right">
                          Posted by {ann.creator_name || 'Admin'} on {new Date(ann.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: DIRECTORY */}
            {activeTab === 'residents' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Residents Registry</h3>
                    <p className="text-slate-500 text-xs mt-1">Look up or search other verified society residents.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search name, flat..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-350 rounded-lg text-xs bg-white w-60 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/50">
                        <th className="p-3.5 font-bold">Resident</th>
                        <th className="p-3.5 font-bold">Flat Mapping</th>
                        <th className="p-3.5 font-bold">Board Role</th>
                        <th className="p-3.5 font-bold">Contact</th>
                        {user?.role === 'admin' && <th className="p-3.5 font-bold text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {filteredResidents.map((res) => (
                        <tr key={res.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3.5">
                            <p className="font-bold text-slate-800">{res.name}</p>
                            <p className="text-slate-500 text-[10px] capitalize">{res.role}</p>
                          </td>
                          <td className="p-3.5 font-medium text-slate-700">
                            {res.flat_number ? `Flat ${res.flat_number} (${res.block} Block)` : 'Unassigned'}
                          </td>
                          <td className="p-3.5 font-medium">
                            {res.is_committee ? (
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {res.committee_role || 'Committee'}
                              </span>
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            <p>{res.email}</p>
                            <p className="text-[10px] text-slate-500">{res.phone || 'No phone number'}</p>
                          </td>
                          {user?.role === 'admin' && (
                            <td className="p-3.5 text-right">
                              {activeResidentId === res.id ? (
                                <div className="flex gap-2 justify-end items-center">
                                  <input
                                    type="text"
                                    placeholder="Role e.g. Secretary"
                                    value={committeeRoleInput}
                                    onChange={(e) => setCommitteeRoleInput(e.target.value)}
                                    className="border border-slate-350 rounded px-2 py-1 text-[10px] bg-white focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleSetCommittee(res.id, true)}
                                    className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setActiveResidentId(null)}
                                    className="bg-slate-100 text-slate-500 p-1 rounded hover:bg-slate-200"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2 justify-end">
                                  {res.is_committee ? (
                                    <button
                                      onClick={() => handleSetCommittee(res.id, false)}
                                      className="text-xs text-red-500 font-semibold hover:underline"
                                    >
                                      Remove Board
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveResidentId(res.id);
                                        setCommitteeRoleInput('');
                                      }}
                                      className="text-xs text-indigo-600 font-semibold hover:underline"
                                    >
                                      Promote Board
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BILLS & PAYMENTS */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Billing & Maintenance Dues</h3>
                      <p className="text-slate-500 text-xs mt-1">Review active billing cycles, pay online, or audit compliance.</p>
                    </div>
                    <div className="flex gap-3">
                      {user?.role === 'admin' && (
                        <>
                          <a
                            href={billsAPI.getExportReportUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <Download size={14} /> Export Report
                          </a>
                          <button
                            onClick={() => setModalType('bill')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Plus size={16} /> New Billing Cycle
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Cycles</h4>
                      {bills.length === 0 ? (
                        <p className="text-slate-400 text-sm py-8 text-center">No billing cycles defined.</p>
                      ) : (
                        bills.map((bill) => {
                          const paymentMatch = paymentHistory.find(p => p.bill_id === bill.id);
                          return (
                            <div key={bill.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between relative group hover:border-slate-300 transition-all">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-bold text-slate-800 text-base">{bill.title}</h5>
                                  <p className="text-slate-500 text-xs mt-1">{bill.description || 'Routine society maintenance charge.'}</p>
                                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                                    <p><strong>Type:</strong> <span className="capitalize">{bill.bill_type}</span></p>
                                    <p><strong>Due:</strong> {new Date(bill.due_date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-slate-800">₹{bill.amount.toLocaleString()}</p>
                                  <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                                    bill.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                    bill.payment_status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {bill.payment_status || 'Due'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                                <div className="flex gap-2">
                                  {user?.role === 'admin' ? (
                                    <button
                                      onClick={() => setSelectedBillId(bill.id)}
                                      className="text-xs text-indigo-600 font-bold hover:underline"
                                    >
                                      View Resident Audits
                                    </button>
                                  ) : (
                                    <>
                                      {bill.payment_status !== 'paid' && (
                                        <>
                                          <button
                                            onClick={() => handleRazorpayCheckout(bill)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded"
                                          >
                                            Pay Online
                                          </button>
                                          <button
                                            onClick={() => {
                                              setUploadingReceiptBillId(bill.id);
                                              setModalType('receipt');
                                            }}
                                            className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded"
                                          >
                                            Upload Receipt
                                          </button>
                                        </>
                                      )}
                                      {bill.payment_status === 'paid' && paymentMatch && (
                                        <div className="flex gap-2 items-center">
                                          <a
                                            href={billsAPI.getReceiptUrl(paymentMatch.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1"
                                          >
                                            <Download size={12} /> Receipt (PDF)
                                          </a>
                                          <button
                                            onClick={() => {
                                              setUploadingReceiptBillId(bill.id);
                                              setModalType('receipt');
                                            }}
                                            className="border border-slate-300 hover:bg-slate-55 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded"
                                          >
                                            Upload Screenshot
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {user?.role === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteBill(bill.id)}
                                    className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 font-semibold"
                                  >
                                    <Trash2 size={12} /> Remove Cycle
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {user?.role === 'admin' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resident Audits</h4>
                        {!selectedBillId ? (
                          <p className="text-xs text-slate-400 leading-normal">Select "View Resident Audits" on any billing card to audit payments.</p>
                        ) : loadingCompliance ? (
                          <div className="text-xs text-slate-500">Loading audit records...</div>
                        ) : (
                          <div className="space-y-3.5 max-h-[380px] overflow-y-auto">
                            <p className="text-xs text-slate-605 font-semibold mb-2">
                              Bill: {bills.find(b => b.id === selectedBillId)?.title}
                            </p>
                            {complianceList.map((compliance) => (
                              <div key={compliance.user_id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100 text-xs">
                                <div>
                                  <p className="font-bold text-slate-800">{compliance.name}</p>
                                  <p className="text-slate-500 text-[10px]">Flat {compliance.flat}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                                    compliance.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {compliance.status}
                                  </span>
                                  {compliance.paid_at && (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(compliance.paid_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HELPDESK */}
            {activeTab === 'complaints' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Helpdesk Grievances</h3>
                    <p className="text-slate-500 text-xs mt-1">Submit support tickets, communicate with board members, or manage status.</p>
                  </div>
                  <button
                    onClick={() => setModalType('complaint')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Raise Ticket
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {complaints.length === 0 ? (
                      <p className="text-slate-400 text-sm py-12 text-center">No active complaints logged.</p>
                    ) : (
                      complaints.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedComplaint(c)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            selectedComplaint?.id === c.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                                {c.category}
                              </span>
                              <h4 className="font-bold text-slate-850 text-base mt-2">{c.title}</h4>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              c.status === 'open' ? 'bg-red-100 text-red-700' :
                              c.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-2 line-clamp-2">{c.description}</p>
                          <p className="text-[10px] text-slate-400 mt-3 text-right">
                            Logged on {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm h-[500px] flex flex-col justify-between">
                    {!selectedComplaint ? (
                      <div className="text-center py-20">
                        <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-xs text-slate-400 font-medium">Select a grievance ticket from the registry to view details and chat thread.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                          <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                            <div>
                              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-750 px-2 py-0.5 rounded uppercase">
                                {selectedComplaint.category}
                              </span>
                              <h4 className="font-bold text-slate-800 text-base mt-2">{selectedComplaint.title}</h4>
                            </div>
                            <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                              <X size={16} />
                            </button>
                          </div>

                          <p className="text-slate-700 text-xs leading-relaxed">{selectedComplaint.description}</p>
                          
                          {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Attached Image</p>
                              <a
                                href={complaintsAPI.getImageUrl(selectedComplaint.images[0])}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-slate-200 rounded-lg overflow-hidden max-h-40"
                              >
                                <img
                                  src={complaintsAPI.getImageUrl(selectedComplaint.images[0])}
                                  alt="evidence"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            </div>
                          )}

                          {user?.role === 'admin' && (
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-2.5 mt-4">
                              <p className="font-bold text-indigo-800">Admin Ticket Management</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateComplaintStatus('in_progress')}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2.5 rounded text-[10px]"
                                >
                                  In Progress
                                </button>
                                <button
                                  onClick={() => handleUpdateComplaintStatus('resolved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[10px]"
                                >
                                  Resolved
                                </button>
                              </div>
                              <textarea
                                placeholder="Internal board notes..."
                                value={adminNotesInput}
                                onChange={(e) => setAdminNotesInput(e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 focus:outline-none"
                                rows={1.5}
                              />
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-200">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Resolution Thread</h5>
                            <div className="space-y-3">
                              {comments.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">No messages in this thread yet.</p>
                              ) : (
                                comments.map((comm) => (
                                  <div key={comm.id} className="p-2 bg-white rounded border border-slate-100">
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-650">
                                      <span>{comm.user_name} ({comm.user_role})</span>
                                      <span className="text-slate-400 font-normal">{new Date(comm.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-700 text-xs mt-1">{comm.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type resolution comment..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            className="flex-1 border border-slate-355 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-750"
                          >
                            Send
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === 'documents' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Communal Document Vault</h3>
                    <p className="text-slate-500 text-xs mt-1">Access society rules, board meeting minutes, templates, and safety audits.</p>
                  </div>
                  <button
                    onClick={() => setModalType('document')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Upload size={14} /> Upload Document
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.length === 0 ? (
                    <p className="col-span-full text-slate-400 text-sm text-center py-12">No document logs uploaded.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                              {doc.file_type}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              doc.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.is_approved ? 'Approved' : 'Pending Review'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-base mt-3 truncate">{doc.title}</h4>
                          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{doc.description || 'Official society ledger/document file.'}</p>
                          <p className="text-[10px] text-slate-400 mt-2">
                            Uploaded by {doc.uploader_name || 'Admin'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                          <a
                            href={documentsAPI.getFileUrl(doc.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                          >
                            <Download size={12} /> View File
                          </a>
                          
                          <div className="flex gap-2">
                            {user?.role === 'admin' && !doc.is_approved && (
                              <button
                                onClick={() => handleApproveDocument(doc.id)}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded"
                              >
                                Approve
                              </button>
                            )}
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: SOCIETY EXPENSES */}
            {activeTab === 'expenses' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Society Expenditures Ledger</h3>
                    <p className="text-slate-500 text-xs mt-1">Audit expenditures logged by the management board.</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setModalType('expense')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={16} /> Log Expenditure
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/50">
                        <th className="p-3.5 font-bold">Expense Title</th>
                        <th className="p-3.5 font-bold">Spent On</th>
                        <th className="p-3.5 font-bold">Amount</th>
                        <th className="p-3.5 font-bold text-right">Invoice File</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">No expenditures recorded in this society yet.</td>
                        </tr>
                      ) : (
                        expenses.map((exp) => (
                          <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-850">{exp.title}</p>
                              <p className="text-slate-500 text-[10px]">{exp.description || 'Administrative expense.'}</p>
                            </td>
                            <td className="p-3.5 font-medium text-slate-600">
                              {new Date(exp.expense_date).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 text-sm">
                              ₹{exp.amount.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              {exp.document_url ? (
                                <a
                                  href={expensesAPI.getDocumentUrl(exp.document_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                                >
                                  <Paperclip size={12} /> Voucher
                                </a>
                              ) : (
                                <span className="text-slate-400">No Voucher</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: REIMBURSEMENTS */}
            {activeTab === 'reimbursements' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Expense Reimbursements</h3>
                    <p className="text-slate-500 text-xs mt-1">Claim personal funds spent on society utility tasks, or review resident requests.</p>
                  </div>
                  <button
                    onClick={() => setModalType('reimbursement')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={16} /> File Claim
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {reimbursements.length === 0 ? (
                      <p className="text-slate-400 text-sm py-12 text-center">No reimbursement claims filed.</p>
                    ) : (
                      reimbursements.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setSelectedReimbursement(r);
                            setReimbApprovalAmount(r.amount);
                          }}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            selectedReimbursement?.id === r.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                                {r.category}
                              </span>
                              <h4 className="font-bold text-slate-800 text-base mt-2">{r.title}</h4>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800">₹{r.amount.toLocaleString()}</p>
                              <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                                r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {r.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs mt-2 line-clamp-1">{r.description}</p>
                          <p className="text-[10px] text-slate-400 mt-3 text-right">
                            Submitted on {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm h-[520px] flex flex-col justify-between overflow-y-auto">
                    {!selectedReimbursement ? (
                      <div className="text-center py-20">
                        <HeartHandshake size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-xs text-slate-400 font-medium">Select a reimbursement claim to view invoice files or process review decisions.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                          <div>
                            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-750 px-2 py-0.5 rounded uppercase">
                              {selectedReimbursement.category}
                            </span>
                            <h4 className="font-bold text-slate-800 text-base mt-2">{selectedReimbursement.title}</h4>
                          </div>
                          <button onClick={() => setSelectedReimbursement(null)} className="text-slate-400 hover:text-slate-655">
                            <X size={16} />
                          </button>
                        </div>

                        <div className="text-xs text-slate-700 space-y-2">
                          <p><strong>Description:</strong> {selectedReimbursement.description}</p>
                          <p><strong>Spend Date:</strong> {new Date(selectedReimbursement.expense_date).toLocaleDateString()}</p>
                          <p><strong>Requested Sum:</strong> ₹{selectedReimbursement.amount.toLocaleString()}</p>
                          {selectedReimbursement.approved_amount !== undefined && (
                            <p><strong>Approved Sum:</strong> ₹{selectedReimbursement.approved_amount.toLocaleString()}</p>
                          )}
                          <p><strong>Recipient Address:</strong> <span className="font-mono text-[10px]">{selectedReimbursement.payment_address || 'Unspecified'}</span></p>
                        </div>

                        {selectedReimbursement.receipt_path && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Receipt Invoice Link</p>
                            <a
                              href={reimbursementsAPI.getReceiptUrl(selectedReimbursement.receipt_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                            >
                              <Paperclip size={12} /> Download Invoice Receipt
                            </a>
                          </div>
                        )}

                        {user?.role === 'admin' && selectedReimbursement.status === 'submitted' && (
                          <div className="p-3 bg-indigo-50 border border-indigo-105 rounded-lg text-xs space-y-3 pt-3">
                            <p className="font-bold text-indigo-800">Claim Evaluation</p>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Approved Amount (₹)</label>
                              <input
                                type="number"
                                value={reimbApprovalAmount}
                                onChange={(e) => setReimbApprovalAmount(parseInt(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded p-1 text-xs bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Admin Notes</label>
                              <textarea
                                value={reimbAdminNotes}
                                onChange={(e) => setReimbAdminNotes(e.target.value)}
                                className="w-full border border-slate-300 rounded p-1 text-xs bg-white focus:outline-none"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewReimbursement('approved')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded text-[10px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewReimbursement('rejected')}
                                className="bg-red-500 hover:bg-red-655 text-white font-bold py-1 px-3 rounded text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}

                        {user?.role === 'admin' && selectedReimbursement.status === 'approved' && (
                          <form onSubmit={handleClearReimbursement} className="p-3 bg-indigo-50 border border-indigo-105 rounded-lg text-xs space-y-3">
                            <p className="font-bold text-indigo-800">Clear Payment</p>
                            <p className="text-[10px] text-slate-500">Payee UPI: <code>{selectedReimbursement.payment_address || 'Check profile address'}</code></p>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Payment Method</label>
                              <select
                                value={reimbPayMethod}
                                onChange={(e) => setReimbPayMethod(e.target.value)}
                                className="w-full border border-slate-300 rounded p-1 bg-white text-xs"
                              >
                                <option value="UPI">UPI Transfer</option>
                                <option value="Bank Transfer">Bank Transfer IMPS</option>
                                <option value="Cash">Cash Handout</option>
                                <option value="Cheque">Cheque Clear</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Ref Hash / Tx ID (Optional)</label>
                              <input
                                type="text"
                                value={reimbPayRef}
                                onChange={(e) => setReimbPayRef(e.target.value)}
                                placeholder="UPI Txn Reference ID"
                                className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                              />
                            </div>
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 w-full rounded text-[10px]"
                            >
                              Mark Cleared / Paid
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: POLLS */}
            {activeTab === 'polls' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Democratic Community Polls</h3>
                    <p className="text-slate-500 text-xs mt-1">Cast opinions on active surveys, or check finished voting logs.</p>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setModalType('poll')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={16} /> Launch Poll
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {polls.length === 0 ? (
                    <p className="col-span-full text-slate-400 text-sm text-center py-12">No community surveys listed.</p>
                  ) : (
                    polls.map((poll) => {
                      const totalVotes = poll.options.reduce((acc, curr) => acc + curr.vote_count, 0);
                      return (
                        <div key={poll.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/20 relative flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                poll.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-650'
                              }`}>
                                {poll.is_active ? 'Active' : 'Closed'}
                              </span>
                              {user?.role === 'admin' && (
                                <div className="flex gap-2">
                                  {poll.is_active && (
                                    <button
                                      onClick={() => handleClosePoll(poll.id)}
                                      className="text-xs text-amber-500 font-bold hover:underline"
                                    >
                                      Close
                                    </button>
                                  )}
                                  <button onClick={() => handleDeletePoll(poll.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mt-3">{poll.title}</h4>
                            <p className="text-slate-500 text-xs mt-1">{poll.description || 'Survey for society feedback.'}</p>
                            
                            <div className="mt-5 space-y-3">
                              {poll.options.map((opt) => {
                                const percent = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                                return (
                                  <div key={opt.id} className="space-y-1 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-slate-700">{opt.text}</span>
                                      <span className="text-slate-500 text-[10px]">{opt.vote_count} votes ({percent}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                      <div className="bg-indigo-600 h-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                    {poll.is_active && !poll.user_voted && (
                                      <button
                                        onClick={() => handleVote(poll.id, opt.id)}
                                        className="text-[9px] text-indigo-600 font-bold hover:underline block pt-0.5"
                                      >
                                        Cast Vote
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400">
                            <span>Deadline: {new Date(poll.deadline).toLocaleDateString()}</span>
                            <span>Total votes: {totalVotes}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: EMERGENCY & SOCIETY INFO */}
            {activeTab === 'emergency' && (
              <div className="space-y-6">
                {/* Statutory credentials */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Society Credentials Notice</h3>
                      <p className="text-slate-500 text-xs mt-1">Review legal, statutory, and configuration settings of the society.</p>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setModalType('add_info')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Parameter
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {societyInfo.map((item) => (
                      <div key={item.key} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatKey(item.key)}</p>
                        <p className="text-slate-800 font-semibold text-sm mt-1">{item.value}</p>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setEditInfoKey(item.key);
                              setEditInfoValue(item.value);
                              setModalType('edit_info');
                            }}
                            className="absolute top-2.5 right-2.5 p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-indigo-600 font-bold transition-all opacity-0 group-hover:opacity-100"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency Contact booklet */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">One-Tap Emergency Contacts Book</h3>
                      <p className="text-slate-500 text-xs mt-1">Access security guards, local emergency departments, plumbers, and support.</p>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setModalType('emergency')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={16} /> Add Contact
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emergencyContacts.length === 0 ? (
                      <p className="col-span-full text-slate-400 text-sm text-center py-12">No emergency entries.</p>
                    ) : (
                      emergencyContacts.map((c) => (
                        <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center hover:border-slate-300 transition-all">
                          <div>
                            <p className="font-bold text-slate-800 text-base">{c.name}</p>
                            <p className="text-slate-500 text-xs capitalize mt-0.5">{c.role}</p>
                            <p className="text-indigo-600 font-semibold text-sm mt-2">{c.phone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${c.phone}`}
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2.5 rounded-full transition-colors"
                            >
                              <PhoneCall size={18} />
                            </a>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteEmergency(c.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FLAT MANAGEMENT (Admin Only) */}
            {activeTab === 'flats' && user?.role === 'admin' && (
              <div className="space-y-6">
                {/* Pending validation requests (KYC queue inline!) */}
                {pendingApprovals.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 font-bold mb-4">
                      <Clock size={20} />
                      <span>Stakeholder Verification Required ({pendingApprovals.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingApprovals.map((req) => (
                        <div key={req.id} className="bg-white p-4 rounded-lg border border-amber-100 text-xs space-y-2 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-850 text-sm">{req.name}</p>
                              <p className="text-slate-500">{req.email}</p>
                            </div>
                            <span className="bg-indigo-100 text-indigo-750 font-bold px-2 py-0.5 rounded uppercase text-[10px]">
                              {req.resident_type?.replace('_', ' ')}
                            </span>
                          </div>
                          <p><strong>Proposed Flat:</strong> Flat {req.flat_number} ({req.block} Block, Floor {req.floor})</p>
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleApprovePendingUser(req.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-[10px] flex items-center gap-1"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleApprovePendingUser(req.id, false)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded border border-red-200 text-[10px] flex items-center gap-1"
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flat registry list */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Physical Units Inventory</h3>
                      <p className="text-slate-500 text-xs mt-1">Manage physical society apartments and assign verified resident occupants.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Filter flat number/block..."
                          value={flatSearch}
                          onChange={(e) => setFlatSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-350 rounded-lg text-xs bg-white w-60 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => setModalType('create_flat')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={16} /> Add Flat Asset
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFlats.map((flat) => {
                      const resident = getResidentForFlat(flat.id);
                      return (
                        <div key={flat.id} className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-xl flex items-center justify-between transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-base border border-indigo-100">
                              {flat.flat_number}
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Block {flat.block} • Floor {flat.floor}</p>
                              {resident ? (
                                <p className="text-emerald-700 font-bold text-xs mt-0.5">{resident.name}</p>
                              ) : (
                                <p className="text-red-500 font-bold text-[10px] mt-0.5">Vacant / Unassigned</p>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            {resident ? (
                              <button
                                onClick={() => handleVacateFlat(flat)}
                                className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                              >
                                Vacate
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedFlatForAssign(flat);
                                  setModalType('assign_flat');
                                }}
                                className="border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: KYC approvals (Admin) */}
            {activeTab === 'approvals' && user?.role === 'admin' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <div className="pb-4 border-b border-slate-100 mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">Onboarding Verification Desk</h3>
                  <p className="text-slate-500 text-xs mt-1">Review pending resident flat assignments and approve/reject profiles.</p>
                </div>

                <div className="space-y-4">
                  {pendingApprovals.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-sm">Waiting room is empty. No pending onboarding registrations.</p>
                  ) : (
                    pendingApprovals.map((req) => (
                      <div key={req.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1.5 text-xs text-slate-655">
                          <h4 className="font-bold text-slate-800 text-base">{req.name}</h4>
                          <p><strong>Email:</strong> {req.email}</p>
                          <p><strong>Phone:</strong> {req.phone || 'Not provided'}</p>
                          <p><strong>Desired flat:</strong> Flat {req.flat_number} ({req.block} Block, Floor {req.floor})</p>
                          <p><strong>Occupancy Type:</strong> <span className="capitalize">{req.resident_type?.replace('_', ' ')}</span></p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprovePendingUser(req.id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <Check size={14} /> Verify &amp; Admit
                          </button>
                          <button
                            onClick={() => handleApprovePendingUser(req.id, false)}
                            className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
                <div className="pb-4 border-b border-slate-100 mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">Settings & Profile Settings</h3>
                  <p className="text-slate-500 text-xs mt-1">Configure profile notifications, update contact info, or revolve passwords.</p>
                </div>

                {(settingsSuccess || settingsError) && (
                  <div className={`p-3 rounded-lg text-xs font-semibold mb-6 ${
                    settingsSuccess ? 'bg-emerald-50 border border-emerald-200 text-emerald-705' : 'bg-red-50 border border-red-200 text-red-750'
                  }`}>
                    {settingsSuccess || settingsError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Update Information</h4>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ''))}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">UPI Address (Reimbursements Payout)</label>
                      <input
                        type="text"
                        placeholder="e.g. name@okhdfcbank"
                        value={paymentAddress}
                        onChange={(e) => setPaymentAddress(e.target.value)}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                    >
                      Save Profile Updates
                    </button>
                  </form>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Rotate Password</h4>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Old Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* DYNAMIC MODALS LAYER */}
      {modalType === 'announcement' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBlastAnnouncement} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Broadcast Announcement</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notice Headline</label>
              <input type="text" required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Urgent Water Shutdown" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notice Details</label>
              <textarea required value={annBody} onChange={(e) => setAnnBody(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={4} placeholder="Description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Priority Weight</label>
                <select value={annPriority} onChange={(e) => setAnnPriority(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Attachment File</label>
                <input type="file" onChange={(e) => setAnnFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1 text-xs bg-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Send Broadcast</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bill cycle modal */}
      {modalType === 'bill' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateBill} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Generate Billing Cycle</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cycle Title</label>
              <input type="text" required value={newBill.title} onChange={(e) => setNewBill({...newBill, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Jan 2026 Maintenance" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea value={newBill.description} onChange={(e) => setNewBill({...newBill, description: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} placeholder="Description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Base Amount (₹)</label>
                <input type="number" required value={newBill.amount} onChange={(e) => setNewBill({...newBill, amount: parseInt(e.target.value) || 0})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select value={newBill.bill_type} onChange={(e) => setNewBill({...newBill, bill_type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="maintenance">Maintenance</option>
                  <option value="extra">Extra Charge</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input type="date" required value={newBill.due_date} onChange={(e) => setNewBill({...newBill, due_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Generate</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bill Manual Receipt Modal */}
      {modalType === 'receipt' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUploadBillReceipt} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Upload manual Receipt / Proof</h3>
            <p className="text-xs text-slate-500">Attach the photo/PDF of your physical payment voucher or bank transfer receipt for verification.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Receipt File</label>
              <input type="file" required onChange={(e) => setBillReceiptFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Submit Receipt</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Helpdesk raise complaint modal */}
      {modalType === 'complaint' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRaiseComplaint} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Raise Grievance Ticket</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select value={complaintCategory} onChange={(e) => setComplaintCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="cleaning">Cleaning</option>
                <option value="security">Security</option>
                <option value="parking">Parking</option>
                <option value="lift">Lift Issues</option>
                <option value="water supply">Water Supply</option>
                <option value="other">Other Grievances</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ticket Headline</label>
              <input type="text" required value={complaintTitle} onChange={(e) => setComplaintTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Water leakage in restroom" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Grievance Details</label>
              <textarea required value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={3} placeholder="Please provide specific location/details..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence File (Image/Photo)</label>
              <input type="file" onChange={(e) => setComplaintFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Raise Ticket</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Document Upload Modal */}
      {modalType === 'document' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUploadDocument} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Upload Archive Document</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Document Title</label>
              <input type="text" required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="AGM Meeting Minutes 2026" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brief Description</label>
              <textarea value={docDesc} onChange={(e) => setDocDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} placeholder="Description..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select File (PDF / Image)</label>
              <input type="file" required onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Upload File</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Society expense modal */}
      {modalType === 'expense' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleLogExpense} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Log Society Expense</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Title</label>
              <input type="text" required value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Lift Maintenance Services" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} placeholder="Details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Spent (₹)</label>
                <input type="number" required value={expenseAmount} onChange={(e) => setExpenseAmount(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Spend Date</label>
                <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Invoice File</label>
              <input type="file" onChange={(e) => setExpenseFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Record Expense</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Reimbursement create modal */}
      {modalType === 'reimbursement' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRaiseReimbursement} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">File Payout Claim</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Title</label>
              <input type="text" required value={reimbTitle} onChange={(e) => setReimbTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Purchased Corridor Bulbs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Justification</label>
              <textarea required value={reimbDesc} onChange={(e) => setReimbDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} placeholder="Explain why this expense was made..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Claimed (₹)</label>
                <input type="number" required value={reimbAmount} onChange={(e) => setReimbAmount(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Purchase</label>
                <input type="date" required value={reimbDate} onChange={(e) => setReimbDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select value={reimbCategory} onChange={(e) => setReimbCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="event">Event Organization</option>
                  <option value="other">Other Stuff</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Receipt Invoice File</label>
                <input type="file" onChange={(e) => setReimbFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Submit Claim</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Poll modal */}
      {modalType === 'poll' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePoll} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Launch Opinion Poll</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Poll Question</label>
              <input type="text" required value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Paint society walls next month?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Context Description</label>
              <textarea value={pollDesc} onChange={(e) => setPollDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} placeholder="Explain options/decisions..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Voting Options</label>
                <input type="text" disabled value={pollOptions.join(', ')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 cursor-not-allowed text-slate-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Close Deadline Date</label>
                <input type="date" required value={pollDeadline} onChange={(e) => setPollDeadline(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Launch Poll</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Emergency Add Modal */}
      {modalType === 'emergency' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddEmergency} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Add Emergency Contact</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
              <input type="text" required value={emergName} onChange={(e) => setEmergName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Gate Security Desk" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Telephone Number</label>
                <input type="text" required value={emergPhone} onChange={(e) => setEmergPhone(e.target.value.replace(/\D/g, ''))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role Type</label>
                <input type="text" required value={emergRole} onChange={(e) => setEmergRole(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="security, board, plumber" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Add Contact</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit statutory info modal */}
      {modalType === 'edit_info' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateSocietyInfo} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Modify {formatKey(editInfoKey)}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Updated Value</label>
              <textarea required value={editInfoValue} onChange={(e) => setEditInfoValue(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Save Changes</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add statutory info attribute modal */}
      {modalType === 'add_info' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddSocietyInfo} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">New Society Attribute</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Parameter Descriptor (e.g. GST Number)</label>
              <input type="text" required value={newInfoKey} onChange={(e) => setNewInfoKey(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="GST Number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Value</label>
              <textarea required value={newInfoValue} onChange={(e) => setNewInfoValue(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Commit Record</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Create Flat Asset Modal */}
      {modalType === 'create_flat' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFlatSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Register Flat Unit Asset</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Flat / Unit Number</label>
              <input type="text" required value={newFlatNumber} onChange={(e) => setNewFlatNumber(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="402" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Block / Wing</label>
              <input type="text" required value={newFlatBlock} onChange={(e) => setNewFlatBlock(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="A" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Floor Level</label>
              <input type="text" required value={newFlatFloor} onChange={(e) => setNewFlatFloor(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" placeholder="4" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">Commit Asset</button>
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Flat Resident Modal */}
      {modalType === 'assign_flat' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md flex flex-col h-[400px]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Locate Occupant for {selectedFlatForAssign?.flat_number}</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search name or email..."
                value={residentAssignSearch}
                onChange={(e) => setResidentAssignSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-slate-350 rounded-lg text-xs bg-white w-full focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAssignResidents.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleAssignResident(res.id)}
                  className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-indigo-50/20 border border-slate-150 rounded-lg cursor-pointer text-xs"
                >
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                    {res.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{res.name}</p>
                    <p className="text-slate-500 text-[10px]">{res.email}</p>
                  </div>
                  {res.flat_id && res.flat_id !== selectedFlatForAssign?.id && (
                    <span className="ml-auto text-[9px] bg-amber-100 text-amber-705 px-2 py-0.5 rounded font-bold">Occupied</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CELEBRATION SUCCESS MODAL OVERLAY */}
      {successPayment && successPaymentBill && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 w-full max-w-sm flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-emerald-200/50">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-2xl tracking-tight">Payment Successful!</h3>
              <p className="text-slate-500 text-xs mt-1">for {successPaymentBill.title}</p>
            </div>
            <p className="text-3xl font-extrabold text-indigo-650 tracking-tight">₹{Number(successPayment.amount).toLocaleString('en-IN')}</p>
            
            <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Method</span>
                <span className="font-bold text-slate-700">Razorpay</span>
              </div>
              <div className="h-[1px] bg-slate-200"></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Ref</span>
                <span className="font-bold text-slate-700 font-mono text-[10px] truncate max-w-[150px]">{successPayment.transaction_ref || '—'}</span>
              </div>
              <div className="h-[1px] bg-slate-200"></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid At</span>
                <span className="font-bold text-slate-700">{new Date(successPayment.paid_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full space-y-2.5 pt-2">
              <a
                href={billsAPI.getReceiptUrl(successPayment.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex justify-center items-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                <Download size={14} /> Download Receipt (PDF)
              </a>
              <button
                onClick={() => {
                  setUploadingReceiptBillId(successPaymentBill.id);
                  setSuccessPayment(null);
                  setSuccessPaymentBill(null);
                  setModalType('receipt');
                }}
                className="w-full border border-slate-300 hover:bg-slate-50 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Upload payment screenshot
              </button>
              <button
                onClick={() => {
                  setSuccessPayment(null);
                  setSuccessPaymentBill(null);
                }}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
