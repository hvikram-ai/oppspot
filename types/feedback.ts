// Type definitions for the oppSpot feedback system

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'data_quality'
  | 'integration'
  | 'performance'
  | 'documentation'
  | 'other';

export type FeedbackStatus =
  | 'pending'
  | 'in_review'
  | 'in_progress'
  | 'resolved'
  | 'declined'
  | 'duplicate';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'commented'
  | 'voted'
  | 'followed';

export interface Feedback {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  votes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  admin_response: string | null;
  admin_response_by: string | null;
  admin_response_at: string | null;
  is_public: boolean;
  is_pinned: boolean;
  tags: string[];
  affected_feature: string | null;
  page_url: string | null;
  browser_info: Record<string, any> | null;
  attachment_urls: string[];
  screenshot_url: string | null;
  view_count: number;
}

export interface FeedbackWithUser extends Feedback {
  user_email: string | null;
  admin_response_by_email: string | null;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  user_id: string;
  created_at: string;
}

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  user_id: string;
  parent_comment_id: string | null;
  comment: string;
  is_admin: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  likes_count: number;
}

export interface FeedbackCommentWithUser extends FeedbackComment {
  user_email: string;
}

export interface FeedbackFollower {
  id: string;
  feedback_id: string;
  user_id: string;
  created_at: string;
}

export interface FeedbackActivity {
  id: string;
  feedback_id: string;
  user_id: string | null;
  action: FeedbackActivityAction;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  created_at: string;
}

export interface FeedbackSubmission {
  id: string;
  feedback_id: string | null;
  reference_id: string;
  user_id: string | null;
  user_email: string;
  admin_email_sent: boolean;
  user_email_sent: boolean;
  created_at: string;
}

// Form types
export interface FeedbackSubmissionForm {
  type: FeedbackCategory;
  title: string;
  description: string;
  screenshot: string | null;
  is_public: boolean;
}

// API response types
export interface FeedbackListResponse {
  feedback: (Feedback & { hasVoted?: boolean })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FeedbackDetailResponse {
  feedback: Feedback & { hasVoted?: boolean; hasFollowed?: boolean };
  comments: FeedbackCommentWithUser[];
  activity: FeedbackActivity[];
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  referenceId: string;
  feedbackId: string;
  message: string;
  warning?: string;
  emailsSent: {
    admin: boolean;
    user: boolean;
  };
}

export interface FeedbackVoteResponse {
  voted: boolean;
  votes_count: number;
}

// Statistics
export interface FeedbackStatistics {
  total: number;
  by_status: Record<FeedbackStatus, number>;
  by_category: Record<FeedbackCategory, number>;
  by_priority: Record<FeedbackPriority, number>;
  last_7_days: number;
  last_30_days: number;
  top_voted: Feedback[];
  recent: Feedback[];
}
