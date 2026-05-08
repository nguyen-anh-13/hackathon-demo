export const GITLAB_TICKET_QUEUE = 'gitlab-ticket-queue';
/** Nhận payload webhook từ Google Sheets → dịch Gemini → upsert issue vào DB → sync sheet đích */
export const UPSERT_ISSUE_FROM_SHEET_JOB = 'issue.upsert-from-sheet';
/** Lấy issue đã lưu trong DB → tạo issue trên GitLab API */
export const PUSH_ISSUE_TO_GITLAB_JOB = 'issue.push-to-gitlab';

export const TEAMS_NOTIFICATION_QUEUE = 'teams-notification-queue';
/** Gửi thông báo issue qua Teams Workflow webhook */
export const NOTIFY_TEAMS_ISSUE_JOB = 'teams.notify-issue';
