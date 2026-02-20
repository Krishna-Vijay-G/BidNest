// ============================================
// BidNest Frontend: API Client
// All requests go to the Express backend (port 5000)
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ---- Token Management ----

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bidnest_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bidnest_refresh_token');
}

export function setTokens(access: string, refresh: string, expiresAt?: number) {
  localStorage.setItem('bidnest_access_token', access);
  localStorage.setItem('bidnest_refresh_token', refresh);
  if (expiresAt) localStorage.setItem('bidnest_token_expires', expiresAt.toString());
}

export function clearTokens() {
  localStorage.removeItem('bidnest_access_token');
  localStorage.removeItem('bidnest_refresh_token');
  localStorage.removeItem('bidnest_token_expires');
}

export function isTokenExpired(): boolean {
  const expires = localStorage.getItem('bidnest_token_expires');
  if (!expires) return true;
  return Date.now() / 1000 > parseInt(expires) - 60; // 60s buffer
}

// ---- Core Fetch Wrapper ----

export interface ApiResult<T> {
  data: T;
  error: string | null;
}

async function refreshTokenIfNeeded(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;

  if (!isTokenExpired()) return token;

  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const result = await res.json();
    if (result.success && result.data) {
      setTokens(result.data.access_token, result.data.refresh_token, result.data.expires_at);
      return result.data.access_token;
    }

    clearTokens();
    return null;
  } catch {
    return token; // Use existing token if refresh fails
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = await refreshTokenIfNeeded();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await res.json();

    if (!res.ok) {
      return { success: false, error: result.error || `Request failed (${res.status})` };
    }

    return result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[api] ${path} - Request timeout`);
      return { success: false, error: 'Request timeout - please check your connection' };
    }
    console.error(`[api] ${path}`, err);
    return { success: false, error: 'Network error - is the backend running?' };
  }
}

// ---- Auth ----

export async function apiLogin(email: string, password: string) {
  const result = await apiFetch<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: any;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data) {
    setTokens(result.data.access_token, result.data.refresh_token, result.data.expires_at);
  }

  return result;
}

export async function apiRegister(email: string, password: string, full_name: string, phone?: string) {
  const result = await apiFetch<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: any;
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name, phone }),
  });

  if (result.success && result.data) {
    setTokens(result.data.access_token, result.data.refresh_token, result.data.expires_at);
  }

  return result;
}

export async function apiLogout() {
  clearTokens();
}

export async function apiGetMe() {
  return apiFetch<any>('/api/auth/me');
}

// ---- Dashboard ----

export interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalMembers: number;
  totalCollected: number;
  totalPayouts: number;
  totalCommissions: number;
  pendingPayments: number;
  overduePayments: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentGroups: any[];
  recentAuctions: any[];
  recentPayments: any[];
}

export async function fetchDashboardData(): Promise<ApiResult<DashboardData>> {
  const result = await apiFetch<DashboardData>('/api/dashboard');
  return {
    data: result.data || {
      stats: { totalGroups: 0, activeGroups: 0, completedGroups: 0, totalMembers: 0, totalCollected: 0, totalPayouts: 0, totalCommissions: 0, pendingPayments: 0, overduePayments: 0 },
      recentGroups: [],
      recentAuctions: [],
      recentPayments: [],
    },
    error: result.error || null,
  };
}

// ---- Groups ----

export async function fetchGroups(): Promise<ApiResult<any[]>> {
  const result = await apiFetch<any[]>('/api/groups');
  return { data: result.data || [], error: result.error || null };
}

export interface GroupDetailData {
  group: any;
  members: any[];
  auctions: any[];
  allAppMembers: any[];
}

export async function fetchGroupDetail(groupId: string): Promise<ApiResult<GroupDetailData>> {
  const result = await apiFetch<GroupDetailData>(`/api/groups/${groupId}`);
  return {
    data: result.data || { group: null, members: [], auctions: [], allAppMembers: [] },
    error: result.error || null,
  };
}

// ---- Members (app_members) ----

export interface MembersPageData {
  members: any[];
  stats: Record<string, { groups: number; totalPaid: number; totalDividends: number }>;
}

export async function fetchMembersPageData(): Promise<ApiResult<MembersPageData>> {
  const result = await apiFetch<MembersPageData>('/api/members');
  return {
    data: result.data || { members: [], stats: {} },
    error: result.error || null,
  };
}

export interface MemberDetailData {
  member: any;
  memberships: any[];
  payments: any[];
  dividends: any[];
}

export async function fetchMemberDetail(memberId: string): Promise<ApiResult<MemberDetailData>> {
  const result = await apiFetch<MemberDetailData>(`/api/members/${memberId}`);
  return {
    data: result.data || { member: null, memberships: [], payments: [], dividends: [] },
    error: result.error || null,
  };
}

// ---- Auctions ----

export interface AuctionsPageData {
  auctions: any[];
  groups: any[];
}

export async function fetchAuctionsPageData(): Promise<ApiResult<AuctionsPageData>> {
  const result = await apiFetch<AuctionsPageData>('/api/auctions');
  return {
    data: result.data || { auctions: [], groups: [] },
    error: result.error || null,
  };
}

// ---- Payments ----

export interface PaymentsPageData {
  payments: any[];
  groups: any[];
}

export async function fetchPaymentsPageData(): Promise<ApiResult<PaymentsPageData>> {
  const result = await apiFetch<PaymentsPageData>('/api/payments');
  return {
    data: result.data || { payments: [], groups: [] },
    error: result.error || null,
  };
}

// ---- Notifications ----

export async function fetchNotifications(): Promise<ApiResult<any[]>> {
  const result = await apiFetch<any[]>('/api/notifications');
  return { data: result.data || [], error: result.error || null };
}

// ---- Transactions ----

export interface TransactionsPageData {
  transactions: any[];
  groups: any[];
}

export async function fetchTransactionsPageData(): Promise<ApiResult<TransactionsPageData>> {
  const result = await apiFetch<TransactionsPageData>('/api/transactions');
  return {
    data: result.data || { transactions: [], groups: [] },
    error: result.error || null,
  };
}

// ---- Action Helpers (mutations) ----

export async function createChitGroup(input: any) {
  const result = await apiFetch('/api/groups', { method: 'POST', body: JSON.stringify(input) });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function updateChitGroupStatus(groupId: string, status: string) {
  const result = await apiFetch(`/api/groups/${groupId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  return result.success ? { success: true } : { error: result.error };
}

export async function addMemberToGroup(chitGroupId: string, appMemberId: string, ticketNumber: number) {
  const result = await apiFetch(`/api/groups/${chitGroupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ app_member_id: appMemberId, ticket_number: ticketNumber }),
  });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function removeMemberFromGroup(groupId: string, memberId: string) {
  const result = await apiFetch(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  return result.success ? { success: true } : { error: result.error };
}

export async function createAuction(chitGroupId: string, monthNumber: number, auctionDate: string) {
  const result = await apiFetch('/api/auctions', {
    method: 'POST',
    body: JSON.stringify({ chit_group_id: chitGroupId, month_number: monthNumber, auction_date: auctionDate }),
  });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function conductAuction(auctionId: string, winningMemberId: string, bidAmount: number) {
  const result = await apiFetch(`/api/auctions/${auctionId}/conduct`, {
    method: 'POST',
    body: JSON.stringify({ winning_member_id: winningMemberId, bid_amount: bidAmount }),
  });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function recordPayment(paymentId: string, amountPaid: number, notes?: string) {
  const result = await apiFetch(`/api/payments/${paymentId}/record`, {
    method: 'POST',
    body: JSON.stringify({ amount_paid: amountPaid, notes }),
  });
  return result.success ? { success: true } : { error: result.error };
}

export async function sendPaymentReminders(chitGroupId: string, monthNumber: number) {
  const result = await apiFetch('/api/payments/reminders', {
    method: 'POST',
    body: JSON.stringify({ chit_group_id: chitGroupId, month_number: monthNumber }),
  });
  return result.success ? { success: true, count: (result.data as any)?.count } : { error: result.error };
}

export async function createAppMember(input: any) {
  const result = await apiFetch('/api/members', { method: 'POST', body: JSON.stringify(input) });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function updateAppMember(id: string, input: any) {
  const result = await apiFetch(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function deleteAppMember(id: string) {
  const result = await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
  return result.success ? { success: true } : { error: result.error };
}

export async function createUser(input: any) {
  const result = await apiFetch('/api/auth/create-user', { method: 'POST', body: JSON.stringify(input) });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function markNotificationRead(notificationId: string) {
  const result = await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
  return result.success ? { success: true } : { error: result.error };
}

export async function markAllNotificationsRead() {
  const result = await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
  return result.success ? { success: true } : { error: result.error };
}

// ---- Profile & Password ----

export async function updateProfile(input: { full_name: string; phone?: string; address?: string }) {
  const result = await apiFetch('/api/auth/profile', { method: 'PUT', body: JSON.stringify(input) });
  return result.success ? { data: result.data } : { error: result.error };
}

export async function changePassword(new_password: string) {
  const result = await apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify({ new_password }) });
  return result.success ? { success: true } : { error: result.error };
}
