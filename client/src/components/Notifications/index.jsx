import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Pagination,
  Segmented,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { Text, Title } = Typography;
const PAGE_SIZE = 20;

const NOTIFICATION_ICONS = {
  booking: CalendarOutlined,
  cancellation: CloseCircleOutlined,
  schedule_update: ClockCircleOutlined,
  payout: DollarOutlined,
  listing_status: CheckCircleOutlined,
  review_received: StarOutlined,
};

const parseNotificationData = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getDestination = (notification) => {
  const data = parseNotificationData(notification.data);
  if (notification.type === "payout") return "/earnings";
  if (notification.type === "review_received") return "/reviews";
  if (notification.type?.startsWith("makeup")) return "/make-up-requests";
  if (notification.type?.startsWith("promotion")) return "/promotions";
  if (data.listing_id) return `/class/${data.listing_id}`;
  return "/classes";
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(date);
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const unreadQuery = filter === "unread" ? "&unread=true" : "";
      const response = await fetchWithAuth(
        `${API_ENDPOINTS.GET_NOTIFICATIONS}&page=${page}&limit=${PAGE_SIZE}${unreadQuery}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load notifications");
      setNotifications(data.data || []);
      setTotal(Number(data.total || 0));
      setUnreadTotal(Number(data.unread_total || 0));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const notifyBadgeChanged = () => {
    window.dispatchEvent(new Event("partner-notifications-updated"));
  };

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        const response = await fetchWithAuth(
          API_ENDPOINTS.MARK_NOTIFICATION_READ(notification.notification_id),
          {
            method: "PATCH",
            body: JSON.stringify({ type: "partner" }),
          },
        );
        if (response.ok) notifyBadgeChanged();
      } catch (error) {
        console.error("Unable to mark notification as read:", error);
      }
    }
    navigate(getDestination(notification));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.MARK_ALL_NOTIFICATIONS_READ,
        {
          method: "PATCH",
          body: JSON.stringify({ type: "partner" }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to mark notifications as read");
      toast.success("All notifications marked as read");
      notifyBadgeChanged();
      if (page === 1) {
        await loadNotifications();
      } else {
        setPage(1);
      }
    } catch (updateError) {
      toast.error(updateError.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = unreadTotal > 0;

  return (
    <div className="partner-notifications-page">
      <header className="partner-notifications-header">
        <div>
          <Text className="partner-notifications-kicker">Activity centre</Text>
          <Title level={1}>Notifications</Title>
          <Text>Bookings, cancellations, schedules, payouts and listing decisions.</Text>
        </div>
        <span className="partner-notifications-header-icon">
          <BellOutlined />
        </span>
      </header>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Notifications could not be loaded"
          action={<Button onClick={loadNotifications}>Retry</Button>}
        />
      ) : null}

      <section className="partner-notifications-panel" aria-busy={loading}>
        <div className="partner-notifications-toolbar">
          <Segmented
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            options={[
              { label: "All", value: "all" },
              { label: "Unread", value: "unread" },
            ]}
          />
          <Button
            onClick={markAllRead}
            loading={markingAll}
            disabled={!hasUnread}
          >
            Mark all as read
          </Button>
        </div>

        {loading ? (
          <div className="partner-notifications-loading"><Spin /></div>
        ) : notifications.length > 0 ? (
          <div className="partner-notification-list">
            {notifications.map((notification) => {
              const NotificationIcon =
                NOTIFICATION_ICONS[notification.type] || BellOutlined;
              return (
                <button
                  type="button"
                  className={`partner-notification-item${
                    notification.is_read ? "" : " is-unread"
                  }`}
                  key={notification.notification_id}
                  onClick={() => openNotification(notification)}
                >
                  <span className="partner-notification-icon">
                    <NotificationIcon />
                  </span>
                  <span className="partner-notification-copy">
                    <span className="partner-notification-title-row">
                      <strong>{notification.title}</strong>
                      {!notification.is_read ? <Tag color="blue">New</Tag> : null}
                    </span>
                    <span>{notification.message}</span>
                    <time dateTime={notification.created_at}>
                      {formatNotificationTime(notification.created_at)}
                    </time>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={filter === "unread" ? "You are all caught up" : "No notifications yet"}
          />
        )}
        {total > PAGE_SIZE ? (
          <Pagination
            className="partner-notifications-pagination"
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={setPage}
          />
        ) : null}
      </section>
    </div>
  );
};

export default Notifications;
