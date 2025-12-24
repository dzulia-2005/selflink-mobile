# API Map (Frontend)

- This document lists the API routes the mobile app currently calls, derived from `src/services/api/`.
- It is a navigational reference for frontend contributors, not a full backend contract.
- Routes are relative to `env.apiHttpBaseUrl` and go through `src/services/api/client.ts`.
- Endpoints marked WIP indicate frontend fallbacks or backend dependency in the current code.

## Auth

- Purpose: session creation and refresh.
- Wrappers: `src/services/api/auth.ts`
- Routes:
  - `POST /auth/login/` - Email/password login. WIP (falls back to a mock login on request failure).
  - `POST /auth/register/` - Create a new account.
  - `POST /auth/refresh/` - Refresh access token.

## Users

- Purpose: user discovery, follow graph, and profile settings.
- Wrappers: `src/services/api/user.ts`, `src/services/api/profile.ts`, `src/services/api/posts.ts`
- Routes:
  - `GET /users/` - List users.
  - `GET /users/{id}/` - Fetch a user profile.
  - `POST /users/{id}/follow/` - Follow a user.
  - `DELETE /users/{id}/follow/` - Unfollow a user.
  - `GET /users/{id}/followers/` - List followers.
  - `GET /users/{id}/following/` - List following.
  - `GET /users/me/` - Fetch current user.
  - `PATCH /users/me/` - Update current user fields.
  - `PATCH /me/profile/` - Upload avatar image (multipart).
  - `GET /profile/me/` - Fetch profile settings.
  - `PATCH /profile/me/` - Update profile settings.
  - `GET /search/users/` - Search users.

## Feed/Posts

- Purpose: home feed and post CRUD.
- Wrappers: `src/services/api/feed.ts`, `src/services/api/posts.ts`
- Routes:
  - `GET /feed/home/` - Home feed.
  - `GET /home/highlights/` - Home highlights.
  - `GET /posts/` - List posts.
  - `POST /posts/` - Create post.
  - `GET /posts/{id}/` - Fetch post.
  - `PUT /posts/{id}/` - Replace post.
  - `PATCH /posts/{id}/` - Update post.
  - `DELETE /posts/{id}/` - Delete post.
  - `POST /posts/{id}/like/` - Like post.
  - `POST /posts/{id}/unlike/` - Unlike post.
  - `GET /search/posts/` - Search posts.

## Comments

- Purpose: comments on posts.
- Wrappers: `src/services/api/comments.ts`
- Routes:
  - `GET /comments/` - List comments.
  - `POST /comments/` - Create comment.
  - `GET /comments/{id}/` - Fetch comment.
  - `PUT /comments/{id}/` - Replace comment.
  - `PATCH /comments/{id}/` - Update comment.
  - `DELETE /comments/{id}/` - Delete comment.

## Messages/Threads

- Purpose: direct messages and conversation threads.
- Wrappers: `src/services/api/messages.ts`, `src/services/api/threads.ts`
- Routes:
  - `GET /threads/` - List threads.
  - `POST /threads/` - Create thread.
  - `GET /threads/{id}/` - Fetch thread.
  - `POST /threads/{id}/read/` - Mark thread read.
  - `GET /threads/{id}/typing/` - Fetch typing status.
  - `POST /threads/{id}/typing/` - Send typing status.
  - `POST /threads/{id}/leave/` - Leave thread.
  - `GET /messages/` - List messages (supports thread filter).
  - `POST /messages/` - Send message.
  - `GET /messages/{id}/` - Fetch message.
  - `PUT /messages/{id}/` - Replace message.
  - `PATCH /messages/{id}/` - Update message.
  - `DELETE /messages/{id}/` - Delete message.

## Mentor

- Purpose: mentor profiles, chat, daily mentor, and tasks.
- Wrappers: `src/services/api/mentor.ts`, `src/services/api/mentorSessions.ts`, `src/services/api/mentorTasks.ts`
- Routes:
  - `GET /mentor/profile/` - List mentor profiles.
  - `POST /mentor/profile/` - Create mentor profile.
  - `GET /mentor/profile/{id}/` - Fetch mentor profile.
  - `PUT /mentor/profile/{id}/` - Replace mentor profile.
  - `PATCH /mentor/profile/{id}/` - Update mentor profile.
  - `DELETE /mentor/profile/{id}/` - Delete mentor profile.
  - `POST /mentor/natal/` - Generate natal mentor response.
  - `GET /mentor/soulmatch/{userId}/` - Fetch soulmatch mentor response.
  - `POST /mentor/daily/entry/` - Create daily mentor entry.
  - `GET /mentor/daily/history/` - Fetch daily mentor history.
  - `GET /mentor/daily/session/{sessionId}/` - Fetch daily mentor session.
  - `POST /mentor/chat/` - Send mentor chat message (also used by `mentorSessions.ts`).
  - `GET /mentor/history/` - Fetch mentor chat history (cursor-based).
  - `GET /mentor/stream/` - Mentor stream URL (constructed client-side).
  - `GET /mentor/tasks/` - List mentor tasks.
  - `GET /mentor/tasks/today/` - List today mentor tasks.
  - `POST /mentor/tasks/` - Create mentor task.
  - `GET /mentor/tasks/{id}/` - Fetch mentor task.
  - `PUT /mentor/tasks/{id}/` - Replace mentor task.
  - `PATCH /mentor/tasks/{id}/` - Update mentor task.
  - `DELETE /mentor/tasks/{id}/` - Delete mentor task.

