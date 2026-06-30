// User & Auth
export type UserRole = "delivery_manager" | "product_manager" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Work Item Statuses
export type ImplementationStatus =
  | "not_started"
  | "in_progress"
  | "waiting_for_venue"
  | "waiting_for_internal_team"
  | "blocked"
  | "completed";

export type CRStatus =
  | "new"
  | "analysis"
  | "in_progress"
  | "testing"
  | "waiting_for_review"
  | "blocked"
  | "completed"
  | "delayed";

export type ProductUpdateStatus =
  | "planned"
  | "development"
  | "testing"
  | "deployment"
  | "blocked"
  | "completed";

export type Priority = "high" | "medium" | "low";
export type CRSource = "venue_request" | "support_team_request";

// Venue Implementation
export interface VenueImplementation {
  id: number;
  iwo_number: string;
  venue_name: string;
  product_name: string;
  assigned_to_id: number | null;
  created_by_id: number;
  start_date: string | null;
  target_date: string | null;
  status: ImplementationStatus;
  notes: string | null;
  last_updated_at: string;
  created_at: string;
  attention_required?: boolean;
  assigned_to?: User;
  created_by?: User;
}

export interface VenueImplementationCreate {
  iwo_number: string;
  venue_name: string;
  product_name: string;
  assigned_to_id?: number;
  start_date?: string;
  target_date?: string;
  status?: ImplementationStatus;
  notes?: string;
}

// Change Request
export interface ChangeRequest {
  id: number;
  cr_number: string;
  venue_name: string | null;
  product: string;
  request_title: string;
  requested_by: string;
  assigned_to_id: number | null;
  created_by_id: number;
  source: CRSource;
  priority: Priority;
  status: CRStatus;
  notes: string | null;
  last_updated_at: string;
  created_at: string;
  assigned_to?: User;
  created_by?: User;
}

export interface ChangeRequestCreate {
  cr_number: string;
  venue_name?: string;
  product: string;
  request_title: string;
  requested_by: string;
  assigned_to_id?: number;
  source: CRSource;
  priority: Priority;
  status?: CRStatus;
  notes?: string;
}

// Product Update
export interface ProductUpdate {
  id: number;
  update_name: string;
  version_number: string | null;
  product: string;
  assigned_to_id: number | null;
  created_by_id: number;
  start_date: string | null;
  planned_release_date: string | null;
  status: ProductUpdateStatus;
  notes: string | null;
  last_updated_at: string;
  created_at: string;
  approaching_release?: boolean;
  assigned_to?: User;
  created_by?: User;
}

export interface ProductUpdateCreate {
  update_name: string;
  version_number?: string;
  product: string;
  assigned_to_id?: number;
  start_date?: string;
  planned_release_date?: string;
  status?: ProductUpdateStatus;
  notes?: string;
}

// Notifications
export type NotificationType =
  | "new_assignment"
  | "item_blocked"
  | "item_delayed"
  | "target_date_exceeded";
export type ItemType = "implementation" | "change_request" | "product_update";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  item_type: ItemType;
  item_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Dashboard
export interface DashboardSummary {
  active_implementations: number;
  active_change_requests: number;
  active_product_updates: number;
  blocked_items: number;
  delayed_items: number;
  completed_items: number;
  attention_required: number;
}

export interface BlockedItem {
  id: number;
  title: string;
  item_type: ItemType;
  venue_name?: string;
  assigned_to?: User;
  last_updated_at: string;
}

export interface RecentActivity {
  id: number;
  item_type: ItemType;
  item_id: number;
  item_title: string;
  action: string;
  actor: User;
  created_at: string;
}

// Status History
export interface StatusHistoryEntry {
  id: number;
  item_type: ItemType;
  item_id: number;
  old_status: string;
  new_status: string;
  notes: string | null;
  changed_by_id: number;
  changed_at: string;
  changed_by?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
  };
}

// Comments
export interface Comment {
  id: number;
  author_id: number;
  body: string;
  created_at: string;
  author?: User;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Search
export interface SearchResultBase {
  id: number;
  item_type: ItemType;
  title: string;
  status: string;
  last_updated_at: string;
  created_at: string;
  assigned_to_name?: string;
  venue_name?: string;
  product?: string;
}

export interface ImplementationSearchResult extends SearchResultBase {
  item_type: "implementation";
  iwo_number: string;
  venue_name: string;
}

export interface ChangeRequestSearchResult extends SearchResultBase {
  item_type: "change_request";
  cr_number: string;
  priority: string;
}

export interface ProductUpdateSearchResult extends SearchResultBase {
  item_type: "product_update";
  product: string;
  version_number?: string;
}

export type SearchResultItem =
  | ImplementationSearchResult
  | ChangeRequestSearchResult
  | ProductUpdateSearchResult;
