/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy dynamic schedule/package form migration boundary.
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
import {
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import TimeRangePicker from "./TimeRangePicker";
import * as dayModule from "../data/day.json";
import * as frequencyModule from "../data/frequency.json";
import { DataContext } from "../hooks/DataContext";
import "./ScheduleItemPackages.css";

const { Text } = Typography;
const day = Object.values(dayModule);
const frequency = Object.values(frequencyModule);

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

const TimeSlotRow = ({ slotIndex, remove, isOnly, isProgressive, locked }) => (
  <div className="time-slot-row">
    <div className="time-slot-fields">
      <Form.Item
        name={[slotIndex, "day"]}
        rules={[{ required: true, message: "Day" }]}
        style={{ marginBottom: 0, flex: "1 1 130px" }}
      >
        <Select placeholder="Day" size="large" disabled={locked}>
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
        <TimeRangePicker disabled={locked} />
      </Form.Item>

      {!isProgressive && (
        <Form.Item
          name={[slotIndex, "slots"]}
          rules={[
            { required: true, message: "Enter capacity" },
            { type: "number", min: 1, max: 100, message: "1–100" },
          ]}
          className="time-slot-capacity-field"
        >
          <InputNumber
            placeholder="Capacity"
            min={1}
            max={100}
            size="large"
            className="capacity-input"
            disabled={locked}
          />
        </Form.Item>
      )}
    </div>

    {!isOnly && !locked && (
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

const ScheduleItemWithPackages = ({
  field,
  outletIndex,
  remove,
  form,
  locked = false,
}) => {
  const { packageTypes: dbPackageTypes } = useContext(DataContext);
  const schedulePath = useMemo(
    () => ["outlets", outletIndex, "schedules", field.name],
    [field.name, outletIndex],
  );
  const watchedPackageTypes = Form.useWatch(
    [...schedulePath, "package_types"],
    form,
  );
  const packageTypes = useMemo(
    () => watchedPackageTypes || [],
    [watchedPackageTypes],
  );
  // const [packageTypes, setPackageTypes] = useState([]);
  const isProgressive = Form.useWatch(
    [...schedulePath, "is_progressive"],
    form,
  );
  const ltTotal = Form.useWatch([...schedulePath, "price_fullterm"], form);
  const ltClasses = Form.useWatch(
    [...schedulePath, "full_term_class_count"],
    form,
  );

  // Derived values
  const stClasses = ltClasses ? Math.ceil(ltClasses * 0.25) : null;
  const stPrice = calcShortTermPrice(ltTotal, ltClasses, stClasses);

  // Persist the auto-calculated values in the hidden fields submitted by the
  // create/edit forms.
  useEffect(() => {
    if (!locked) {
      form.setFieldValue(
        [...schedulePath, "short_term_class_count"],
        stClasses,
      );
      form.setFieldValue(
        [...schedulePath, "price_shortterm"],
        stPrice,
      );
    }
  }, [form, locked, schedulePath, stClasses, stPrice]);

  const handleFullTermPriceChange = useCallback(
    (value) => {
      if (!locked || !packageTypes.includes("short-term")) return;
      const shortTermClasses = ltClasses
        ? Math.ceil(Number(ltClasses) * 0.25)
        : null;
      form.setFieldValue(
        [...schedulePath, "price_shortterm"],
        calcShortTermPrice(value, ltClasses, shortTermClasses),
      );
    },
    [form, locked, ltClasses, packageTypes, schedulePath],
  );

  const handleProgressiveChange = useCallback(
    (checked) => {
      const currentSchedule = form.getFieldValue(schedulePath) || {};
      if (checked) {
        const filtered = packageTypes.filter(
          (t) => t === "full-term" || t === "short-term",
        );

        // setPackageTypes(filtered);

        form.setFieldValue(
          [...schedulePath, "package_types"],
          filtered,
        );

        if (!currentSchedule.capacity) {
          form.setFieldValue(
            [...schedulePath, "capacity"],
            currentSchedule.time_slots?.find((slot) => slot?.slots)?.slots,
          );
        }

        if (packageTypes.some((t) => ["pay-as-you-go", "trial"].includes(t))) {
          toast(
            "Pay-as-you-go and Trial removed — not compatible with progressive classes.",
            {
              icon: "ℹ️",
            },
          );
        }
      } else if (currentSchedule.capacity) {
        form.setFieldValue(
          [...schedulePath, "time_slots"],
          (currentSchedule.time_slots || []).map((slot) => ({
            ...slot,
            slots: slot.slots || currentSchedule.capacity,
          })),
        );
      }
    },
    [form, packageTypes, schedulePath],
  );

  const handlePackageChange = useCallback(
    (types) => {
      form.setFieldValue(
      [...schedulePath, "package_types"],
        types,
      );
    },
    [form, schedulePath],
  );

  useEffect(() => {
    if (!isProgressive) return;

    const filtered = packageTypes.filter((type) =>
      ["full-term", "short-term"].includes(type),
    );

    if (filtered.length !== packageTypes.length) {
      form.setFieldValue(
        [...schedulePath, "package_types"],
        filtered,
      );
    }
  }, [form, isProgressive, packageTypes, schedulePath]);

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
            disabled={locked}
          >
            <MinusCircleOutlined /> Remove
          </button>
        </div>

        <Divider className="card-divider" />

        {locked && (
          <Alert
            type="info"
            showIcon
            message="Enrolled schedule"
            description="The schedule structure is locked to protect existing bookings. Price changes apply only to future purchases."
            className="locked-schedule-alert"
          />
        )}

        {/* ── Schedule type ── */}
        <div className="section-block">
          <div className="section-title">Schedule Type</div>
          <div className="progressive-toggle">
            <Form.Item
              name={[field.name, "is_progressive"]}
              valuePropName="checked"
              className="progressive-toggle-control"
            >
              <Switch onChange={handleProgressiveChange} disabled={locked} />
            </Form.Item>

            <div className="progressive-toggle-copy">
              <Space>
                <Text strong>Progressive Classes</Text>
                <Tooltip title="Each lesson builds on the previous — prevents mid-cycle joins and allows full-term/short-term packages only.">
                  <InfoCircleOutlined className="info-icon" />
                </Tooltip>
              </Space>
              <Text
                type="secondary"
                className="section-hint progressive-toggle-hint"
              >
                Enable for structured curricula where children attend the full
                programme.
              </Text>
            </div>
          </div>

          <div className="package-type-heading">
            <div className="section-title">
              Package Types
              <Tooltip title="Choose how parents can book this schedule. Not all combinations are valid.">
                <InfoCircleOutlined className="info-icon" />
              </Tooltip>
            </div>
          </div>

          <Form.Item
            name={[field.name, "package_types"]}
            rules={[
              { required: true, message: "Select at least one package type" },
            ]}
            className="package-type-field"
          >
            <Select
              mode="multiple"
              placeholder="Select package types…"
              size="large"
              onChange={handlePackageChange}
              maxTagCount="responsive"
              optionLabelProp="label"
              disabled={locked}
            >
              {dbPackageTypes &&
                dbPackageTypes.map((pkg) => (
                  <Select.Option
                    key={pkg.id}
                    value={pkg.package_type}
                    label={pkg.name}
                    disabled={
                      isProgressive &&
                      ["pay-as-you-go", "trial"].includes(pkg.package_type)
                    }
                  >
                    <div className="pkg-option">
                      <span className="pkg-option-label">{pkg.name}</span>
                      {pkg.description && (
                        <span className="pkg-option-desc">
                          {pkg.description}
                        </span>
                      )}
                      {isProgressive &&
                        ["pay-as-you-go", "trial"].includes(
                          pkg.package_type,
                        ) && (
                        <span className="pkg-option-blocked">
                          Not available for this class type
                        </span>
                      )}
                    </div>
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          {packageTypes.length > 0 && (
            <Alert
              message={
                comboValid
                  ? "Valid package combination ✓"
                  : "Invalid combination. Choose Full-term, Full-term + Short-term, Pay-as-you-go, or Pay-as-you-go + Trial."
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

          {isProgressive && (
            <Form.Item
              name={[field.name, "capacity"]}
              label="Programme Capacity"
              rules={[
                { required: true, message: "Enter capacity" },
                { type: "number", min: 1, max: 100, message: "1–100" },
              ]}
              className="progressive-capacity-field"
            >
              <InputNumber
                placeholder="Students"
                min={1}
                max={100}
                size="large"
                className="capacity-input"
                disabled={locked}
              />
            </Form.Item>
          )}

          <Form.List name={[field.name, "time_slots"]}>
            {(slotFields, { add: addSlot, remove: removeSlot }) => (
              <div className="time-slots-list">
                {slotFields.map((slotField, idx) => (
                  <TimeSlotRow
                    key={slotField.key}
                    slotIndex={idx}
                    scheduleField={field}
                    remove={removeSlot}
                    isOnly={slotFields.length === 1}
                    isProgressive={isProgressive}
                    locked={locked}
                  />
                ))}
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addSlot()}
                  className="add-slot-btn"
                  disabled={locked}
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
                disabled={locked}
              />
            </Form.Item>

          </div>
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
                    disabled={locked}
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
                    disabled={locked}
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
                    onChange={handleFullTermPriceChange}
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
