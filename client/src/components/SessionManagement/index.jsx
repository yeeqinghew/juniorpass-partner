import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  StopOutlined,
  SwapOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COPY = Object.freeze({
  cancel: {
    title: "Cancel this session?",
    description: "This cancels the session for every enrolled child and notifies all affected parents.",
    submit: "Cancel session",
  },
  reschedule: {
    title: "Reschedule this session",
    description: "Choose one replacement time for every enrolled child. Conflicting child bookings will be blocked.",
    submit: "Confirm new time",
  },
  makeup: {
    title: "Add a make-up class",
    description: "Create one replacement session for all children affected by this cancellation.",
    submit: "Schedule make-up",
  },
});

const formatDate = (value) =>
  value ? dayjs(value).format("ddd, D MMM YYYY") : "Date unavailable";

const formatTime = (start, end) =>
  start && end
    ? `${dayjs(start).format("h:mm A")} – ${dayjs(end).format("h:mm A")}`
    : "Time unavailable";

const statusLabel = (session) => {
  if (session.status === "cancelled") return "Cancelled";
  if (session.is_makeup) return "Make-up class";
  if (session.status === "rescheduled") return "Rescheduled";
  return "Scheduled";
};

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [change, setChange] = useState(null);
  const [form] = Form.useForm();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_PARTNER_SESSIONS);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load class sessions");
      }
      setSessions(payload.sessions || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load class sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const visibleSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const isPast = dayjs(session.scheduled_end_date).isBefore(dayjs());
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && !isPast && session.status !== "cancelled") ||
        (filter === "cancelled" && session.status === "cancelled") ||
        (filter === "past" && isPast);
      const searchable = [
        session.listing_title,
        session.outlet_name,
        session.outlet_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [filter, search, sessions]);

  const openChange = (session, action) => {
    form.resetFields();
    setChange({ session, action });
  };

  const closeChange = () => {
    if (saving) return;
    setChange(null);
    form.resetFields();
  };

  const submitChange = async (values) => {
    if (!change) return;
    setSaving(true);
    const [newStart, newEnd] = values.replacement_time || [];
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.CHANGE_PARTNER_SESSION(change.action),
        {
          method: "POST",
          body: JSON.stringify({
            schedule_id: change.session.schedule_id,
            scheduled_date: change.session.scheduled_date,
            reason: values.reason,
            new_start_date: newStart?.format("YYYY-MM-DDTHH:mm:ss"),
            new_end_date: newEnd?.format("YYYY-MM-DDTHH:mm:ss"),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        const conflictNames = payload.conflicts
          ?.map((conflict) => conflict.child_name)
          .filter(Boolean)
          .join(", ");
        throw new Error(
          conflictNames ? `${payload.error}: ${conflictNames}` : payload.error,
        );
      }
      toast.success(
        `${payload.affected_families} ${payload.affected_families === 1 ? "family" : "families"} notified`,
      );
      setChange(null);
      form.resetFields();
      await loadSessions();
    } catch (requestError) {
      toast.error(requestError.message || "Unable to update this session");
    } finally {
      setSaving(false);
    }
  };

  const modalCopy = change ? ACTION_COPY[change.action] : null;

  return (
    <div className="session-page">
      <section className="session-page-header">
        <div>
          <Text className="session-kicker">Bookings</Text>
          <Title level={1}>Session management</Title>
          <Text className="session-page-subtitle">
            Cancel, move or replace one class session for every affected family.
          </Text>
        </div>
        <span className="session-header-icon"><CalendarOutlined /></span>
      </section>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Class sessions could not be loaded"
          description={error}
          action={<Button type="link" onClick={loadSessions}>Try again</Button>}
          className="session-alert"
        />
      )}

      <section className="session-workspace">
        <div className="session-toolbar">
          <Input.Search
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search class or outlet"
            aria-label="Search class sessions"
            className="session-search"
          />
          <Select
            value={filter}
            onChange={setFilter}
            aria-label="Filter class sessions"
            className="session-filter"
            options={[
              { value: "upcoming", label: "Upcoming sessions" },
              { value: "cancelled", label: "Cancelled sessions" },
              { value: "past", label: "Past sessions" },
              { value: "all", label: "All sessions" },
            ]}
          />
        </div>

        {loading ? (
          <div className="session-loading"><Skeleton active /></div>
        ) : visibleSessions.length === 0 ? (
          <Empty description="No class sessions in this view" />
        ) : (
          <div className="session-list">
            {visibleSessions.map((session) => {
              const isPast = dayjs(session.scheduled_end_date).isBefore(dayjs());
              return (
                <article
                  className={`session-card is-${session.status}`}
                  key={`${session.schedule_id}-${session.scheduled_date}`}
                >
                  <div className="session-card-date">
                    <span>{dayjs(session.scheduled_date).format("DD")}</span>
                    <strong>{dayjs(session.scheduled_date).format("MMM")}</strong>
                  </div>
                  <div className="session-card-main">
                    <div className="session-card-title-row">
                      <div>
                        <Title level={3}>{session.listing_title}</Title>
                        <Tag className={`session-status is-${session.status}`}>
                          {statusLabel(session)}
                        </Tag>
                      </div>
                      <Text className="session-card-day">{formatDate(session.scheduled_date)}</Text>
                    </div>
                    <div className="session-card-details">
                      <span><ClockCircleOutlined />{formatTime(session.scheduled_date, session.scheduled_end_date)}</span>
                      <span><EnvironmentOutlined />{session.outlet_name || "Outlet"}</span>
                      <span><TeamOutlined />{session.affected_children} children · {session.affected_families} families</span>
                    </div>
                    {session.cancellation_reason && (
                      <div className="session-cancellation-note">
                        <StopOutlined />
                        <span>{session.cancellation_reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="session-card-actions">
                    {session.status === "cancelled" ? (
                      <Button
                        type="primary"
                        icon={<SwapOutlined />}
                        onClick={() => openChange(session, "makeup")}
                        disabled={session.has_makeup}
                      >
                        {session.has_makeup ? "Make-up scheduled" : "Add make-up"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          icon={<SwapOutlined />}
                          onClick={() => openChange(session, "reschedule")}
                          disabled={isPast}
                        >
                          Reschedule
                        </Button>
                        <Button
                          danger
                          icon={<StopOutlined />}
                          onClick={() => openChange(session, "cancel")}
                          disabled={isPast}
                        >
                          Cancel session
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(change)}
        onCancel={closeChange}
        footer={null}
        centered
        maskClosable={!saving}
        closable={!saving}
        title={modalCopy?.title}
        className="session-change-modal"
      >
        <div className="session-change-summary">
          <strong>{change?.session.listing_title}</strong>
          <span>{formatDate(change?.session.scheduled_date)} · {formatTime(change?.session.scheduled_date, change?.session.scheduled_end_date)}</span>
          <span>{change?.session.affected_children} children across {change?.session.affected_families} families will be affected.</span>
        </div>
        <Text className="session-change-description">{modalCopy?.description}</Text>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={submitChange}
          className="session-change-form"
        >
          {change?.action !== "cancel" && (
            <Form.Item
              label="New session time"
              name="replacement_time"
              rules={[{ required: true, message: "Choose the start and end time" }]}
            >
              <RangePicker
                showTime={{ format: "h:mm A" }}
                format="D MMM YYYY, h:mm A"
                disabledDate={(date) => date && date.endOf("day").isBefore(dayjs())}
                className="session-time-picker"
              />
            </Form.Item>
          )}
          <Form.Item
            label={change?.action === "cancel" ? "Reason for cancellation" : "Message to parents (optional)"}
            name="reason"
            rules={change?.action === "cancel" ? [{ required: true, whitespace: true, message: "Tell parents why the session is cancelled" }] : []}
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="Add a clear, helpful note for parents"
            />
          </Form.Item>
          <div className="session-change-actions">
            <Button onClick={closeChange} disabled={saving}>Keep session</Button>
            <Button
              type="primary"
              danger={change?.action === "cancel"}
              htmlType="submit"
              loading={saving}
            >
              {modalCopy?.submit}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SessionManagement;
