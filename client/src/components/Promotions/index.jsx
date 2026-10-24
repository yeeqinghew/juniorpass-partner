import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, PercentageOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const formatPackage = (value) =>
  ({
    "pay-as-you-go": "Pay as you go",
    "short-term": "Short term",
    "full-term": "Full term",
  })[value] || value;

const normalizePackageTypes = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  return value
    .replace(/[{}]/g, "")
    .split(",")
    .map((packageType) => packageType.trim())
    .filter(Boolean);
};

const calculateStandardCredits = (schedule, packageType) => {
  if (!schedule) return null;
  const rate = Number(schedule.pricing_dollars_per_credit);
  const dollars =
    packageType === "pay-as-you-go"
      ? schedule.price_payg
      : packageType === "full-term"
        ? schedule.price_fullterm
        : schedule.price_shortterm;
  const value = Number(dollars);
  return Number.isFinite(value) && value > 0 && rate > 0
    ? Math.ceil(value / rate)
    : null;
};

const Promotions = () => {
  const [form] = Form.useForm();
  const [promotions, setPromotions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedScheduleId = Form.useWatch("schedule_group_id", form);
  const selectedPackage = Form.useWatch("package_type", form);
  const promotionalCredits = Form.useWatch("promotional_credit_cost", form);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [promotionsResponse, optionsResponse] = await Promise.all([
        fetchWithAuth(API_ENDPOINTS.GET_PROMOTIONS),
        fetchWithAuth(API_ENDPOINTS.GET_PROMOTION_OPTIONS),
      ]);
      const [promotionsData, optionsData] = await Promise.all([
        promotionsResponse.json(),
        optionsResponse.json(),
      ]);
      if (!promotionsResponse.ok || !optionsResponse.ok) {
        throw new Error(promotionsData.error || optionsData.error || "Unable to load promotions");
      }
      setPromotions(promotionsData.promotions || []);
      setSchedules(optionsData.schedules || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const selectedSchedule = useMemo(
    () => schedules.find((item) => item.schedule_group_id === selectedScheduleId),
    [schedules, selectedScheduleId],
  );
  const standardCredits = calculateStandardCredits(selectedSchedule, selectedPackage);

  const createPromotion = async (values) => {
    setSaving(true);
    try {
      const [startsAt, endsAt] = values.period;
      const response = await fetchWithAuth(API_ENDPOINTS.CREATE_PROMOTION, {
        method: "POST",
        body: JSON.stringify({
          listing_id: selectedSchedule.listing_id,
          schedule_group_id: values.schedule_group_id,
          package_type: values.package_type,
          promotional_credit_cost: values.promotional_credit_cost,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          max_redemptions: values.max_redemptions,
          eligibility: values.eligibility,
          selected_user_emails:
            values.eligibility === "selected_users"
              ? values.selected_user_emails
                  .split(/[\n,]/)
                  .map((email) => email.trim())
                  .filter(Boolean)
              : [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create promotion");
      toast.success("Promotion submitted for approval");
      setCreating(false);
      form.resetFields();
      await loadPromotions();
    } catch (submitError) {
      toast.error(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (promotion) => {
    const nextStatus = promotion.status === "approved" ? "paused" : "approved";
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_PROMOTION_STATUS(promotion.promotion_id),
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update promotion");
      toast.success(nextStatus === "paused" ? "Promotion paused" : "Promotion resumed");
      await loadPromotions();
    } catch (updateError) {
      toast.error(updateError.message);
    }
  };

  return (
    <div className="partner-promotions-page">
      <header className="partner-promotions-header">
        <div>
          <Text className="partner-promotions-kicker">Campaign pricing</Text>
          <Title level={1}>Promotions</Title>
          <Text>Create limited offers for Junior Pass approval.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          New promotion
        </Button>
      </header>

      {error ? <Alert type="error" showIcon message="Promotions could not be loaded" /> : null}

      <section className="partner-promotions-panel" aria-busy={loading}>
        {promotions.length > 0 ? (
          <div className="partner-promotion-list">
            {promotions.map((promotion) => (
              <article className="partner-promotion-card" key={promotion.promotion_id}>
                <div className="partner-promotion-card-heading">
                  <div>
                    <strong>{promotion.listing_title}</strong>
                    <span>{promotion.outlet_name} · {formatPackage(promotion.package_type)}</span>
                  </div>
                  <Tag>{promotion.status}</Tag>
                </div>
                <div className="partner-promotion-metrics">
                  <div><span>Offer</span><strong>{promotion.promotional_credit_cost} credits</strong></div>
                  <div><span>Redemptions</span><strong>{promotion.redemption_count}/{promotion.max_redemptions}</strong></div>
                  <div><span>Eligibility</span><strong>{promotion.eligibility.replaceAll("_", " ")}</strong></div>
                  <div><span>Period</span><strong>{new Date(promotion.starts_at).toLocaleDateString("en-SG")} – {new Date(promotion.ends_at).toLocaleDateString("en-SG")}</strong></div>
                </div>
                {promotion.status === "rejected" ? (
                  <Alert type="warning" showIcon message="Not approved" description={promotion.rejection_reason} />
                ) : null}
                {promotion.status === "approved" || promotion.status === "paused" ? (
                  <div className="partner-promotion-actions">
                    <Button onClick={() => changeStatus(promotion)}>
                      {promotion.status === "approved" ? "Pause" : "Resume"}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : loading ? (
          <div className="partner-promotions-loading">Loading promotions…</div>
        ) : (
          <Empty description="No promotions yet" />
        )}
      </section>

      <Modal
        open={creating}
        title="Create promotion"
        footer={null}
        onCancel={() => {
          if (!saving) setCreating(false);
        }}
        width={720}
        className="partner-promotion-modal"
      >
        <Form form={form} layout="vertical" onFinish={createPromotion} requiredMark={false}>
          <Form.Item name="schedule_group_id" label="Class and schedule" rules={[{ required: true }] }>
            <Select
              showSearch
              optionFilterProp="label"
              options={schedules.map((schedule) => ({
                value: schedule.schedule_group_id,
                label: `${schedule.listing_title} · ${schedule.outlet_name} · ${(schedule.schedule_days || []).join(", ")}`,
              }))}
            />
          </Form.Item>
          <div className="partner-promotion-form-grid">
            <Form.Item name="package_type" label="Package type" rules={[{ required: true }] }>
              <Select
                disabled={!selectedSchedule}
                options={normalizePackageTypes(selectedSchedule?.package_types).map((value) => ({
                  value,
                  label: formatPackage(value),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="promotional_credit_cost"
              label="Promotional credit cost"
              rules={[
                { required: true },
                {
                  validator: (_, value) =>
                    !standardCredits || Number(value) < standardCredits
                      ? Promise.resolve()
                      : Promise.reject(new Error(`Must be below ${standardCredits} credits`)),
                },
              ]}
            >
              <InputNumber min={1} precision={0} addonAfter="credits" />
            </Form.Item>
          </div>
          <Form.Item name="period" label="Promotion period" rules={[{ required: true }] }>
            <RangePicker showTime />
          </Form.Item>
          <div className="partner-promotion-form-grid">
            <Form.Item name="max_redemptions" label="Maximum redemptions" rules={[{ required: true }] }>
              <InputNumber min={1} precision={0} />
            </Form.Item>
            <Form.Item name="eligibility" label="Eligibility" rules={[{ required: true }] }>
              <Select
                options={[
                  { value: "first_time_customer", label: "First-time customer" },
                  { value: "everyone", label: "Everyone" },
                  { value: "selected_users", label: "Selected users" },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.eligibility !== current.eligibility}>
            {({ getFieldValue }) =>
              getFieldValue("eligibility") === "selected_users" ? (
                <Form.Item
                  name="selected_user_emails"
                  label="Selected parent emails"
                  rules={[{ required: true }]}
                  extra="Enter exact registered emails, separated by commas or new lines."
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {selectedSchedule && selectedPackage && promotionalCredits ? (
            <div className="partner-promotion-preview">
              <PercentageOutlined />
              <div>
                <span>Parent preview</span>
                <strong>{formatPackage(selectedPackage)} · {promotionalCredits} credits</strong>
                {standardCredits ? <small>Usually {standardCredits} credits</small> : null}
              </div>
            </div>
          ) : null}

          <Alert
            type="info"
            showIcon
            message="Junior Pass approval required"
            description="Admin will confirm whether the partner or platform funds the discount before it becomes visible."
          />
          <div className="partner-promotion-form-actions">
            <Button onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Submit for approval</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Promotions;
