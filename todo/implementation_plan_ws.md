# Implementation Plan - Live Complaint Chat & Live Notification Badges via WebSockets

Implement real-time bidirectional communication using FastAPI WebSockets in the backend and a native WebSocket manager on the React frontend. This will power live, instant updates for complaint resolution chat threads, real-time unread notification badges, and instant KYC approval status changes without requiring page refreshes.

---

## User Review Required

> [!IMPORTANT]
> **WebSocket Transport & Auth**: WebSocket connections will use token-based query authentication (`ws://.../api/ws?token=JWT_TOKEN`) to authenticate incoming socket sessions cleanly without CORS or header restrictions.
> 
> **Reconnection Strategy**: The frontend client will automatically attempt exponential backoff reconnections (up to 5 retries) if a WebSocket connection drops due to network blips.

---

## Proposed Changes

### Backend Subsystem (FastAPI WebSockets)

#### [NEW] [connection_manager.py](file:///e:/Programs/projects/societyhub/backend/app/services/connection_manager.py)
- Create a global `WebSocketManager` to maintain active socket connections grouped by `user_id`, `society_id`, and `complaint_id`.
- Support thread-safe broadcasting methods:
  - `broadcast_to_complaint(complaint_id, data)`
  - `send_personal_message(user_id, data)`
  - `broadcast_to_society_admins(society_id, data)`

#### [NEW] [websocket.py](file:///e:/Programs/projects/societyhub/backend/app/routers/websocket.py)
- Expose WebSocket routes:
  - `ws://.../api/ws/complaints/{complaint_id}`: Real-time chat stream for grievance comments.
  - `ws://.../api/ws/notifications`: Real-time stream for user notification alerts & KYC approval status updates.
- Authenticate incoming connections via JWT query string token (`token: str = Query(...)`).

#### [MODIFY] [complaints.py](file:///e:/Programs/projects/societyhub/backend/app/routers/complaints.py)
- Trigger real-time comment broadcast via `manager.broadcast_to_complaint(...)` whenever a comment is created in `add_comment`.

#### [MODIFY] [notification_service.py](file:///e:/Programs/projects/societyhub/backend/app/services/notification_service.py)
- Trigger `manager.send_personal_message(user_id, {"type": "NEW_NOTIFICATION", ...})` whenever a new notification is logged.

#### [MODIFY] [onboarding.py](file:///e:/Programs/projects/societyhub/backend/app/routers/onboarding.py)
- Trigger `manager.broadcast_to_society_admins(...)` when a new resident registers for onboarding (`PENDING_APPROVAL`).
- Trigger `manager.send_personal_message(...)` to the user when their approval status changes (`APPROVAL_STATUS_CHANGED`).

#### [MODIFY] [main.py](file:///e:/Programs/projects/societyhub/backend/app/main.py)
- Mount the new `websocket.router` onto the FastAPI app instance.

---

### Frontend Subsystem (React WebSockets)

#### [NEW] [websocket.ts](file:///e:/Programs/projects/societyhub/web/src/services/websocket.ts)
- Implement `WebSocketClient` class managing socket initialization, subscription events, heartbeats (ping/pong), and automatic reconnects.

#### [MODIFY] [notificationsStore.ts](file:///e:/Programs/projects/societyhub/web/src/store/stores/notificationsStore.ts)
- Connect to `/api/ws/notifications` upon login.
- Listen for `NEW_NOTIFICATION` events and automatically increment unread notification badge count and push new notification to state in real time.

#### [MODIFY] [ComplaintsTab.tsx](file:///e:/Programs/projects/societyhub/web/src/features/complaints/ComplaintsTab.tsx)
- Establish WebSocket connection to `/api/ws/complaints/{complaint_id}` when a grievance ticket is selected.
- Instantly append incoming `NEW_COMMENT` payloads to the chat message thread in real time.

#### [MODIFY] [ApprovalsTab.tsx](file:///e:/Programs/projects/societyhub/web/src/features/approvals/ApprovalsTab.tsx)
- Listen for `PENDING_APPROVAL` real-time socket events for admins/owners to update pending request queue without manual refresh.

#### [MODIFY] [PendingApprovalNotice.tsx](file:///e:/Programs/projects/societyhub/web/src/features/onboarding/components/PendingApprovalNotice.tsx)
- Listen for `APPROVAL_STATUS_CHANGED` socket event to automatically redirect the pending user into the app upon approval.

---

## Verification Plan

### Automated Tests
- Syntax check & static type check on modified TSX and Python modules.

### Manual Verification
- Open two browser windows (one Resident, one Admin).
- **Test Live Complaint Chat**: Post a comment as Resident on a grievance ticket, verify it immediately renders on Admin's screen without refreshing.
- **Test Live Notification Badges**: Action a bill or issue in Admin window, verify the red unread notification badge increments instantly on Resident window.
- **Test Live KYC Onboarding**: Submit a join request as a new user, verify the pending approval card appears in real-time on Admin window; click "Approve", verify new user's window immediately transitions to fully approved main dashboard.
