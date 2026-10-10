import {
  InboxOutlined,
  PlusCircleOutlined,
  LeftOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
  Upload,
} from "antd";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import TextArea from "antd/es/input/TextArea";
import dayjs from "dayjs";
import UserContext from "../UserContext";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import { DataContext } from "../../hooks/DataContext";
import ScheduleItemWithPackages from "../../utils/ScheduleItemPackages";
import LoadingOverlay from "../LoadingOverlay";
import "./ClassEdit.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Transform form values into the payload shape the API expects.
 * Each schedule (with its time_slots array) becomes one schedule_group.
 */
const buildPayload = (values, partnerId) => ({
  ...values,
  category_ids: (values.category_ids || []).filter(
    (categoryId) => categoryId !== undefined && categoryId !== null,
  ),
  partner_id: partnerId,
  images: [],
  outlets: (values.outlets || []).map((outlet) => ({
    outlet_id: outlet.outlet_id,
    schedule_groups: (outlet.schedules || [])
      .filter((schedule) => {
        // Filter out schedules with no time slots
        const timeSlots = schedule.time_slots || [];
        if (timeSlots.length === 0) {
          console.warn("Schedule has no time_slots:", schedule);
          return false;
        }
        return true;
      })
      .map((schedule) => ({
        // time_slots stays as array (multiple days for same program)
        time_slots: (schedule.time_slots || [])
          .filter((slot) => slot && slot.day && slot.timeslot)
          .map((slot) => ({
            day: slot.day,
            timeslot: slot.timeslot,
            slots: schedule.is_progressive ? undefined : slot.slots,
          })),
        // Package configuration (shared across all time slots)
        frequency: schedule.frequency,
        package_types: schedule.package_types,
        is_progressive: schedule.is_progressive || false,
        capacity: schedule.is_progressive ? schedule.capacity : null,
        full_term_start_date: schedule.full_term_start_date
          ? (dayjs.isDayjs(schedule.full_term_start_date)
              ? schedule.full_term_start_date.format("YYYY-MM-DD")
              : schedule.full_term_start_date)
          : null,
        full_term_class_count: schedule.full_term_class_count,
        short_term_class_count: schedule.short_term_class_count,
        price_payg: schedule.price_payg,
        price_fullterm: schedule.price_fullterm,
        price_shortterm: schedule.price_shortterm,
      })),
  })),
});

// ─── component ───────────────────────────────────────────────────────────────

