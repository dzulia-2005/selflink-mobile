import { apiClient } from '@services/api/client';

// Gift Types
export type GiftType = {
  id: number;
  name: string;
  price_cents: number;
  art_url?: string;
  metadata?: Record<string, unknown>;
};

export type GiftTypeListResponse = {
  next: string | null;
  previous: string | null;
  results: GiftType[];
};

export type GiftTypePayload = {
  name: string;
  price_cents: number;
  art_url?: string;
  metadata?: Record<string, unknown>;
};

export type GiftTypePartialPayload = Partial<GiftTypePayload>;

export type PaginatedQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

function buildQuery(path: string, params: PaginatedQuery = {}): string {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  const qs = searchParams.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
}

export async function listGiftTypes(
  params: PaginatedQuery = {},
): Promise<GiftTypeListResponse> {
  return apiClient.request<GiftTypeListResponse>(buildQuery('/payments/gifts/', params), {
    method: 'GET',
  });
}

export async function createGiftType(payload: GiftTypePayload): Promise<GiftType> {
  return apiClient.request<GiftType>('/payments/gifts/', {
    method: 'POST',
    body: payload,
  });
}

export async function getGiftType(id: number): Promise<GiftType> {
  return apiClient.request<GiftType>(`/payments/gifts/${id}/`, { method: 'GET' });
}

export async function updateGiftType(
  id: number,
  payload: GiftTypePayload,
): Promise<GiftType> {
  return apiClient.request<GiftType>(`/payments/gifts/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchGiftType(
  id: number,
  payload: GiftTypePartialPayload,
): Promise<GiftType> {
  return apiClient.request<GiftType>(`/payments/gifts/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteGiftType(id: number): Promise<void> {
  await apiClient.request(`/payments/gifts/${id}/`, { method: 'DELETE' });
}

// Plans
export type Plan = {
  id: number;
  name: string;
  price_cents: number;
  interval: string;
  features?: Record<string, unknown>;
  is_active: boolean;
};

export type PlanListResponse = {
  next: string | null;
  previous: string | null;
  results: Plan[];
};

export type PlanPayload = {
  name: string;
  price_cents: number;
  interval: string;
  features?: Record<string, unknown>;
  is_active?: boolean;
};

export type PlanPartialPayload = Partial<PlanPayload>;

export async function listPlans(params: PaginatedQuery = {}): Promise<PlanListResponse> {
  return apiClient.request<PlanListResponse>(buildQuery('/payments/plans/', params), {
    method: 'GET',
  });
}

export async function createPlan(payload: PlanPayload): Promise<Plan> {
  return apiClient.request<Plan>('/payments/plans/', {
    method: 'POST',
    body: payload,
  });
}

export async function getPlan(id: number): Promise<Plan> {
  return apiClient.request<Plan>(`/payments/plans/${id}/`, { method: 'GET' });
}

export async function updatePlan(id: number, payload: PlanPayload): Promise<Plan> {
  return apiClient.request<Plan>(`/payments/plans/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchPlan(id: number, payload: PlanPartialPayload): Promise<Plan> {
  return apiClient.request<Plan>(`/payments/plans/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deletePlan(id: number): Promise<void> {
  await apiClient.request(`/payments/plans/${id}/`, { method: 'DELETE' });
}

// Subscriptions
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | string;

export type Subscription = {
  id: number;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionListResponse = {
  next: string | null;
  previous: string | null;
  results: Subscription[];
};

export type SubscriptionPayload = {
  plan_id: number;
  status?: SubscriptionStatus;
};

export type SubscriptionPartialPayload = Partial<SubscriptionPayload>;

export async function listSubscriptions(
  params: PaginatedQuery = {},
): Promise<SubscriptionListResponse> {
  return apiClient.request<SubscriptionListResponse>(
    buildQuery('/payments/subscriptions/', params),
    { method: 'GET' },
  );
}

export async function createSubscription(
  payload: SubscriptionPayload,
): Promise<Subscription> {
  return apiClient.request<Subscription>('/payments/subscriptions/', {
    method: 'POST',
    body: payload,
  });
}

export async function getSubscription(id: number): Promise<Subscription> {
  return apiClient.request<Subscription>(`/payments/subscriptions/${id}/`, {
    method: 'GET',
  });
}

export async function updateSubscription(
  id: number,
  payload: SubscriptionPayload,
): Promise<Subscription> {
  return apiClient.request<Subscription>(`/payments/subscriptions/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchSubscription(
  id: number,
  payload: SubscriptionPartialPayload,
): Promise<Subscription> {
  return apiClient.request<Subscription>(`/payments/subscriptions/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteSubscription(id: number): Promise<void> {
  await apiClient.request(`/payments/subscriptions/${id}/`, { method: 'DELETE' });
}

// Stripe Checkout
export type StripeCheckoutSessionPayload = {
  plan_id?: number;
};

export type StripeCheckoutSessionResponse = {
  url: string;
};

export async function createStripeCheckoutSession(
  payload: StripeCheckoutSessionPayload = {},
): Promise<StripeCheckoutSessionResponse> {
  return apiClient.request<StripeCheckoutSessionResponse>(
    '/payments/stripe/checkout-session/',
    {
      method: 'POST',
      body: payload,
    },
  );
}
