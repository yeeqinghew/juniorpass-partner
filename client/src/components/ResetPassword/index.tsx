import { useState } from "react";
import {
  MailOutlined,
  SafetyOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Card, Typography } from "antd";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import logo from "../../images/logopngResize.png";
import "./ResetPassword.css";

const { Title, Text } = Typography;

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.RESET_PASSWORD, {
        method: "POST",
        body: JSON.stringify(values),
      });

      const parseRes = (await response.json()) as { message?: string };
      if (response.ok) {
        setSubmittedEmail(values.email);
        setEmailSent(true);
        toast.success("Password reset email sent!");
      } else {
        toast.error(parseRes.message || "Failed to send reset email");
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="reset-page">
      <div className="reset-container">
        <Card className="reset-card" bordered={false}>
          {/* Header Section */}
          <div className="reset-header">
            <img src={logo} alt="Junior Pass Logo" className="reset-logo" />
            <div className="reset-icon-wrapper">
              <SafetyOutlined className="reset-icon" />
            </div>
            <Title level={2} className="reset-title">
              Reset Password
            </Title>
            <Text className="reset-subtitle">
              {emailSent
                ? "Check your email for reset instructions"
                : "Enter your email address and we'll send you a link to reset your password"}
            </Text>
          </div>

          {emailSent ? (
            /* Success State */
            <div className="reset-success">
              <div className="success-icon-wrapper">
                <CheckCircleOutlined />
              </div>
              <h3 className="success-title">Email Sent!</h3>
              <p className="success-message">
                We've sent a password reset link to{" "}
                <strong>{submittedEmail}</strong>. Please check your inbox and
                follow the instructions to reset your password.
              </p>
              <Link to="/login" className="back-to-login">
                <ArrowLeftOutlined />
                Back to Login
              </Link>
            </div>
          ) : (
            /* Reset Form */
            <Form
              name="partner_reset"
              className="partner-reset-form"
              onFinish={handleSubmit}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={<Text strong>Email Address</Text>}
                rules={[
                  {
                    required: true,
                    message: "Please enter your email address",
                  },
                  {
                    type: "email",
                    message: "Please enter a valid email address",
                  },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="input-icon" />}
                  placeholder="Enter your email"
                  type="email"
                  size="large"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="reset-button"
                  loading={loading}
                  icon={<SendOutlined />}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </Form.Item>

              <Link to="/login" className="back-to-login">
                <ArrowLeftOutlined />
                Back to Login
              </Link>
            </Form>
          )}

          {/* Help Section */}
          <div className="reset-help">
            <Text className="help-text">
              Need help? Contact us at
              <a href="mailto:admin@juniorpass.sg" className="help-link">
                admin@juniorpass.sg
              </a>
            </Text>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ResetPassword;
