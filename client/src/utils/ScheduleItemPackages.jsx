import {
  Form,
  Select,
  InputNumber,
  Switch,
  DatePicker,
  Alert,
  Tooltip,
  Card,
  Space,
  Typography,
  Divider,
  Button,
  Tag,
} from "antd";
import {
  MinusCircleOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useState, useEffect, useContext, useCallback } from "react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import TimeRangePicker from "./TimeRangePicker";
import day from "../data/day.json";
import frequency from "../data/frequency.json";
import { DataContext } from "../hooks/DataContext";
import "./ScheduleItemPackages.css";

const { Text } = Typography;

// ─── constants ───────────────────────────────────────────────────────────────

const PACKAGE_OPTIONS = [
  {
    value: "full-term",
    label: "Full-term",
    desc: "Full-cycle commitment",
    progressiveOnly: false,
  },
  {
    value: "short-term",
    label: "Short-term",
    desc: "Trial sampler (auto-priced)",
    progressiveOnly: false,
  },
  {
    value: "pay-as-you-go",
    label: "Pay-as-you-go",
    desc: "Drop-in, per session",
    progressiveOnly: false,
    blockedByProgressive: true,
  },
  {
    value: "trial",
    label: "Trial",
    desc: "First session free",
    progressiveOnly: false,
    blockedByProgressive: true,
  },
];

// Valid package combos (order-independent)
const VALID_COMBOS = [
  ["full-term"],
  ["full-term", "short-term"],
  ["pay-as-you-go"],
  ["pay-as-you-go", "trial"],
];

const isValidCombo = (types) => {
  if (!types || types.length === 0) return false;
  const sorted = [...types].sort();
  return VALID_COMBOS.some(
    (combo) =>
      combo.length === sorted.length &&
      [...combo].sort().every((v, i) => v === sorted[i]),
  );
};

// Short-term: 25% of full-term class count, 15% price markup per class
const calcShortTermPrice = (ltTotal, ltClasses, stClasses) => {
  if (!ltTotal || !ltClasses || !stClasses) return null;
  const perClass = ltTotal / ltClasses;
  return Math.ceil(perClass * 1.15 * stClasses * 100) / 100;
};

// ─── sub-component: single time slot row ─────────────────────────────────────

