import { useState, useEffect, useContext, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Upload,
  message,
  Select,
  Avatar,
  Row,
  Col,
  Tooltip,
  Card,
  Divider,
  Space,
  Spin,
} from "antd";
import {
  InfoCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  ShopOutlined,
  PhoneOutlined,
  SaveOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import UserContext from "../UserContext";
import _ from "lodash";
import "./Profile.css";
import LoadingContainer from "../../utils/LoadingContainer";
import toast from "react-hot-toast";
import { DataContext } from "../../hooks/DataContext";

const { TextArea } = Input;

const Profile = () => {
  const { user } = useContext(UserContext);
  const { categories } = useContext(DataContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm] = Form.useForm();
  const [userProfile, setUserProfile] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function retrieveUser() {
      if (!user || !user.partner_id) return;

      setLoading(true);

      try {
        const partnerRes = await fetchWithAuth(API_ENDPOINTS.GET_PARTNER);

        const partnerData = await partnerRes.json();
        setUserProfile(partnerData);

        profileForm.setFieldsValue(partnerData);
      } catch (err) {
        message.error("Error fetching profile, ", err.message);
      } finally {
        setLoading(false);
      }
    }

    retrieveUser();
  }, [profileForm, user]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_PARTNER(user.partner_id),
        {
          method: "PATCH",
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Update failed");
      }

      toast.success("Profile changes saved successfully");
      setUserProfile((prev) => ({ ...prev, ...values }));
    } catch (error) {
      toast.error(error.message || "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }
    if (file.size / 1024 / 1024 > 5) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      setUploadLoading(true);
      const sigRes = await fetchWithAuth(API_ENDPOINTS.UPLOAD_PARTNER_DP, {
        method: "POST",
      });
      const sigData = await sigRes.json();
      if (!sigRes.ok)
        throw new Error(sigData.message || "Failed to get upload signature");

      const formData = new FormData();
      formData.append("file", file);
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
      if (!uploadRes.ok)
        throw new Error(uploadData.error?.message || "Upload failed");

      const updateRes = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_PARTNER(user.partner_id),
        {
          method: "PATCH",
          body: JSON.stringify({ picture: uploadData.secure_url }),
        },
      );
      if (!updateRes.ok) throw new Error("Failed to update profile picture");

      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error("Failed to upload image ", error.message);
    } finally {
      setUploadLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  if (loading) {
    return <LoadingContainer />;
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        {/* HEADER */}
        <div className="profile-header">
          <div>
            <span className="profile-kicker">Business presence</span>
            <h2 className="profile-title">Partner Profile</h2>
            <p className="profile-subtitle">
              Manage the information families see across Junior Pass.
            </p>
          </div>
          <span className="profile-header-badge">
            <ShopOutlined /> Public business profile
          </span>
        </div>

        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleSubmit}
          className="profile-form-layout"
        >
          <Row gutter={[24, 24]}>
            {/* LEFT */}
            <Col xs={24} lg={8}>
              <Card className="profile-card profile-identity-card">
                <div className="ac-avatar-wrap">
                  <Avatar
                    size={88}
                    className="ac-avatar"
                    src={userProfile?.picture}
                    icon={<UserOutlined />}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="ac-camera-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                    title="Change photo"
                  >
                    <CameraOutlined />
                  </button>
                </div>

                <span className="profile-identity-label">Partner account</span>
                <h3>{userProfile.partner_name}</h3>
                <p>{userProfile.email}</p>
              </Card>
            </Col>

            {/* RIGHT */}
            <Col xs={24} lg={16}>
              {/* BASIC */}
              <Card
                className="profile-card"
                title={
                  <>
                    <UserOutlined className="form-section-icon" />
                    Basic Information
                  </>
                }
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="partner_name" label="Name" required>
                      <Input className="input-with-icon" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="email" label="Email">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label="Description" required>
                  <TextArea rows={4} className="input-with-icon" />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="category_ids"
                      label="Categories"
                      rules={[
                        {
                          required: true,
                          message: "Select at least one category",
                        },
                      ]}
                    >
                      <Select
                        mode="multiple"
                        className="input-with-icon"
                        placeholder="Select business categories"
                        options={categories.map((category) => ({
                          value: category.id,
                          label: category.name,
                        }))}
                      >
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="website" label="Website" required>
                      <Input className="input-with-icon" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* CONTACT */}
              <Card
                className="profile-card"
                title={
                  <>
                    <PhoneOutlined className="form-section-icon" />
                    Contact
                  </>
                }
              >
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item name="contact_number" label="Phone" required>
                      <Input className="input-with-icon" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <div className="profile-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                  className="save-button"
                >
                  Save Changes
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
};

export default Profile;
