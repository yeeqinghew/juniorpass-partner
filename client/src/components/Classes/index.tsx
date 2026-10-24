/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy class-workspace API model migration boundary.
import { useCallback, useContext, useEffect, useState } from "react";
import { Button, Tabs, Typography, Input } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ActiveClasses from "./ActiveClasses";
import InactiveClasses from "./InactiveClasses";
import AllClasses from "./AllClasses";
import UserContext from "../UserContext";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import "./Classes.css";

const { Title } = Typography;

const PartnerClasses = ({ setAuth }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [listing, setListing] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const getAllListings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_PARTNER_LISTINGS(user.partner_id),
        {
          method: "GET",
        },
      );
      const parseRes = await response.json();
      if (response.status === 200) {
        setListing(parseRes);
      } else {
        setAuth(false);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [setAuth, user?.partner_id]);

  useEffect(() => {
    if (!user?.partner_id) {
      setLoading(false);
      return;
    }
    getAllListings();
  }, [user?.partner_id, getAllListings]);

  const handleCreateClass = () => {
    navigate("/create-class");
  };

  // Filter listings based on search term
  const filteredListings = listing.filter(
    (item) =>
      item.listing_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeCount = listing.filter((l) => l.active).length;
  const inactiveCount = listing.filter((l) => !l.active).length;
  const signupCount = listing.reduce(
    (total, item) => total + Number(item.signup_count || 0),
    0,
  );

  return (
    <div className="classes-container">
      <div className="welcome-banner classes-page-header">
        <div className="welcome-content">
          <span className="page-kicker">Class catalogue</span>
          <Title level={2} className="welcome-title">
            My Classes
          </Title>
          <p className="welcome-text">
            Manage your class listings, schedules, and availability
          </p>
        </div>
        <div className="welcome-actions">
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateClass}
            className="welcome-btn-primary"
          >
            Create New Class
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="classes-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <BookOutlined />
          </div>
          <div className="stat-content">
            <div className="stat-value">{listing.length}</div>
            <div className="stat-label">Total Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <CheckCircleOutlined />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">
            <CloseCircleOutlined />
          </div>
          <div className="stat-content">
            <div className="stat-value">{inactiveCount}</div>
            <div className="stat-label">Inactive Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon signups">
            <TeamOutlined />
          </div>
          <div className="stat-content">
            <div className="stat-value">{signupCount}</div>
            <div className="stat-label">Total Sign-ups</div>
          </div>
        </div>
      </div>

      <section className="classes-catalogue-panel">
        <div className="classes-toolbar">
          <div>
            <strong>Class catalogue</strong>
            <span>Search and filter your published activities</span>
          </div>
          <Input
            placeholder="Search classes..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="classes-search"
            allowClear
          />
        </div>

        <Tabs
          defaultActiveKey="1"
          size="large"
          className="classes-tabs"
          items={[
          {
            label: `All (${filteredListings.length})`,
            key: "1",
            children: (
              <AllClasses
                listing={filteredListings}
                setListing={setListing}
                loading={loading}
              />
            ),
          },
          {
            label: `Active (${filteredListings.filter((l) => l.active).length})`,
            key: "2",
            children: (
              <ActiveClasses
                listing={filteredListings.filter((l) => l.active)}
                setListing={setListing}
                loading={loading}
              />
            ),
          },
          {
            label: `Inactive (${filteredListings.filter((l) => !l.active).length})`,
            key: "3",
            children: (
              <InactiveClasses
                listing={filteredListings.filter((l) => !l.active)}
                setListing={setListing}
                loading={loading}
              />
            ),
          },
          ]}
        />
      </section>
    </div>
  );
};

export default PartnerClasses;
