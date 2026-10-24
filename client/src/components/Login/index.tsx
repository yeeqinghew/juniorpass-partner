import { useState } from "react";
import {
  LockOutlined,
  MailOutlined,
  EyeTwoTone,
  EyeInvisibleOutlined,
  ArrowRightOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Card, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import logo from "../../images/logopngResize.png";
import "./Login.css";

const { Title, Text } = Typography;

type LoginValues = { email: string; password: string };
type LoginResponse = {
  authenticated?: boolean;
  requires_password_change?: boolean;
  is_profile_complete?: boolean;
  message?: string;
};

const PartnerLogin = ({ setAuth }: { setAuth: (authenticated: boolean) => void }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginValues) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.LOGIN, {
        method: "POST",
        body: JSON.stringify(values),
      });

      const parseRes = (await response.json()) as LoginResponse;
      if (response.ok && parseRes.authenticated) {
        // Check for password change requirement
        if (parseRes.requires_password_change) {
          setAuth(true);
          navigate("/change-password", { replace: true });
          toast.success("Login successful! Please change your password.");
          return;
        }

        // Check for profile completion requirement
        if (parseRes.is_profile_complete === false) {
          setAuth(true);
          navigate("/profile", { replace: true });
          toast.success("Login successful! Please complete your profile.");
          return;
        }

        // Normal login - all setup complete
        setAuth(true);
        toast.success("Welcome back! Login successful.");
      } else {
        setAuth(false);
        toast.error(parseRes.message || "Invalid email or password");
      }
    } catch (err) {
      setAuth(false);
      console.error(err instanceof Error ? err.message : err);
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-shell">
        <div className="login-container">
          <Card className="login-card" bordered={false}>
            {/* Header Section */}
            <div className="login-header">
              <img src={logo} alt="Junior Pass Logo" className="login-logo" />
              <div className="partner-badge">
                <TeamOutlined />
                Partner Portal
              </div>
              <Title level={2} className="login-title">
                Welcome Back
              </Title>
              <Text className="login-subtitle">
                Sign in to manage your classes and bookings
              </Text>
            </div>

            {/* Login Form */}
            <Form
              name="partner_login"
              className="partner-login-form"
              onFinish={handleLogin}
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

              <Form.Item
                name="password"
                label={<Text strong>Password</Text>}
                rules={[
                  {
                    required: true,
                    message: "Please enter your password",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder="Enter your password"
                  size="large"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                  autoComplete="current-password"
                />
              </Form.Item>

              <div className="forgot-password-row">
                <Link to="/reset-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-button"
                  loading={loading}
                  icon={<ArrowRightOutlined />}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </Form.Item>
            </Form>

            {/* Help Section */}
            <div className="login-help">
              <Text className="help-text">
                Need help? Contact us at
                <a href="mailto:admin@juniorpass.sg" className="help-link">
                  admin@juniorpass.sg
                </a>
              </Text>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogin;
