import { apiClient } from '@services/api/client';

export type MentorTaskStatus = 'pending' | 'completed' | 'skipped';

export type MentorTask = {
  id: number;
  task: string;
  due_date: string;
  status: MentorTaskStatus;
  created_at: string;
  updated_at: string;
};

export type MentorTaskListResponse = {
  next: string | null;
  previous: string | null;
  results: MentorTask[];
};

export type MentorTaskQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type MentorTaskPayload = {
  task: string;
  due_date: string;
  status?: MentorTaskStatus;
};

export type MentorTaskPartialPayload = Partial<MentorTaskPayload>;

export async function listMentorTasks(
  params: MentorTaskQuery = {},
): Promise<MentorTaskListResponse> {
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
  const path = `/mentor/tasks/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MentorTaskListResponse>(path, { method: 'GET' });
}

export async function listTodayMentorTasks(): Promise<MentorTaskListResponse> {
  return apiClient.request<MentorTaskListResponse>('/mentor/tasks/today/', {
    method: 'GET',
  });
}

export async function createMentorTask(payload: MentorTaskPayload): Promise<MentorTask> {
  return apiClient.request<MentorTask>('/mentor/tasks/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMentorTask(id: number): Promise<MentorTask> {
  return apiClient.request<MentorTask>(`/mentor/tasks/${id}/`, {
    method: 'GET',
  });
}

export async function updateMentorTask(
  id: number,
  payload: MentorTaskPayload,
): Promise<MentorTask> {
  return apiClient.request<MentorTask>(`/mentor/tasks/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchMentorTask(
  id: number,
  payload: MentorTaskPartialPayload,
): Promise<MentorTask> {
  return apiClient.request<MentorTask>(`/mentor/tasks/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteMentorTask(id: number): Promise<void> {
  await apiClient.request(`/mentor/tasks/${id}/`, { method: 'DELETE' });
}
