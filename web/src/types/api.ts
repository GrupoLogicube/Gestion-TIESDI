export type UserRole = 'organizer' | 'provider';

export type ModuleKey =
  | 'providers'
  | 'inventory'
  | 'rsvp'
  | 'schedule'
  | 'budget'
  | 'tasks';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  has_smtp_configured: boolean;
  smtp_email: string | null;
  roles: UserRole[];
  permissions: string[];
  created_at: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: User;
}

export interface EventModule {
  id: number;
  module_key: ModuleKey;
  is_enabled: boolean;
  settings: Record<string, unknown> | null;
}

export interface EventItem {
  id: number;
  organizer_id: number;
  title: string;
  description: string | null;
  location: string | null;
  location_url: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  modules: EventModule[];
  created_at: string;
  updated_at: string;
}

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface Guest {
  id: number;
  event_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  passes_count: number;
  confirmed_passes: number;
  rsvp_status: RsvpStatus;
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedMagicLink {
  id: number;
  guest_id: number;
  token: string;
  rsvp_url: string;
  expires_at: string | null;
}

export interface PublicRsvpData {
  event: {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    location_url: string | null;
    starts_at: string;
    ends_at: string | null;
  };
  guest: {
    id: number;
    name: string;
    passes_count: number;
    confirmed_passes: number;
    rsvp_status: RsvpStatus;
    notes: string | null;
    responded_at: string | null;
  };
}

export interface Provider {
  id: number;
  organizer_id: number;
  user_id: number | null;
  business_name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface ProviderChecklistItem {
  id: number;
  event_provider_id: number;
  item_name: string;
  quantity: number;
  is_prepared: boolean;
  prepared_at: string | null;
  notes: string | null;
}

export interface EventProvider {
  id: number;
  event_id: number;
  provider_id: number;
  user_id: number | null;
  service_description: string | null;
  agreed_cost: string | number;
  advance_paid: string | number;
  setup_at: string | null;
  show_at: string | null;
  teardown_at: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  provider: Provider;
  checklist_items: ProviderChecklistItem[];
}

export type InventoryStatus = 'pending' | 'checked_in' | 'checked_out' | 'partial';

export interface InventoryItem {
  id: number;
  event_id: number;
  name: string;
  category: string | null;
  unit: string;
  planned_qty: number;
  actual_qty: number;
  status: InventoryStatus;
  checked_in_at: string | null;
  checked_out_at: string | null;
  notes: string | null;
}
