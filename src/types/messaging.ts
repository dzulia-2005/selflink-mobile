import { User } from './user';

export interface ThreadMember {
  id: number;
  user: User;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ThreadParticipantPreview {
  body: string | null;
  created_at: string | null;
}

export interface Thread {
  id: string;
  is_group: boolean;
  title: string | null;
  members: ThreadMember[];
  participants: User[];
  last_message: ThreadParticipantPreview | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateThreadPayload {
  title?: string;
  is_group?: boolean;
  participant_ids: number[];
  initial_message?: string;
}

export interface Message {
  id: string;
  thread: string;
  sender: User;
  body: string;
  type: string;
  meta: Record<string, unknown> | null;
  attachments?: MessageAttachment[];
  status?: MessageStatus;
  client_uuid?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  reactions?: MessageReactionSummary[];
  replyTo?: MessageReplyPreview | null;
  created_at: string;
}

export interface SendMessagePayload {
  thread: string;
  body: string;
  type?: string;
  meta?: Record<string, unknown> | null;
  client_uuid?: string;
  attachments?: PendingAttachment[];
}

export type MessageStatus =
  | 'queued'
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MessageAttachment = {
  id: string;
  url: string;
  type: MessageAttachmentType;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type MessageAttachmentType = 'image' | 'video';

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByCurrentUser?: boolean;
};

export type MessageReplyPreview = {
  id: string;
  senderId: string;
  senderName?: string | null;
  textPreview?: string | null;
  hasAttachments?: boolean;
};

export type PendingAttachment = {
  uri: string;
  type: MessageAttachmentType;
  mime: string;
  width?: number;
  height?: number;
  duration?: number;
  name?: string;
};
