import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Upload,
  message,
  Card,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import useAddressSearch from "../../hooks/useAddressSearch";
import useMRTStations from "../../hooks/useMrtStations";
import "./OutletForm.css";

const { TextArea } = Input;
const { Text } = Typography;

const OutletForm = ({ outlet, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const { addressData, handleAddressSearch } = useAddressSearch();
  const { mrtStations, renderTags } = useMRTStations();

  const uploadOutletImage = async (file, outletId) => {
    const signatureResponse = await fetchWithAuth(
      API_ENDPOINTS.UPLOAD_OUTLET_IMAGE,
      {
        method: "POST",
        body: JSON.stringify({ outletId }),
      },
    );
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) {
      throw new Error(signature.error || "Unable to prepare photo upload");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    Object.entries(signature.allowedParams).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("signature", signature.signature);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
      { method: "POST", body: formData },
    );
    const uploadedImage = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(uploadedImage.error?.message || "Photo upload failed");
    }

    return uploadedImage.secure_url;
  };

  useEffect(() => {
    if (outlet?.images) {
      try {
        const images =
          typeof outlet.images === "string"
            ? JSON.parse(outlet.images)
            : outlet.images;
        if (Array.isArray(images)) {
          setFileList(
            images.map((url, index) => ({
              uid: `-${index}`,
              name: `image-${index}`,
              status: "done",
              url: url,
            }))
          );
        }
      } catch (e) {
        console.error("Error parsing images:", e);
      }
    }
  }, [outlet]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const existingImageUrls = fileList
        .map((file) => file.url || file.response?.url)
        .filter(Boolean);
      const pendingFiles = fileList
        .filter((file) => !file.url && !file.response?.url)
        .map((file) => file.originFileObj || file);

      const submitData = {
        ...values,
        images: JSON.stringify(existingImageUrls),
      };

      const url = outlet ? `/outlets/${outlet.outlet_id}` : "/outlets";
      const method = outlet ? "PATCH" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        const savedOutletId = outlet?.outlet_id || data.outlet?.outlet_id;
        const uploadedImageUrls = await Promise.all(
          pendingFiles.map((file) => uploadOutletImage(file, savedOutletId)),
        );

        if (uploadedImageUrls.length > 0) {
          const imageUpdateResponse = await fetchWithAuth(
            API_ENDPOINTS.UPDATE_OUTLET(savedOutletId),
            {
              method: "PATCH",
              body: JSON.stringify({
                images: JSON.stringify([
                  ...existingImageUrls,
                  ...uploadedImageUrls,
                ]),
              }),
            },
          );
          if (!imageUpdateResponse.ok) {
            throw new Error("Photos uploaded, but the outlet could not be updated");
          }
        }

        onSuccess();
      } else {
        message.error(data.error || "Failed to save outlet");
        if (data.error?.includes("name")) {
          form.setFields([
            {
              name: "outlet_name",
              errors: [data.error],
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error saving outlet:", error);
      message.error("Failed to save outlet");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("You can only upload image files!");
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Image must be smaller than 5MB!");
      return Upload.LIST_IGNORE;
    }
    return false; // Prevent auto upload, handle manually
  };

  const uploadButton = (
    <button
      style={{
        border: 0,
        background: "none",
      }}
      type="button"
    >
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload Photo</div>
    </button>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={
        outlet
          ? {
              outlet_name: outlet.outlet_name,
              address: outlet.address,
              nearest_mrt: outlet.nearest_mrt,
              description: outlet.description,
              phone_number: outlet.phone_number,
            }
          : {}
      }
      className="outlet-form"
    >
      <div className="outlet-form-intro">
        <span className="outlet-form-intro-icon"><EnvironmentOutlined /></span>
        <div>
          <Text strong>{outlet ? "Update this location" : "Set up a new location"}</Text>
          <Text type="secondary">
            Add the details families need when they attend a class here.
          </Text>
        </div>
      </div>

      <Card className="form-section" bordered={false}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Outlet Name */}
          <Form.Item
            name="outlet_name"
            label={
              <span className="form-label">
                <InfoCircleOutlined /> Outlet Name
              </span>
            }
            rules={[
              { required: true, message: "Please enter outlet name" },
              { max: 255, message: "Name is too long (max 255 characters)" },
            ]}
            extra={
              <Text type="secondary" className="form-helper">
                Give your outlet a unique name that identifies this location
              </Text>
            }
          >
            <Input
              placeholder="e.g., Main Branch - Bedok, Downtown Studio"
              size="large"
              className="form-input"
            />
          </Form.Item>

          {/* Description */}
          <Form.Item
            name="description"
            label={
              <span className="form-label">
                <InfoCircleOutlined /> Description (Optional)
              </span>
            }
            extra={
              <Text type="secondary" className="form-helper">
                Describe what makes this outlet special or unique
              </Text>
            }
          >
            <TextArea
              rows={3}
              placeholder="Our flagship outlet features 2 full-size courts with premium flooring and state-of-the-art facilities..."
              className="form-textarea"
            />
          </Form.Item>

          {/* Location Section */}
          <div className="form-section-divider">
            <EnvironmentOutlined /> Location Details
          </div>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="address"
                label={<span className="form-label">Address</span>}
                rules={[{ required: true, message: "Please select address" }]}
              >
                <Select
                  showSearch
                  placeholder="Search for address..."
                  onSearch={handleAddressSearch}
                  options={(addressData || []).map((d) => ({
                    value: JSON.stringify(d),
                    label: d.ADDRESS,
                  }))}
                  size="large"
                  className="form-select"
                  filterOption={false}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="nearest_mrt"
                label={<span className="form-label">Nearest MRT Station</span>}
                rules={[{ required: true, message: "Please select MRT" }]}
              >
                <Select
                  showSearch
                  placeholder="Select nearest MRT..."
                  size="large"
                  className="form-select"
                >
                  {Object.keys(mrtStations).map((k) => (
                    <Select.Option key={k} value={k}>
                      {renderTags(mrtStations[k])} {k}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Contact Section */}
          <div className="form-section-divider">
            <PhoneOutlined /> Contact Information
          </div>

          <Form.Item
            name="phone_number"
            label={<span className="form-label">Contact Number (Optional)</span>}
            rules={[
              {
                pattern: /^[689]\d{7}$/,
                message: "Please enter a valid 8-digit Singapore number",
              },
            ]}
            extra={
              <Text type="secondary" className="form-helper">
                8-digit Singapore phone number specific to this outlet
              </Text>
            }
          >
            <Input
              placeholder="91234567"
              maxLength={8}
              size="large"
              prefix={<PhoneOutlined style={{ color: "var(--text-muted)" }} />}
              className="form-input"
            />
          </Form.Item>

          {/* Images Section */}
          <div className="form-section-divider">
            <PlusOutlined /> Outlet Photos (Optional)
          </div>

          <Form.Item
            label={<span className="form-label">Upload Photos</span>}
            extra={
              <Text type="secondary" className="form-helper">
                Add photos of your outlet to help customers recognize the location
                (Max 5MB per image)
              </Text>
            }
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={beforeUpload}
              maxCount={6}
              className="outlet-upload"
            >
              {fileList.length >= 6 ? null : uploadButton}
            </Upload>
          </Form.Item>
        </Space>
      </Card>

      {/* Form Actions */}
      <Form.Item className="outlet-form-actions" style={{ marginBottom: 0, marginTop: 24 }}>
        <Space style={{ width: "100%", justifyContent: "flex-end" }} size="middle">
          <Button size="large" onClick={onCancel} className="cancel-btn">
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            className="submit-btn"
          >
            {outlet ? "Update Outlet" : "Create Outlet"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default OutletForm;
