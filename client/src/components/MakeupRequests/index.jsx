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
  Table,
  Tag,
  Typography,
} from "antd";
import { CalendarOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { Text, Title } = Typography;

const formatDateTime = (value) =>
  value ? dayjs(value).format("D MMM YYYY, h:mm A") : "—";

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const MakeupRequests = () => {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [form] = Form.useForm();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_MAKEUP_REQUESTS);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load requests");
      setRequests(payload.requests || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const visibleRequests = useMemo(() => {
    if (status === "all") return requests;
    if (status === "active") {
      return requests.filter((request) => ["pending", "offered"].includes(request.status));
    }
    return requests.filter((request) => request.status === status);
  }, [requests, status]);

  const openReview = (request, action) => {
    setReview({ request, action });
    form.resetFields();
  };

  const submitReview = async (values) => {
    if (!review) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.RESPOND_MAKEUP_REQUEST(review.request.request_id),
        {
          method: "PATCH",
          body: JSON.stringify({
            action: review.action,
            offered_date: values.offered_date?.format("YYYY-MM-DD"),
            response: values.response,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to review request");
      toast.success(review.action === "offer" ? "Replacement date offered" : "Request declined");
      setReview(null);
      form.resetFields();
      await loadRequests();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Family",
      key: "family",
      render: (_, request) => (
        <div className="makeup-primary-cell">
          <Text strong>{request.child_name || "Child"}</Text>
          <Text type="secondary">Parent: {request.parent_name}</Text>
        </div>
      ),
    },
    {
      title: "Class",
      key: "class",
      render: (_, request) => (
        <div className="makeup-primary-cell">
          <Text strong>{request.listing_title}</Text>
          <Text type="secondary">{formatDateTime(request.original_start_date)}</Text>
        </div>
      ),
    },
    {
      title: "Request",
      key: "request",
      render: (_, request) => (
        <div className="makeup-request-copy">
          <Text>{request.reason || "No reason provided"}</Text>
          {request.preferred_dates?.length > 0 && (
            <Text type="secondary">
              Preferred: {request.preferred_dates.map((date) => dayjs(date).format("D MMM YYYY")).join(", ")}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value, request) => (
        <div className="makeup-status-cell">
          <Tag className={`makeup-status is-${value}`}>{titleCase(value)}</Tag>
          {request.offered_start_date && (
            <Text type="secondary">{formatDateTime(request.offered_start_date)}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, request) =>
        ["pending", "offered"].includes(request.status) ? (
          <div className="makeup-row-actions">
            <Button type="primary" onClick={() => openReview(request, "offer")}>
              {request.status === "offered" ? "Change date" : "Offer date"}
            </Button>
            <Button danger onClick={() => openReview(request, "reject")}>Decline</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="makeup-page">
      <section className="makeup-header">
        <div>
          <Text className="makeup-kicker">Bookings</Text>
          <Title level={1}>Make-up requests</Title>
          <Text className="makeup-subtitle">
            Review parent requests and offer a replacement date for confirmation.
          </Text>
        </div>
        <span className="makeup-header-icon"><SwapOutlined /></span>
      </section>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Make-up requests could not be loaded"
          description={error}
          action={<Button type="link" onClick={loadRequests}>Try again</Button>}
          className="makeup-alert"
        />
      )}

      <section className="makeup-panel">
        <div className="makeup-panel-heading">
          <div>
            <Text className="makeup-kicker">Request queue</Text>
            <Title level={3}>{visibleRequests.length} requests</Title>
          </div>
          <Select
            value={status}
            onChange={setStatus}
            aria-label="Filter request status"
            options={[
              { value: "active", label: "Needs attention" },
              { value: "pending", label: "Pending" },
              { value: "offered", label: "Awaiting parent" },
              { value: "confirmed", label: "Confirmed" },
              { value: "rejected", label: "Declined" },
              { value: "withdrawn", label: "Withdrawn" },
              { value: "all", label: "All requests" },
            ]}
          />
        </div>
        {loading ? (
          <Skeleton active />
        ) : (
          <Table
            rowKey="request_id"
            columns={columns}
            dataSource={visibleRequests}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="No make-up requests in this view" /> }}
            scroll={{ x: 900 }}
          />
        )}
      </section>

      <Modal
        open={Boolean(review)}
        onCancel={() => {
          if (!saving) setReview(null);
        }}
        footer={null}
        centered
        width={480}
        title={review?.action === "offer" ? "Offer a replacement date" : "Decline request"}
        className="makeup-modal"
      >
        <div className="makeup-modal-summary">
          <CalendarOutlined />
          <div>
            <strong>{review?.request.listing_title}</strong>
            <span>Original: {formatDateTime(review?.request.original_start_date)}</span>
          </div>
        </div>
        <Form form={form} layout="vertical" onFinish={submitReview} requiredMark={false}>
          {review?.action === "offer" && (
            <Form.Item
              label="Replacement date"
              name="offered_date"
              rules={[{ required: true, message: "Choose a replacement date" }]}
            >
              <DatePicker
                format="D MMM YYYY"
                disabledDate={(date) => date && !date.isAfter(dayjs().startOf("day"), "day")}
                className="makeup-date-picker"
              />
            </Form.Item>
          )}
          <Form.Item
            label={review?.action === "offer" ? "Note to parent (optional)" : "Reason for declining"}
            name="response"
            rules={review?.action === "reject" ? [{ required: true, message: "Give the parent a reason" }] : []}
          >
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>
          <div className="makeup-modal-actions">
            <Button disabled={saving} onClick={() => setReview(null)}>Cancel</Button>
            <Button
              type="primary"
              danger={review?.action === "reject"}
              htmlType="submit"
              loading={saving}
            >
              {review?.action === "offer" ? "Send offer" : "Decline request"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MakeupRequests;