const TimeSlotRow = ({ slotIndex, scheduleField, remove, form, isOnly }) => (
  <div className="time-slot-row">
    <div className="time-slot-fields">
      <Form.Item
        name={[slotIndex, "day"]}
        rules={[{ required: true, message: "Day" }]}
        style={{ marginBottom: 0, flex: "1 1 130px" }}
      >
        <Select placeholder="Day" size="large">
          {day.map((d) => (
            <Select.Option key={d} value={d}>
              {d}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name={[slotIndex, "timeslot"]}
        rules={[{ required: true, message: "Time" }]}
        style={{ marginBottom: 0, flex: "1 1 180px" }}
      >
        <TimeRangePicker />
      </Form.Item>

      <Form.Item
        name={[slotIndex, "slots"]}
        rules={[
          { required: true, message: "Enter capacity" },
          { type: "number", min: 1, max: 100, message: "1–100" },
        ]}
        style={{ marginBottom: 0, flex: "0 1 130px" }}
      >
        <InputNumber
          placeholder="Capacity"
          min={1}
          max={100}
          size="large"
          style={{ width: "100%" }}
        />
      </Form.Item>
    </div>

    {!isOnly && (
      <button
        type="button"
        className="slot-remove-btn"
        onClick={() => remove(slotIndex)}
        aria-label="Remove time slot"
      >
        <DeleteOutlined />
      </button>
    )}
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

const ScheduleItemWithPackages = ({ field, remove, form }) => {
  const { packageTypes: dbPackageTypes } = useContext(DataContext);
  const packageTypes =
    Form.useWatch(
      ["outlets", field.name, "schedules", field.name, "package_types"],
      form,
    ) || [];
  // const [packageTypes, setPackageTypes] = useState([]);
  const isProgressive = Form.useWatch(
    ["outlets", field.name, "schedules", field.name, "is_progressive"],
    form,
  );
  const [ltTotal, setLtTotal] = useState(null); // full-term total price
  const [ltClasses, setLtClasses] = useState(null);

  // Derived values
  const stClasses = ltClasses ? Math.ceil(ltClasses * 0.25) : null;
  const stPrice = calcShortTermPrice(ltTotal, ltClasses, stClasses);

  // Sync form field for short-term calculated values
  useEffect(() => {
    // Grab current values from the form instance
    const currentSchedule = form.getFieldValue([
      "outlets",
      field.name,
      "schedules",
      field.name,
    ]);

    if (currentSchedule) {
      if (currentSchedule.price_fullterm)
        setLtTotal(currentSchedule.price_fullterm);
      if (currentSchedule.full_term_class_count)
        setLtClasses(currentSchedule.full_term_class_count);
    }
  }, [field.name, form]);

  // Persist the auto-calculated values in the hidden fields submitted by the
  // create/edit forms.
  useEffect(() => {
    form.setFieldValue(
      ["outlets", field.name, "schedules", field.name, "short_term_class_count"],
      stClasses,
    );
    form.setFieldValue(
      ["outlets", field.name, "schedules", field.name, "price_shortterm"],
      stPrice,
    );
  }, [field.name, form, stClasses, stPrice]);

  const handleProgressiveChange = useCallback(
    (checked) => {
      if (checked) {
        const filtered = packageTypes.filter(
          (t) => t === "full-term" || t === "short-term",
        );

        // setPackageTypes(filtered);

        form.setFieldValue(
          ["outlets", field.name, "schedules", field.name, "package_types"],
          filtered,
        );

        if (packageTypes.some((t) => ["pay-as-you-go", "trial"].includes(t))) {
          toast(
            "Pay-as-you-go and Trial removed — not compatible with progressive classes.",
            {
              icon: "ℹ️",
            },
          );
        }
      }
    },
    [packageTypes, field.name, form],
  );

  const handlePackageChange = useCallback(
    (types) => {
      form.setFieldValue(
        ["outlets", field.name, "schedules", field.name, "package_types"],
        types,
      );
    },
    [field.name, form],
  );

  useEffect(() => {
    if (typeof isProgressive !== "boolean") return;

    const allowedTypes = isProgressive
      ? ["full-term", "short-term"]
      : ["pay-as-you-go", "trial"];
    const filtered = packageTypes.filter((type) =>
      allowedTypes.includes(type),
    );

    if (filtered.length !== packageTypes.length) {
      form.setFieldValue(
        ["outlets", field.name, "schedules", field.name, "package_types"],
        filtered,
      );
    }
  }, [field.name, form, isProgressive, packageTypes]);

  const comboValid = isValidCombo(packageTypes);
  const hasFullTerm = packageTypes.includes("full-term");
  const hasShortTerm = packageTypes.includes("short-term");
  const hasPayg = packageTypes.includes("pay-as-you-go");
  const hasTrial = packageTypes.includes("trial");

  return (
    <Card className="schedule-item-card" size="small">
      <Space direction="vertical" style={{ width: "100%" }} size={0}>
        {/* ── Header row ── */}
        <div className="schedule-card-header">
          <Text strong className="schedule-label">
            Schedule
          </Text>
          <button
            type="button"
            className="remove-schedule-btn"
            onClick={() => remove(field.name)}
            aria-label="Remove schedule"
          >
            <MinusCircleOutlined /> Remove
          </button>
        </div>

        <Divider className="card-divider" />

        {/* ── Time Slots ── */}
        <div className="section-block">
          <div className="section-title">
            <ClockCircleOutlined className="section-icon" />
            Time Slots
            <Tooltip title="Add multiple days/times that must ALL be attended (e.g. Sat + Sun). Children enrol in this schedule as a whole.">
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </div>
          <Text type="secondary" className="section-hint">
            Children who enrol in this schedule must attend every slot listed.
          </Text>

          <Form.List name={[field.name, "time_slots"]}>
            {(slotFields, { add: addSlot, remove: removeSlot }) => (
              <div className="time-slots-list">
                {slotFields.map((slotField, idx) => (
                  <TimeSlotRow
                    key={slotField.key}
                    slotIndex={idx}
                    scheduleField={field}
                    remove={removeSlot}
                    form={form}
                    isOnly={slotFields.length === 1}
                  />
                ))}
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addSlot()}
                  className="add-slot-btn"
                >
                  Add another day / time
                </Button>
              </div>
            )}
          </Form.List>
        </div>

        <Divider className="card-divider" />

        {/* ── Frequency ── */}
        <div className="section-block">
          <div>
            <Form.Item
              name={[field.name, "frequency"]}
              label="Frequency"
              rules={[{ required: true, message: "Select frequency" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="How often?"
                size="large"
                options={frequency.map((f) => ({ value: f, label: f }))}
              />
            </Form.Item>

          </div>
        </div>

        <Divider className="card-divider" />

        {/* ── Package Configuration ── */}
        <div className="section-block">
          <div className="section-title">
            Package Types
            <Tooltip title="Choose how parents can book this schedule. Not all combinations are valid.">
              <InfoCircleOutlined className="info-icon" />
            </Tooltip>
          </div>

          {/* Progressive toggle */}
          {/* Progressive toggle */}
          <div className="progressive-toggle">
            <Space align="start">
              {/* Keep Form.Item wrapped tightly around the Switch only */}
              <Form.Item
                name={[field.name, "is_progressive"]}
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Switch onChange={handleProgressiveChange} />
              </Form.Item>

              <div style={{ marginTop: -2 }}>
                <Space>
                  <Text strong>Progressive Classes</Text>
                  <Tooltip title="Each lesson builds on the previous — prevents mid-cycle joins and allows full-term/short-term packages only.">
                    <InfoCircleOutlined className="info-icon" />
                  </Tooltip>
                </Space>
                <Text
                  type="secondary"
                  className="section-hint"
                  style={{ display: "block", marginTop: 2 }}
                >
                  Enable for structured curricula where skipping sessions isn't
                  possible
                </Text>
              </div>
            </Space>
          </div>

          {/* Package type selector */}
          <Form.Item
            name={[field.name, "package_types"]}
            rules={[
              { required: true, message: "Select at least one package type" },
            ]}
            style={{ marginBottom: 8 }}
          >
            <Select
              mode="multiple"
              placeholder="Select package types…"
              size="large"
              onChange={handlePackageChange}
              maxTagCount="responsive"
              optionLabelProp="label"
            >
              {dbPackageTypes &&
                dbPackageTypes.map((pkg) => (
                  <Select.Option
                    key={pkg.id}
                    value={pkg.package_type}
                    label={pkg.name}
                    disabled={
                      isProgressive
                        ? ["pay-as-you-go", "trial"].includes(pkg.package_type)
                        : ["full-term", "short-term"].includes(pkg.package_type)
                    }
                  >
                    <div className="pkg-option">
                      <span className="pkg-option-label">{pkg.name}</span>

                      {pkg.description && (
                        <span className="pkg-option-desc">
                          {pkg.description}
                        </span>
                      )}

                      {(isProgressive
                        ? ["pay-as-you-go", "trial"].includes(pkg.package_type)
                        : ["full-term", "short-term"].includes(
                            pkg.package_type,
                          )) && (
                          <span className="pkg-option-blocked">
                            Not available for this class type
                          </span>
                        )}
                    </div>
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          {/* Validation hint */}
          {packageTypes.length > 0 && (
            <Alert
              message={
                comboValid
                  ? "Valid package combination ✓"
                  : "Invalid combination. Progressive classes use Full-term or Full-term + Short-term. Non-progressive classes use Pay-as-you-go or Pay-as-you-go + Trial."
              }
              type={comboValid ? "success" : "warning"}
              showIcon
              className="combo-alert"
            />
          )}
          {isProgressive && (
            <Alert
              message="Progressive mode: only Full-term and Short-term are available"
              type="info"
              showIcon
              className="combo-alert"
            />
          )}
        </div>

        {/* ── Full-term config ── */}
        {hasFullTerm && (
          <>
            <Divider className="card-divider" />
            <div className="section-block">
              <div className="section-title">
                <CalendarOutlined className="section-icon" />
                Full-term Package
              </div>

              <div className="fields-row-3">
                <Form.Item
                  name={[field.name, "full_term_start_date"]}
                  label="Start Date"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ marginBottom: 0 }}
                  getValueProps={(value) => ({
                    value: value ? dayjs(value) : null,
                  })}
                  normalize={(value) => {
                    if (!value) return null;
                    return value.format("YYYY-MM-DD");
                  }}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder="Booking opens…"
                    size="large"
                    style={{ width: "100%" }}
                    disabledDate={(date) =>
                      date && date.startOf("day").isBefore(dayjs().startOf("day"))
                    }
                  />
                </Form.Item>

                <Form.Item
                  name={[field.name, "full_term_class_count"]}
                  label="Number of Classes"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    min={1}
                    max={100}
                    placeholder="e.g. 12"
                    size="large"
                    style={{ width: "100%" }}
                    onChange={(v) => setLtClasses(v)}
                  />
                </Form.Item>

                <Form.Item
                  name={[field.name, "price_fullterm"]}
                  label={
                    <Space size={4}>
                      Total Package Price
                      <Tooltip title="Enter the full price for the entire full-term package (not per-class).">
                        <InfoCircleOutlined style={{ fontSize: 12 }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > $0" },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    prefix="$"
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    precision={2}
                    size="large"
                    style={{ width: "100%" }}
                    onChange={(v) => setLtTotal(v)}
                  />
                </Form.Item>
              </div>

              {ltTotal && ltClasses && (
                <div className="price-derived">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ≈ ${(ltTotal / ltClasses).toFixed(2)} per class
                  </Text>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Short-term summary (auto-calculated) ── */}
        {hasShortTerm && hasFullTerm && (
          <>
            <Divider className="card-divider" />
            <div className="section-block">
              <div className="section-title">
                Short-term Package (auto-calculated)
              </div>

              {stClasses && stPrice ? (
                <div className="auto-calc-block">
                  <div className="auto-calc-row">
                    <div className="auto-calc-item">
                      <Text type="secondary" className="auto-calc-label">
                        Classes
                      </Text>
                      <Text strong className="auto-calc-value">
                        {stClasses}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        25% of {ltClasses}
                      </Text>
                    </div>
                    <div className="auto-calc-divider" />
                    <div className="auto-calc-item">
                      <Text type="secondary" className="auto-calc-label">
                        Total Price
                      </Text>
                      <Text strong className="auto-calc-value">
                        ${stPrice.toFixed(2)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        15% markup on the full-term per-class price
                      </Text>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert
                  message="Enter full-term total price and class count above to auto-calculate short-term pricing."
                  type="info"
                  showIcon
                />
              )}

              {/* Hidden form fields to store computed values */}
              <Form.Item name={[field.name, "short_term_class_count"]} hidden>
                <InputNumber />
              </Form.Item>
              <Form.Item name={[field.name, "price_shortterm"]} hidden>
                <InputNumber />
              </Form.Item>
            </div>
          </>
        )}

        {/* ── Pay-as-you-go pricing ── */}
        {hasPayg && (
          <>
            <Divider className="card-divider" />
            <div className="section-block">
              <div className="section-title">
                <DollarOutlined className="section-icon" />
                Pay-as-you-go Pricing
              </div>
              <Text type="secondary" className="section-hint">
                Partners set this independently — drop-in rates are typically
                higher than the pro-rated full-term price.
              </Text>

              <div className="fields-row-2" style={{ maxWidth: 340 }}>
                <Form.Item
                  name={[field.name, "price_payg"]}
                  label="Price per Session"
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > $0" },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    prefix="$"
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    precision={2}
                    size="large"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>

            </div>
          </>
        )}

        {/* ── Trial ── */}
        {hasTrial && (
          <>
            <Divider className="card-divider" />
            <div className="section-block">
              <div className="section-title">Trial Class</div>
              <div className="trial-badge">
                <Tag color="gold" style={{ fontSize: 13, padding: "4px 12px" }}>
                  🎁 First session FREE
                </Tag>
                <Text type="secondary" className="section-hint">
                  Trial sessions are always complimentary — no pricing input
                  needed.
                </Text>
              </div>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};

export default ScheduleItemWithPackages;