## Payments

- Purpose: monetization, billing plans, and gifting.
- Wrappers: `src/services/api/payments.ts`, `src/services/api/gifts.ts`
- Routes:
  - `GET /payments/gifts/` - List gift types.
  - `POST /payments/gifts/` - Create gift type.
  - `GET /payments/gifts/{id}/` - Fetch gift type.
  - `PUT /payments/gifts/{id}/` - Replace gift type.
  - `PATCH /payments/gifts/{id}/` - Update gift type.
  - `DELETE /payments/gifts/{id}/` - Delete gift type.
  - `GET /payments/plans/` - List plans.
  - `POST /payments/plans/` - Create plan.
  - `GET /payments/plans/{id}/` - Fetch plan.
  - `PUT /payments/plans/{id}/` - Replace plan.
  - `PATCH /payments/plans/{id}/` - Update plan.
  - `DELETE /payments/plans/{id}/` - Delete plan.
  - `GET /payments/subscriptions/` - List subscriptions.
  - `POST /payments/subscriptions/` - Create subscription.
  - `GET /payments/subscriptions/{id}/` - Fetch subscription.
  - `PUT /payments/subscriptions/{id}/` - Replace subscription.
  - `PATCH /payments/subscriptions/{id}/` - Update subscription.
  - `DELETE /payments/subscriptions/{id}/` - Delete subscription.
  - `POST /payments/stripe/checkout-session/` - Create a Stripe checkout session.
  - `GET /gifts/` - List gift transactions.
  - `POST /gifts/` - Create gift transaction.
  - `GET /gifts/{id}/` - Fetch gift transaction.
  - `PUT /gifts/{id}/` - Replace gift transaction.
  - `PATCH /gifts/{id}/` - Update gift transaction.
  - `DELETE /gifts/{id}/` - Delete gift transaction.

## Notifications

- Purpose: in-app notifications and device registration for push.
- Wrappers: `src/services/api/notifications.ts`, `src/services/api/devices.ts`
- Routes:
  - `GET /notifications/` - List notifications.
  - `POST /notifications/` - Create notification.
  - `GET /notifications/{id}/` - Fetch notification.
  - `PUT /notifications/{id}/` - Replace notification.
  - `PATCH /notifications/{id}/` - Update notification.
  - `DELETE /notifications/{id}/` - Delete notification.
  - `POST /notifications/mark-all-read/` - Mark all notifications read.
  - `GET /devices/` - List devices.
  - `POST /devices/` - Register device.
  - `GET /devices/{id}/` - Fetch device.
  - `PUT /devices/{id}/` - Replace device.
  - `PATCH /devices/{id}/` - Update device.
  - `DELETE /devices/{id}/` - Delete device.

## Media

- Purpose: media records used by posts and messages.
- Wrappers: `src/services/api/media.ts`
- Routes:
  - `GET /media/` - List media.
  - `POST /media/` - Create media record.
  - `GET /media/{id}/` - Fetch media record.
  - `PUT /media/{id}/` - Replace media record.
  - `PATCH /media/{id}/` - Update media record.
  - `DELETE /media/{id}/` - Delete media record.

## Other

- Purpose: domain-specific features not covered above.
- Wrappers: `src/services/api/astro.ts`, `src/services/api/matrix.ts`, `src/services/api/soulmatch.ts`, `src/services/api/moderationReports.ts`, `src/services/api/moderationAdminReports.ts`, `src/services/api/moderationEnforcements.ts`
- Routes:
  - `POST /astro/natal/` - Create or update natal chart.
  - `GET /astro/natal/me/` - Fetch current user's natal chart.
  - `GET /matrix/profile/` - Fetch matrix profile.
  - `POST /matrix/sync/` - Sync matrix profile.
  - `GET /soulmatch/recommendations/` - Fetch soulmatch recommendations.
  - `GET /soulmatch/with/{userId}/` - Fetch soulmatch result for a user.
  - `GET /moderation/reports/` - List moderation reports.
  - `POST /moderation/reports/` - Create moderation report.
  - `GET /moderation/reports/{id}/` - Fetch moderation report.
  - `PUT /moderation/reports/{id}/` - Replace moderation report.
  - `PATCH /moderation/reports/{id}/` - Update moderation report.
  - `DELETE /moderation/reports/{id}/` - Delete moderation report.
  - `GET /moderation/admin/reports/` - List admin moderation reports.
  - `POST /moderation/admin/reports/` - Create admin moderation report.
  - `GET /moderation/admin/reports/{id}/` - Fetch admin moderation report.
  - `PUT /moderation/admin/reports/{id}/` - Replace admin moderation report.
  - `PATCH /moderation/admin/reports/{id}/` - Update admin moderation report.
  - `DELETE /moderation/admin/reports/{id}/` - Delete admin moderation report.
  - `GET /moderation/enforcements/` - List moderation enforcements.
  - `GET /moderation/enforcements/{id}/` - Fetch moderation enforcement.