const CreateClass = () => {
  const [images, setImages] = useState([]);
  const { ageGroups, categories, categoriesError, loading: dataLoading } =
    useContext(DataContext);
  const [createClassForm] = Form.useForm();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // ── fetch this partner's outlet locations ──
  useEffect(() => {
    if (!user?.partner_id) return;
    const fetchOutlets = async () => {
      try {
        const res = await fetchWithAuth(
          API_ENDPOINTS.GET_OUTLETS(user.partner_id),
        );
        if (res.ok) {
          const data = await res.json();
          setOutlets(data);
        } else {
          throw new Error("Failed to fetch outlets");
        }
      } catch (err) {
        console.error(err.message);
      }
    };
    fetchOutlets();
  }, [user?.partner_id]);

  // ── image upload props ──
  const uploadProps = {
    name: "image",
    multiple: true,
    maxCount: 5,
    showUploadList: { showPreviewIcon: true, showRemoveIcon: true },
    beforeUpload(file) {
      setImages((prev) => [...prev, file]);
      return false;
    },
    onRemove(file) {
      setImages((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  // ── submit ──
  const handleCreateClass = async (values) => {
    if (!Array.isArray(values.category_ids) || values.category_ids.length === 0) {
      toast.error("Please select at least one category for the class");
      createClassForm.scrollToField("category_ids", { block: "center" });
      return;
    }

    if (images.length === 0) {
      toast.error("Please upload at least one image for the class");
      return;
    }

    const listingPayload = buildPayload(values, user.partner_id);
    const hasIncompleteProgramme = listingPayload.outlets.some(
      (outlet) =>
        !outlet.outlet_id ||
        outlet.schedule_groups.length === 0 ||
        outlet.schedule_groups.some(
          (schedule) =>
            schedule.time_slots.length === 0 ||
            (schedule.is_progressive &&
              (!Number.isInteger(schedule.capacity) ||
                schedule.capacity < 1)) ||
            schedule.time_slots.some(
              (slot) =>
                !slot.day ||
                !Array.isArray(slot.timeslot) ||
                slot.timeslot.length !== 2 ||
                (!schedule.is_progressive &&
                  (!Number.isInteger(slot.slots) || slot.slots < 1)),
            ),
        ),
    );

    if (listingPayload.outlets.length === 0 || hasIncompleteProgramme) {
      toast.error(
        "Each outlet needs at least one complete schedule with a day, time, and capacity.",
      );
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStatus("Creating listing…");

    let listingId = null;
    try {
      // 1. Create listing
      const createRes = await fetchWithAuth(API_ENDPOINTS.CREATE_LISTING, {
        method: "POST",
        body: JSON.stringify(listingPayload),
      });
      const createData = await createRes.json();
      if (createRes.status !== 201) {
        throw new Error(createData.error || "Failed to create listing");
      }
      listingId = createData.data.listing_id;
      setUploadProgress(20);

      // 2. Upload images to Cloudinary
      const uploadedURLs = [];
      for (let i = 0; i < images.length; i++) {
        setUploadStatus(`Uploading image ${i + 1}/${images.length}…`);
        setUploadProgress(20 + (i / images.length) * 60);

        // Get signature
        const sigRes = await fetchWithAuth(API_ENDPOINTS.UPLOAD_LISTING_IMAGE, {
          method: "POST",
          body: JSON.stringify({ listingId, partnerId: user.partner_id }),
        });
        const sigData = await sigRes.json();
        if (!sigRes.ok)
          throw new Error(sigData.message || "Failed to get upload signature");

        // Upload
        const fd = new FormData();
        fd.append("file", images[i]);
        fd.append("api_key", sigData.apiKey);
        fd.append("timestamp", sigData.allowedParams.timestamp);
        fd.append("signature", sigData.signature);
        fd.append("folder", sigData.allowedParams.folder);
        fd.append("public_id", sigData.allowedParams.public_id);
        fd.append("overwrite", sigData.allowedParams.overwrite);

        const upRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
          { method: "POST", body: fd },
        );
        const upData = await upRes.json();
        if (!upRes.ok)
          throw new Error(upData.error?.message || "Image upload failed");

        uploadedURLs.push(upData.secure_url);
      }

      setUploadProgress(80);
      setUploadStatus("Finalising listing…");

      // 3. Patch listing with image URLs
      const patchRes = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_LISTING(listingId),
        {
          method: "PATCH",
          body: JSON.stringify({ images: uploadedURLs }),
        },
      );
      const patchData = await patchRes.json();

      if (patchRes.status === 200) {
        setUploadProgress(100);
        setUploadStatus("Class created successfully!");
        createClassForm.resetFields();
        toast.success(patchData.message || "Class created successfully");
        setTimeout(() => navigate("/classes"), 500);
      } else {
        throw new Error(patchData.error || "Failed to finalise listing");
      }
    } catch (err) {
      console.error(err.message);
      setUploadStatus("");

      // Rollback
      if (listingId) {
        try {
          await fetchWithAuth(API_ENDPOINTS.DELETE_LISTING(listingId), {
            method: "DELETE",
          });
          toast.error(
            err.message ||
              "Failed to create class. Changes have been rolled back.",
          );
        } catch {
          toast.error(
            `Failed to create class. Please manually delete listing ID: ${listingId}`,
          );
        }
      } else {
        toast.error(err.message || "Error creating class. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 2000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="class-edit-container">
      <LoadingOverlay
        visible={loading}
        status={uploadStatus}
        progress={uploadProgress}
        showProgress
      />

      {/* Header */}
      <div className="class-edit-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <LeftOutlined />
        </button>
        <div className="class-edit-heading-copy">
          <Text className="class-edit-kicker">Class catalogue</Text>
          <Title level={2} className="class-edit-title">
            Create New Class
          </Title>
          <Text className="class-edit-subtitle">
            Add the class details, locations, schedules, and gallery.
          </Text>
        </div>
      </div>

      <Form
        name="create-class"
        className="class-edit-form"
        form={createClassForm}
        onFinish={handleCreateClass}
        layout="vertical"
        initialValues={{
          cancellation_notice_hours: 24,
          refund_before_deadline_percent: 100,
          refund_after_deadline_percent: 0,
          makeup_allowed: false,
          makeup_notice_hours: 24,
          class_requirements: "",
        }}
      >
        {/* ── Basic info ── */}
        <section className="class-form-card">
        <div className="form-section-header">
          <span className="form-section-number">1</span>
          <span>
            <strong>Basic Information</strong>
            <small>Tell families what this class is about.</small>
          </span>
        </div>

        <Form.Item
          name="title"
          label="Class Title"
          rules={[{ required: true, message: "Please enter a class title" }]}
        >
          <Input
            placeholder="e.g. Junior Basketball Fundamentals"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="category_ids"
          label="Categories"
          extra={
            categoriesError ||
            "Choose at least one category so families can find this class."
          }
          validateStatus={categoriesError ? "error" : undefined}
          rules={[
            { required: true, message: "Select at least one category" },
          ]}
        >
          <Select
            mode="multiple"
            placeholder={
              dataLoading ? "Loading categories…" : "Select categories"
            }
            size="large"
            loading={dataLoading}
            disabled={dataLoading || Boolean(categoriesError)}
            notFoundContent={
              dataLoading ? "Loading categories…" : "No categories available"
            }
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="age_groups"
          label="Age Groups"
          rules={[
            { required: true, message: "Select at least one age group" },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select age groups"
            size="large"
          >
            {ageGroups?.map((age) => (
              <Select.Option key={age.id} value={age.name}>
                {age.max_age !== null
                  ? `${age.min_age}–${age.max_age} yrs: ${age.name}`
                  : `${age.name}`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="Class Description"
          rules={[{ required: true, message: "Please add a description" }]}
        >
          <TextArea
            showCount
            maxLength={5000}
            placeholder="Describe your class, what children will learn, what to bring…"
            className="textarea-description"
            autoSize={{ minRows: 4, maxRows: 10 }}
          />
        </Form.Item>

        {/* ── Outlets & Schedules ── */}
        </section>
        <section className="class-form-card">
        <div className="form-section-header">
          <span className="form-section-number">2</span>
          <span>
            <strong>Outlets &amp; Schedules</strong>
            <small>Choose where and when families can attend.</small>
          </span>
        </div>

        <Form.List name="outlets">
          {(outletFields, { add: addOutlet, remove: removeOutlet }) => (
            <>
              <Button
                type="dashed"
                icon={<PlusCircleOutlined />}
                className="add-outlet-button mb-16"
                onClick={() =>
                  addOutlet({ schedules: [{ time_slots: [{}] }] })
                }
                block
              >
                Add Outlet
              </Button>

              {outletFields.map((outletField, outletIndex) => (
                <div key={outletField.key} className="outlet-section">
                  {/* Outlet header */}
                  <div className="outlet-section-header">
                    <div className="outlet-section-title">
                      <EnvironmentOutlined
                        style={{ color: "var(--primary-color)" }}
                      />
                      Outlet {outletIndex + 1}
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => removeOutlet(outletField.name)}
                      className="remove-outlet-btn"
                    >
                      Remove outlet
                    </Button>
                  </div>

                  {/* Location selector */}
                  <Form.Item
                    name={[outletField.name, "outlet_id"]}
                    label="Location"
                    rules={[
                      { required: true, message: "Select an outlet location" },
                    ]}
                  >
                    <Select placeholder="Select a location" size="large">
                      {outlets.map((o) => {
                        let addr = o.address;
                        try {
                          addr = JSON.parse(o.address).ADDRESS;
                        } catch {
                          addr = o.address;
                        }
                        return (
                          <Select.Option key={o.outlet_id} value={o.outlet_id}>
                            {addr}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>

                  {/* Schedules for this outlet */}
                  <Form.List name={[outletField.name, "schedules"]}>
                    {(
                      scheduleFields,
                      { add: addSchedule, remove: removeSchedule },
                    ) => (
                      <div className="schedule-section">
                        <Text className="schedule-section-label">
                          Schedules
                        </Text>
                        <Text
                          type="secondary"
                          className="schedule-section-hint"
                        >
                          Each schedule is one enrollable programme at this
                          location. A schedule can span multiple days/times
                          (e.g. Sat + Sun) that children must attend together.
                        </Text>

                        {scheduleFields.map((scheduleField) => (
                          <ScheduleItemWithPackages
                            key={scheduleField.key}
                            field={scheduleField}
                            outletIndex={outletField.name}
                            remove={removeSchedule}
                            form={createClassForm}
                          />
                        ))}

                        <Button
                          type="dashed"
                          onClick={() =>
                            addSchedule({ time_slots: [{}] })
                          }
                          icon={<PlusCircleOutlined />}
                          className="add-schedule-button"
                          block
                        >
                          Add Schedule
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              ))}
            </>
          )}
        </Form.List>

        </section>

        <section className="class-form-card">
          <div className="form-section-header">
            <span className="form-section-number">3</span>
            <span>
              <strong>Booking Policy</strong>
              <small>Set the terms families will see before confirming.</small>
            </span>
          </div>

          <div className="booking-policy-grid">
            <Form.Item
              name="cancellation_notice_hours"
              label="Cancellation deadline"
              extra="Hours before the first class."
              rules={[{ required: true, message: "Enter the notice period" }]}
            >
              <InputNumber min={0} max={720} addonAfter="hours" size="large" />
            </Form.Item>
            <Form.Item
              name="refund_before_deadline_percent"
              label="Refund before deadline"
              extra="Percentage of charged credits returned."
              rules={[{ required: true, message: "Enter the refund percentage" }]}
            >
              <InputNumber min={0} max={100} addonAfter="%" size="large" />
            </Form.Item>
            <Form.Item
              name="refund_after_deadline_percent"
              label="Refund after deadline"
              extra="Use 0% when late cancellations are non-refundable."
              rules={[{ required: true, message: "Enter the late refund percentage" }]}
            >
              <InputNumber min={0} max={100} addonAfter="%" size="large" />
            </Form.Item>
            <Form.Item
              name="makeup_notice_hours"
              label="Make-up request notice"
              extra="Used when make-up requests are allowed."
              rules={[{ required: true, message: "Enter the notice period" }]}
            >
              <InputNumber min={0} max={720} addonAfter="hours" size="large" />
            </Form.Item>
          </div>

          <Form.Item
            name="makeup_allowed"
            label="Allow make-up requests"
            valuePropName="checked"
          >
            <Switch checkedChildren="Allowed" unCheckedChildren="Not allowed" />
          </Form.Item>

          <Form.Item
            name="class_requirements"
            label="Important class requirements"
            extra="For example: clothing, equipment, arrival time, or parent attendance."
          >
            <TextArea
              showCount
              maxLength={2000}
              placeholder="Bring sports shoes and a water bottle. Please arrive 10 minutes early."
              className="textarea-requirements"
              autoSize={{ minRows: 3, maxRows: 7 }}
            />
          </Form.Item>
        </section>

        {/* ── Images ── */}
        <section className="class-form-card">
        <div className="form-section-header">
          <span className="form-section-number">4</span>
          <span>
            <strong>Class Images <span className="required-star">*</span></strong>
            <small>Show families what they can expect.</small>
          </span>
        </div>
        <Text type="secondary" className="image-hint">
          Upload 1–5 images. First image will be used as the cover.
        </Text>

        <Dragger {...uploadProps} className="upload-dragger mb-24">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag images here to upload</p>
          <p className="ant-upload-hint">
            PNG, JPG up to 5 images. First image = cover photo.
          </p>
        </Dragger>

        {/* ── Submit ── */}
        </section>
        <div className="class-form-actions">
          <Button size="large" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            className="save-button"
            loading={loading}
            disabled={loading}
          >
            Create Class
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CreateClass;
