import {
  InboxOutlined,
  PlusCircleOutlined,
  LeftOutlined,
  SaveOutlined,
  DeleteOutlined,
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
  Row,
  Col,
  Space,
  DatePicker,
  Image,
  message,
  Spin,
  Alert,
} from "antd";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import TextArea from "antd/es/input/TextArea";
import UserContext from "../UserContext";
import { useNavigate, useParams } from "react-router-dom";
import _ from "lodash";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import { DataContext } from "../../hooks/DataContext";
import ScheduleItemWithPackages from "../../utils/ScheduleItemPackages";
import dayjs from "dayjs";
import LoadingOverlay from "../LoadingOverlay";
import "./ClassEdit.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const EditClass = () => {
  const { listing_id } = useParams();
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const { ageGroups, categories } = useContext(DataContext);
  const [editClassForm] = Form.useForm();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [hasBookings, setHasBookings] = useState(false);

  // Fetch outlets for the current partner
  const fetchOutlets = async () => {
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_OUTLETS(user.partner_id),
      );

      if (response.ok) {
        const data = await response.json();
        setOutlets(data);
      } else {
        throw new Error("Failed to fetch outlets");
      }
    } catch (error) {
      console.error("Error fetching outlets:", error.message);
    }
  };

  // Fetch class details including outlets and schedules
  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_LISTING(listing_id),
        {
          method: "GET",
        },
      );
      const parseRes = await response.json();
      const listingHasBookings =
        parseRes.has_booking_history === true ||
        Number(parseRes.signup_count || 0) > 0;
      setHasBookings(listingHasBookings);

      // Parse existing images
      let imgs = parseRes.images;
      if (typeof imgs === "string") {
        try {
          imgs = JSON.parse(imgs);
        } catch (e) {
          imgs = [];
          console.error("Error fetching existing images: ", e.message);
        }
      }
      setExistingImages(imgs || []);

      // Parse existing outlets and schedule_groups from outlets_info
      let outletsData = [];
      if (parseRes.outlets_info && parseRes.outlets_info.length > 0) {
        outletsData = parseRes.outlets_info.map((outlet) => ({
          outlet_id: outlet.outlet_id,
          locked: listingHasBookings,
          schedules: (outlet.schedule_groups || []).map((group) => {
            // Map schedule_group to schedule form structure
            return {
              schedule_group_id: group.schedule_group_id,
              locked: listingHasBookings,
              capacity: group.capacity ?? undefined,
              time_slots: (group.time_slots || []).map((slot) => ({
                day: slot.day,
                timeslot: [slot.start_time, slot.end_time],
                slots: slot.slots ?? undefined,
              })),
              frequency: group.frequency,
              package_types: group.package_types,
              is_progressive: group.is_progressive,
              full_term_start_date: group.full_term_start_date
                ? dayjs(group.full_term_start_date)
                : null,
              full_term_class_count: group.full_term_class_count,
              short_term_class_count: group.short_term_class_count,
              price_payg: group.price_payg,
              price_fullterm: group.price_fullterm,
              price_shortterm: group.price_shortterm,
            };
          }),
        }));
      }

      // Set form values
      editClassForm.setFieldsValue({
        title: parseRes.listing_title,
        description: parseRes.description,
        category_ids: parseRes.category_ids || [],
        age_groups: parseRes.age_groups,
        cancellation_notice_hours: parseRes.cancellation_notice_hours ?? 24,
        refund_before_deadline_percent:
          parseRes.refund_before_deadline_percent ?? 100,
        refund_after_deadline_percent:
          parseRes.refund_after_deadline_percent ?? 0,
        makeup_allowed: parseRes.makeup_allowed ?? false,
        makeup_notice_hours: parseRes.makeup_notice_hours ?? 24,
        class_requirements: parseRes.class_requirements || "",
        outlets: outletsData,
      });

    } catch (error) {
      console.error("Error fetching class details:", error);
      message.error("Failed to load class details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.partner_id) {
      fetchOutlets();
    }
  }, [user?.partner_id]);

  useEffect(() => {
    if (!listing_id) {
      setLoading(false);
      return;
    }

    fetchClassDetails();
  }, [listing_id]);

  const props = {
    name: "image",
    multiple: true,
    maxCount: 5,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
    },
    beforeUpload(info) {
      setImages((prevImages) => [...prevImages, info]);
      return false;
    },
    onRemove(info) {
      setImages((prevImages) =>
        prevImages.filter((img) => img.uid !== info.uid),
      );
    },
  };

  const handleSelectAgeGroups = (values) => {
    editClassForm.setFieldValue("age_groups", values);
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditClass = async (values) => {
    try {
      setSaving(true);
      setUploadProgress(0);
      setUploadStatus("Updating class information...");

      // 1. Update the listing basic info
      const updateResponse = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_LISTING(listing_id),
        {
          method: "PATCH",
          body: JSON.stringify({
            listing_title: values.title,
            description: values.description,
            category_ids: values.category_ids,
            age_groups: values.age_groups,
            cancellation_notice_hours: values.cancellation_notice_hours,
            refund_before_deadline_percent:
              values.refund_before_deadline_percent,
            refund_after_deadline_percent:
              values.refund_after_deadline_percent,
            makeup_allowed: values.makeup_allowed,
            makeup_notice_hours: values.makeup_notice_hours,
            class_requirements: values.class_requirements,
          }),
        },
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || "Failed to update listing");
      }

      setUploadProgress(30);
      setUploadStatus("Updating schedules...");

      // 2. Update schedule_groups if outlets are provided
      if (values.outlets && values.outlets.length > 0) {
        const schedulesResponse = await fetchWithAuth(
          API_ENDPOINTS.UPDATE_LISTING_SCHEDULES(listing_id),
          {
            method: "PATCH",
            body: JSON.stringify({
              outlets: values.outlets.map((outlet) => ({
                outlet_id: outlet.outlet_id,
                schedule_groups: (outlet.schedules || [])
                  .filter((schedule) => {
                    const timeSlots = schedule.time_slots || [];
                    if (timeSlots.length === 0) {
                      console.warn("Schedule has no time_slots:", schedule);
                      return false;
                    }
                    return true;
                  })
                  .map((schedule) => ({
                    schedule_group_id: schedule.schedule_group_id,
                    time_slots: (schedule.time_slots || [])
                      .filter((slot) => slot && slot.day && slot.timeslot)
                      .map((slot) => ({
                        day: slot.day,
                        timeslot: slot.timeslot,
                        slots: schedule.is_progressive
                          ? undefined
                          : slot.slots,
                      })),
                    frequency: schedule.frequency,
                    package_types: schedule.package_types,
                    is_progressive: schedule.is_progressive || false,
                    capacity: schedule.is_progressive
                      ? schedule.capacity
                      : null,
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
            }),
          },
        );

        if (!schedulesResponse.ok) {
          const errorData = await schedulesResponse.json();
          console.error("Schedule update error:", errorData);
          // Don't throw - listing was updated, just warn about schedules
          message.warning(
            "Listing updated but schedules may not have been saved",
          );
        }
      }

      // 3. Upload new images to Cloudinary if any
      const uploadedImageURLs = Array.isArray(existingImages)
        ? [...existingImages]
        : [];

      if (images.length > 0) {
        setUploadStatus(`Uploading images (0/${images.length})...`);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          setUploadStatus(`Uploading image ${i + 1}/${images.length}...`);
          setUploadProgress(50 + (i / images.length) * 30);
          try {
            // Get Cloudinary signature from backend
            const response = await fetchWithAuth(
              API_ENDPOINTS.UPLOAD_LISTING_IMAGE,
              {
                method: "POST",
                body: JSON.stringify({
                  listingId: listing_id,
                  partnerId: user.partner_id,
                }),
              },
            );
            const sigData = await response.json();
            if (!response.ok)
              throw new Error(
                sigData.message || "Failed to get upload signature",
              );

            // Upload to Cloudinary
            const formData = new FormData();
            formData.append("file", img);
            formData.append("api_key", sigData.apiKey);
            formData.append("timestamp", sigData.allowedParams.timestamp);
            formData.append("signature", sigData.signature);
            formData.append("folder", sigData.allowedParams.folder);
            formData.append("public_id", sigData.allowedParams.public_id);
            formData.append("overwrite", sigData.allowedParams.overwrite);

            const uploadRes = await fetch(
              `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
              {
                method: "POST",
                body: formData,
              },
            );
            const uploadData = await uploadRes.json();

            if (uploadRes.ok) {
              uploadedImageURLs.push(uploadData.secure_url);
            } else {
              throw new Error(uploadData.error?.message || "Upload failed");
            }
          } catch (error) {
            console.warn("Image upload error:", error.message);
            message.warning(`Failed to upload image: ${error.message}`);
          }
        }
      }

      // 4. Update images if changed
      setUploadProgress(80);
      setUploadStatus("Finalizing changes...");

      if (
        uploadedImageURLs.length !== existingImages.length ||
        images.length > 0
      ) {
        await fetchWithAuth(API_ENDPOINTS.UPDATE_LISTING(listing_id), {
          method: "PATCH",
          body: JSON.stringify({
            images: uploadedImageURLs,
          }),
        });
      }

      setUploadProgress(100);
      setUploadStatus("Class updated successfully!");
      toast.success("Class updated successfully!");

      setTimeout(() => {
        navigate(`/class/${listing_id}`);
      }, 500);
    } catch (error) {
      console.error(error.message);
      setUploadStatus("");
      toast.error(error.message || "Failed to update class");
    } finally {
      setSaving(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading class details...</div>
      </div>
    );
  }

  return (
    <div className="class-edit-container">
      <LoadingOverlay
        visible={saving}
        status={uploadStatus || "Saving changes..."}
        progress={uploadProgress}
        showProgress={true}
      />

      {/* Header */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <Space align="center" style={{ marginBottom: 8 }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => navigate(`/class/${listing_id}`)}
              style={{ padding: 0 }}
            />
            <Text type="secondary">Back to class details</Text>
          </Space>
          <Title
            level={2}
            className="welcome-title"
            style={{ marginBottom: 0 }}
          >
            Edit Class
          </Title>
          <Text className="welcome-text">
            Update your class information, schedules, and images
          </Text>
        </div>
        <div className="welcome-actions">
          <Button
            onClick={() => navigate(`/class/${listing_id}`)}
            className="welcome-btn-secondary"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => editClassForm.submit()}
            loading={saving}
            className="welcome-btn-primary"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Form
        name="edit-class"
        className="class-edit-form"
        form={editClassForm}
        onFinish={handleEditClass}
        layout="vertical"
      >
        <div className="form-section-header">Basic Information</div>

        <Form.Item
          name="title"
          label="Class Title"
          rules={[
            {
              required: true,
              message: "Please input the class title",
            },
          ]}
        >
          <Input placeholder="Enter class title" size="large" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Class Description"
          rules={[
            {
              required: true,
              message: "Please input a description",
            },
          ]}
        >
          <TextArea
            showCount
            maxLength={5000}
            placeholder="Describe your class..."
            style={{ height: 120, resize: "none" }}
          />
        </Form.Item>

        <Form.Item
          name="category_ids"
          label="Categories"
          rules={[
            {
              required: true,
              message: "Please select at least one category",
            },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select categories"
            size="large"
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
            {
              required: true,
              message: "Please select age groups",
            },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select age groups"
            onChange={handleSelectAgeGroups}
            size="large"
          >
            {ageGroups &&
              ageGroups.map((age) => (
                <Select.Option key={age.id} value={age.name}>
                  {age.max_age !== null
                    ? `${age.min_age} to ${age.max_age} years old: ${age.name}`
                    : `${age.name} years old`}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>

        <div className="form-section-header">Outlets & Schedules</div>

        {hasBookings && (
          <Alert
            type="info"
            showIcon
            className="enrolment-lock-alert"
            message="Existing outlets and schedules are protected"
            description="You may update prices for future purchases or add a new outlet. Existing package types, programme settings, frequency, class counts, capacity, dates, and time slots are locked."
          />
        )}

        <Form.List name="outlets">
          {(outletFields, { add: addOutlet, remove: removeOutlet }) => (
            <>
              <Button
                type="dashed"
                icon={<PlusCircleOutlined />}
                className="add-outlet-button"
                style={{ marginBottom: "16px" }}
                onClick={() =>
                  addOutlet({ schedules: [{ time_slots: [{}] }] })
                }
                block
              >
                Add Outlet
              </Button>

              {outletFields.map((outletField, outletIndex) => (
                <div key={outletField.key} className="outlet-section">
                  <div className="outlet-section-title">
                    Outlet {outletIndex + 1}
                  </div>
                  <Col flex="1 0 25%">
                    <Form.Item
                      name={[outletField.name, "outlet_id"]}
                      label="Select Outlet Location"
                      rules={[
                        { required: true, message: "Please select an outlet" },
                      ]}
                    >
                      <Select
                        placeholder="Select an outlet"
                        size="large"
                        disabled={Boolean(
                          editClassForm.getFieldValue([
                            "outlets",
                            outletField.name,
                            "locked",
                          ]),
                        )}
                      >
                        {outlets.map((outletOption) => {
                          const parsedAddress = JSON.parse(
                            outletOption.address,
                          );
                          return (
                            <Select.Option
                              key={outletOption.outlet_id}
                              value={outletOption.outlet_id}
                            >
                              {parsedAddress.ADDRESS}
                            </Select.Option>
                          );
                        })}
                      </Select>
                    </Form.Item>

                    {/* Dynamic Schedules List */}
                    <Form.List name={[outletField.name, "schedules"]}>
                      {(
                        scheduleFields,
                        { add: addSchedule, remove: removeSchedule },
                      ) => (
                        <div className="schedule-section">
                          {scheduleFields.map((scheduleField) => (
                            <Row
                              key={scheduleField.key}
                              gutter={[16, 8]}
                              align="middle"
                            >
                              <Col span={20}>
                                <ScheduleItemWithPackages
                                  key={scheduleField.key}
                                  field={scheduleField}
                                  outletIndex={outletField.name}
                                  remove={() =>
                                    removeSchedule(scheduleField.name)
                                  }
                                  form={editClassForm}
                                  locked={Boolean(
                                    editClassForm.getFieldValue([
                                      "outlets",
                                      outletField.name,
                                      "schedules",
                                      scheduleField.name,
                                      "locked",
                                    ]),
                                  )}
                                />
                              </Col>
                            </Row>
                          ))}
                          <Form.Item>
                            <Button
                              type="dashed"
                              onClick={() =>
                                addSchedule({ time_slots: [{}] })
                              }
                              icon={<PlusCircleOutlined />}
                              className="add-schedule-button"
                              block
                              disabled={Boolean(
                                editClassForm.getFieldValue([
                                  "outlets",
                                  outletField.name,
                                  "locked",
                                ]),
                              )}
                            >
                              Add Schedule
                            </Button>
                          </Form.Item>
                        </div>
                      )}
                    </Form.List>

                    <Button
                      type="dashed"
                      danger
                      onClick={() => removeOutlet(outletField.name)}
                      className="remove-outlet-button"
                      style={{ marginTop: "10px" }}
                      block
                      disabled={Boolean(
                        editClassForm.getFieldValue([
                          "outlets",
                          outletField.name,
                          "locked",
                        ]),
                      )}
                    >
                      Remove Outlet
                    </Button>
                  </Col>
                </div>
              ))}
            </>
          )}
        </Form.List>

        <div className="form-section-header">Booking Policy</div>
        <p className="booking-policy-intro">
          These terms are shown before confirmation. Existing bookings keep the
          policy that was captured when they were made.
        </p>

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

        <div className="form-section-header">Class Images</div>

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="image-grid" style={{ marginBottom: 16 }}>
            {existingImages.map((image, index) => (
              <div key={index} className="image-item">
                <Image
                  src={image}
                  width={120}
                  height={120}
                  alt={`Class image ${index + 1}`}
                  style={{ objectFit: "cover", borderRadius: 8 }}
                />
                <Button
                  danger
                  className="image-delete-button"
                  icon={<DeleteOutlined />}
                  size="small"
                  shape="circle"
                  onClick={() => handleRemoveExistingImage(index)}
                />
              </div>
            ))}
          </div>
        )}

        <Dragger
          {...props}
          className="upload-dragger"
          style={{ marginBottom: "24px" }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag files to upload</p>
          <p className="ant-upload-hint">
            Upload up to 5 images for your class
          </p>
        </Dragger>

        <Button
          type="primary"
          htmlType="submit"
          className="save-button"
          loading={saving}
          block
        >
          <SaveOutlined /> Save Changes
        </Button>
      </Form>
    </div>
  );
};

export default EditClass;
