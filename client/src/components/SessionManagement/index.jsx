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
  LeftOutlined,
  RightOutlined,
  StopOutlined,
  SwapOutlined,
  TeamOutlined,
  UnorderedListOutlined,
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

const SessionCalendarEvent = ({ session, onSelect }) => (
  <button
    type="button"
    className={`session-calendar-event is-${session.status}${session.is_makeup ? " is-makeup" : ""}`}
    onClick={() => onSelect(session)}
    title={`${session.listing_title} · ${formatTime(session.scheduled_date, session.scheduled_end_date)} · ${session.outlet_name || "Outlet"}`}
  >
    <time>{dayjs(session.scheduled_date).format("h:mm A")}</time>
    <span>{session.listing_title}</span>
  </button>
);

const OperationsCalendar = ({
  sessions,
  mode,
  cursor,
  onCursorChange,
  onSelectSession,
  onShowWeek,
}) => {
  const sessionsByDay = useMemo(
    () =>
      sessions.reduce((grouped, session) => {
        const key = dayjs(session.scheduled_date).format("YYYY-MM-DD");
        grouped.set(key, [...(grouped.get(key) || []), session]);
        return grouped;
      }, new Map()),
    [sessions],
  );

  const start =
    mode === "month"
      ? cursor.startOf("month").startOf("week")
      : cursor.startOf("week");
  const dayCount = mode === "month" ? 42 : 7;
  const days = Array.from({ length: dayCount }, (_, index) =>
    start.add(index, "day"),
  );
  const title =
    mode === "month"
      ? cursor.format("MMMM YYYY")
      : `${start.format("D MMM")} – ${start.add(6, "day").format("D MMM YYYY")}`;
  const moveCursor = (amount) =>
    onCursorChange(cursor.add(amount, mode === "month" ? "month" : "week"));

  return (
    <div className={`operations-calendar is-${mode}`}>
      <div className="operations-calendar-header">
        <div>
          <Text className="session-kicker">Operations calendar</Text>
          <Title level={3}>{title}</Title>
        </div>
        <div className="operations-calendar-navigation">
          <Button onClick={() => onCursorChange(dayjs())}>Today</Button>
          <Button
            icon={<LeftOutlined />}
            aria-label={`Previous ${mode}`}
            onClick={() => moveCursor(-1)}
          />
          <Button
            icon={<RightOutlined />}
            aria-label={`Next ${mode}`}
            onClick={() => moveCursor(1)}
          />
        </div>
      </div>

      <div className="operations-calendar-grid" role="grid" aria-label={`${mode} operations calendar`}>
        {days.slice(0, 7).map((day) => (
          <div className="operations-calendar-weekday" role="columnheader" key={`weekday-${day.format("ddd")}`}>
            {day.format("ddd")}
          </div>
        ))}
        {days.map((day) => {
          const daySessions = sessionsByDay.get(day.format("YYYY-MM-DD")) || [];
          const visibleDaySessions = mode === "month" ? daySessions.slice(0, 3) : daySessions;
          const isOutsideMonth = mode === "month" && !day.isSame(cursor, "month");
          return (
            <div
              className={`operations-calendar-day${isOutsideMonth ? " is-outside" : ""}${day.isSame(dayjs(), "day") ? " is-today" : ""}`}
              role="gridcell"
              aria-label={`${day.format("D MMMM YYYY")}, ${daySessions.length} sessions`}
              key={day.format("YYYY-MM-DD")}
            >
              <div className="operations-calendar-day-heading">
                {mode === "week" && <span>{day.format("MMM")}</span>}
                <strong>{day.format("D")}</strong>
              </div>
              <div className="operations-calendar-events">
                {visibleDaySessions.map((session) => (
                  <SessionCalendarEvent
                    key={`${session.schedule_id}-${session.scheduled_date}`}
                    session={session}
                    onSelect={onSelectSession}
                  />
                ))}
                {mode === "month" && daySessions.length > 3 && (
                  <button
                    type="button"
                    className="operations-calendar-more"
                    onClick={() => onShowWeek(day)}
                  >
                    +{daySessions.length - 3} more
                  </button>
                )}
                {mode === "week" && daySessions.length === 0 && (
                  <span className="operations-calendar-empty">No sessions</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [view, setView] = useState("list");
  const [calendarCursor, setCalendarCursor] = useState(dayjs());
  const [selectedSession, setSelectedSession] = useState(null);
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

  const classOptions = useMemo(() => {
    const options = new Map();
    sessions.forEach((session) => {
      options.set(session.listing_id, session.listing_title);
    });
    return [
      { value: "all", label: "All classes" },
      ...[...options.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [sessions]);

  const outletOptions = useMemo(() => {
    const outlets = [...new Set(sessions.map((session) => session.outlet_name).filter(Boolean))];
    return [
      { value: "all", label: "All outlets" },
      ...outlets.sort().map((outlet) => ({ value: outlet, label: outlet })),
    ];
  }, [sessions]);

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
      const matchesClass = classFilter === "all" || session.listing_id === classFilter;
      const matchesOutlet = outletFilter === "all" || session.outlet_name === outletFilter;
      return (
        matchesFilter &&
        matchesClass &&
        matchesOutlet &&
        (!query || searchable.includes(query))
      );
    });
  }, [classFilter, filter, outletFilter, search, sessions]);

  const openChange = (session, action) => {
    form.resetFields();
    setSelectedSession(null);
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
        <div className="session-workspace-heading">
          <div>
            <Text className="session-kicker">Schedule workspace</Text>
            <Title level={3}>{visibleSessions.length} sessions</Title>
          </div>
          <div className="session-view-controls" role="group" aria-label="Session view">
            <Button
              type={view === "list" ? "primary" : "default"}
              icon={<UnorderedListOutlined />}
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              type={view === "month" ? "primary" : "default"}
              icon={<CalendarOutlined />}
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              type={view === "week" ? "primary" : "default"}
              icon={<CalendarOutlined />}
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>
        </div>
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
            value={classFilter}
            onChange={setClassFilter}
            aria-label="Filter by class"
            className="session-class-filter"
            options={classOptions}
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={outletFilter}
            onChange={setOutletFilter}
            aria-label="Filter by outlet"
            className="session-outlet-filter"
            options={outletOptions}
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
        ) : view !== "list" ? (
          <OperationsCalendar
            sessions={visibleSessions}
            mode={view}
            cursor={calendarCursor}
            onCursorChange={setCalendarCursor}
            onSelectSession={setSelectedSession}
            onShowWeek={(day) => {
              setCalendarCursor(day);
              setView("week");
            }}
          />
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
        open={Boolean(selectedSession)}
        onCancel={() => setSelectedSession(null)}
        footer={null}
        centered
        title="Session details"
        className="session-detail-modal"
      >
        <div className="session-detail-heading">
          <div>
            <Text className="session-kicker">{statusLabel(selectedSession || {})}</Text>
            <Title level={3}>{selectedSession?.listing_title}</Title>
          </div>
          {selectedSession && (
            <Tag className={`session-status is-${selectedSession.status}`}>
              {statusLabel(selectedSession)}
            </Tag>
          )}
        </div>
        <dl className="session-detail-grid">
          <div><dt>Date</dt><dd>{formatDate(selectedSession?.scheduled_date)}</dd></div>
          <div><dt>Time</dt><dd>{formatTime(selectedSession?.scheduled_date, selectedSession?.scheduled_end_date)}</dd></div>
          <div><dt>Outlet</dt><dd>{selectedSession?.outlet_name || "Outlet unavailable"}</dd></div>
          <div><dt>Affected families</dt><dd>{selectedSession?.affected_children} children · {selectedSession?.affected_families} families</dd></div>
        </dl>
        {selectedSession?.cancellation_reason && (
          <div className="session-cancellation-note">
            <StopOutlined />
            <span>{selectedSession.cancellation_reason}</span>
          </div>
        )}
        <div className="session-detail-actions">
          {selectedSession?.status === "cancelled" ? (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              disabled={selectedSession.has_makeup}
              onClick={() => openChange(selectedSession, "makeup")}
            >
              {selectedSession.has_makeup ? "Make-up scheduled" : "Add make-up"}
            </Button>
          ) : (
            <>
              <Button
                icon={<SwapOutlined />}
                disabled={dayjs(selectedSession?.scheduled_end_date).isBefore(dayjs())}
                onClick={() => openChange(selectedSession, "reschedule")}
              >
                Reschedule
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                disabled={dayjs(selectedSession?.scheduled_end_date).isBefore(dayjs())}
                onClick={() => openChange(selectedSession, "cancel")}
              >
                Cancel session
              </Button>
            </>
          )}
        </div>
      </Modal>

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
