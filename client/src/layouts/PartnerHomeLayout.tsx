/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy layout notification/session model migration boundary.
import { useCallback, useContext, useEffect, useState } from "react";
import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  SwapOutlined,
  UserOutlined,
  WalletOutlined,
  StarOutlined,
  PercentageOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Image,
  Layout,
  Menu,
  Tooltip,
  Typography,
} from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import UserContext from "../components/UserContext";
import logo from "../images/logopngResize.png";
import "./PartnerLayout.css";
import { fetchWithAuth, API_ENDPOINTS } from "../utils/api";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const getRouteMeta = (pathname) => {
  if (pathname.startsWith("/profile")) {
    return { key: "profile", title: "Profile", eyebrow: "Settings" };
  }
  if (pathname.startsWith("/outlets")) {
    return { key: "outlets", title: "Outlets", eyebrow: "Locations" };
  }
  if (pathname.startsWith("/earnings")) {
    return { key: "earnings", title: "Earnings & payouts", eyebrow: "Finance" };
  }
  if (pathname.startsWith("/make-up-requests")) {
    return { key: "make-up-requests", title: "Make-up requests", eyebrow: "Bookings" };
  }
  if (pathname.startsWith("/sessions")) {
    return { key: "sessions", title: "Session management", eyebrow: "Bookings" };
  }
  if (pathname.startsWith("/reviews")) {
    return { key: "reviews", title: "Reviews", eyebrow: "Customer feedback" };
  }
  if (pathname.startsWith("/promotions")) {
    return { key: "promotions", title: "Promotions", eyebrow: "Pricing" };
  }
  if (pathname.startsWith("/notifications")) {
    return { key: "notifications", title: "Notifications", eyebrow: "Updates" };
  }
  if (
    pathname.startsWith("/classes") ||
    pathname.startsWith("/class/") ||
    pathname.startsWith("/create-class")
  ) {
    return { key: "classes", title: "Classes", eyebrow: "Catalogue" };
  }
  return { key: "home", title: "Dashboard", eyebrow: "Overview" };
};

const PartnerHomeLayout = ({ setAuth }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const routeMeta = getRouteMeta(location.pathname);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_UNREAD_COUNT);
      if (!response.ok) return;
      const data = await response.json();
      setUnreadNotifications(Number(data.unread_count || 0));
    } catch (error) {
      console.error("Unable to load notification count:", error);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadUnreadNotifications();
    const refreshTimer = window.setInterval(loadUnreadNotifications, 60000);
    window.addEventListener(
      "partner-notifications-updated",
      loadUnreadNotifications,
    );
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener(
        "partner-notifications-updated",
        loadUnreadNotifications,
      );
    };
  }, [loadUnreadNotifications, location.pathname]);

  const handleLogout = async () => {
    try {
      await fetchWithAuth(API_ENDPOINTS.LOGOUT, { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setAuth(false);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const navigationItems = [
    {
      key: "home",
      icon: <AppstoreOutlined />,
      label: <Link to="/home">Dashboard</Link>,
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link to="/profile">Profile</Link>,
    },
    {
      key: "outlets",
      icon: <EnvironmentOutlined />,
      label: <Link to="/outlets">Outlets</Link>,
    },
    {
      key: "classes",
      icon: <BookOutlined />,
      label: <Link to="/classes">Classes</Link>,
    },
    {
      key: "make-up-requests",
      icon: <SwapOutlined />,
      label: <Link to="/make-up-requests">Make-up requests</Link>,
    },
    {
      key: "sessions",
      icon: <CalendarOutlined />,
      label: <Link to="/sessions">Sessions</Link>,
    },
    {
      key: "reviews",
      icon: <StarOutlined />,
      label: <Link to="/reviews">Reviews</Link>,
    },
    {
      key: "promotions",
      icon: <PercentageOutlined />,
      label: <Link to="/promotions">Promotions</Link>,
    },
    {
      key: "earnings",
      icon: <WalletOutlined />,
      label: <Link to="/earnings">Earnings & payouts</Link>,
    },
  ];

  const renderSidebarContent = () => (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <Image
          src={logo}
          preview={false}
          width={104}
          className="sidebar-logo"
        />
        <div className="sidebar-brand-copy">
          <Text className="sidebar-brand-title">Partner</Text>
          <Text className="sidebar-brand-subtitle">Workspace</Text>
        </div>
      </div>

      <div className="sidebar-account">
        <Avatar
          size={48}
          src={user?.picture}
          icon={<UserOutlined />}
          className="sidebar-avatar"
        />
        <div className="sidebar-account-copy">
          <Text className="sidebar-user-name">
            {user?.partner_name || "Partner account"}
          </Text>
          <Text
            className="sidebar-user-email"
            ellipsis={{ tooltip: user?.email }}
          >
            {user?.email || "Complete your profile"}
          </Text>
        </div>
      </div>

      <Text className="sidebar-section-label">Workspace</Text>
      <Menu
        mode="inline"
        selectedKeys={[routeMeta.key]}
        onClick={() => setDrawerVisible(false)}
        items={navigationItems}
        className="sidebar-navigation"
      />

      <div className="sidebar-spacer" />

      <div className="sidebar-support">
        <span className="sidebar-support-icon">
          <QuestionCircleOutlined />
        </span>
        <div>
          <Text className="sidebar-support-title">Need a hand?</Text>
          <a href="mailto:admin@juniorpass.sg">Contact Junior Pass</a>
        </div>
      </div>

      <Text className="sidebar-footer-text">
        © {new Date().getFullYear()} Junior Pass
      </Text>
    </div>
  );

  return (
    <Layout className="partner-layout">
      {!isMobile && (
        <Sider className="partner-sidebar" width={272}>
          {renderSidebarContent()}
        </Sider>
      )}

      <Drawer
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="mobile-sidebar-drawer"
        width={292}
        styles={{ body: { padding: 0 }, header: { display: "none" } }}
      >
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => setDrawerVisible(false)}
          className="drawer-close-button"
          aria-label="Close navigation"
        />
        {renderSidebarContent()}
      </Drawer>

      <Layout className="partner-main-layout">
        <Header className="partner-header">
          <div className="topbar-left">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                className="mobile-menu-button"
                aria-label="Open navigation"
              />
            )}
          </div>

          <div className="topbar-actions">
            <Tooltip title="Notifications">
              <Badge count={unreadNotifications} overflowCount={99} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="topbar-icon-button"
                  onClick={() => navigate("/notifications")}
                  aria-label="Notifications"
                />
              </Badge>
            </Tooltip>

            <div className="topbar-account">
              <Avatar size={36} src={user?.picture} icon={<UserOutlined />} />
              <div className="topbar-account-copy">
                <Text className="topbar-account-name">
                  {user?.partner_name || "Partner"}
                </Text>
                <Text className="topbar-account-role">Partner account</Text>
              </div>
            </div>

            <Tooltip title="Log out">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                className="topbar-icon-button logout-button"
                onClick={handleLogout}
                aria-label="Log out"
              />
            </Tooltip>
          </div>
        </Header>

        <Content className="partner-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default PartnerHomeLayout;
