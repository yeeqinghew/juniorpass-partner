/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy outlet API model migration boundary.
import { useContext, useState, useEffect } from "react";
import {
  Typography,
  Button,
  Modal,
  Input,
  Space,
  Tag,
  Empty,
  Spin,
  Image,
  Select,
  Radio,
} from "antd";
import {
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ShopOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { fetchWithAuth } from "../../utils/api";
import UserContext from "../UserContext";
import OutletForm from "./OutletForm";
import toast from "react-hot-toast";
import "./OutletsManagement.css";

const { Title, Text } = Typography;
const { Search } = Input;

const OutletsManagement = () => {
  const { user } = useContext(UserContext);
  const [outlets, setOutlets] = useState([]);
  const [filteredOutlets, setFilteredOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchOutlets();
  }, [user]);

  useEffect(() => {
    filterAndSortOutlets();
  }, [outlets, searchTerm, sortBy]);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `/outlets/partner/${user?.partner_id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setOutlets(data || []);
      }
    } catch (error) {
      console.error("Error fetching outlets:", error);
      toast.error("Failed to load outlets");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortOutlets = () => {
    let filtered = [...outlets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (outlet) =>
          outlet.outlet_name?.toLowerCase().includes(term) ||
          outlet.description?.toLowerCase().includes(term) ||
          outlet.nearest_mrt?.toLowerCase().includes(term),
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.outlet_name || "").localeCompare(b.outlet_name || "");
        case "listings":
          return (b.listing_count || 0) - (a.listing_count || 0);
        case "newest":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    setFilteredOutlets(filtered);
  };

  const handleCreate = () => {
    setEditingOutlet(null);
    setIsModalOpen(true);
  };

  const handleEdit = (outlet) => {
    setEditingOutlet(outlet);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingOutlet(null);
  };

  const handleSaveSuccess = () => {
    toast.success(
      `Outlet ${editingOutlet ? "updated" : "created"} successfully!`,
    );
    setIsModalOpen(false);
    setEditingOutlet(null);
    fetchOutlets();
  };

  const getAddress = (addressJson) => {
    try {
      const addr =
        typeof addressJson === "string" ? JSON.parse(addressJson) : addressJson;
      return addr?.ADDRESS || "No address";
    } catch {
      return "No address";
    }
  };

  const getImages = (imagesJson) => {
    try {
      const imgs =
        typeof imagesJson === "string" ? JSON.parse(imagesJson) : imagesJson;
      return Array.isArray(imgs) ? imgs : [];
    } catch {
      return [];
    }
  };

  const renderOutletCard = (outlet) => {
    const images = getImages(outlet.images);
    const hasImages = images.length > 0;

    return (
      <article key={outlet.outlet_id} className="location-card">
        <div className="location-card-media">
          {hasImages ? (
            <Image.PreviewGroup>
              <Image
                src={images[0]}
                alt={outlet.outlet_name}
                className="location-card-image"
                preview={{ mask: "View gallery" }}
              />
              {images.slice(1).map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  alt={`${outlet.outlet_name} ${idx + 2}`}
                  style={{ display: "none" }}
                />
              ))}
            </Image.PreviewGroup>
          ) : (
            <div className="location-card-placeholder">
              <ShopOutlined />
              <span>Add location photos</span>
            </div>
          )}
          <span className="location-photo-count">
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </span>
        </div>

        <div className="location-card-body">
          <div className="location-card-heading">
            <div>
              <Text className="location-card-kicker">Junior Pass location</Text>
              <Title level={4} className="location-card-title">
                {outlet.outlet_name || "Unnamed outlet"}
              </Title>
            </div>
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(outlet)}
              className="location-edit-button"
            >
              Edit
            </Button>
          </div>

          <Text className="location-card-description" ellipsis={{ rows: 2 }}>
            {outlet.description || "No outlet description has been added yet."}
          </Text>

          <div className="location-detail-list">
            <div className="location-detail-row">
              <span className="location-detail-icon"><EnvironmentOutlined /></span>
              <div>
                <small>Address</small>
                <strong>{getAddress(outlet.address)}</strong>
              </div>
            </div>
            <div className="location-detail-row">
              <span className="location-detail-icon"><PhoneOutlined /></span>
              <div>
                <small>Contact</small>
                <strong>{outlet.phone_number || "Not provided"}</strong>
              </div>
            </div>
          </div>

          <div className="location-card-footer">
            <Tag className="location-mrt-tag">
              {outlet.nearest_mrt ? `${outlet.nearest_mrt} MRT` : "MRT not added"}
            </Tag>
            <div className="location-metrics">
              <span><ShopOutlined /> {outlet.listing_count || 0} classes</span>
              <span><CalendarOutlined /> {outlet.future_bookings_count || 0} bookings</span>
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <div className="outlets-management">
        <div className="outlets-loading">
          <Spin size="large" />
          <Text>Loading outlets...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="outlets-management">
      <div className="outlets-management-inner">
        <div className="outlets-header">
          <div className="outlets-header-content">
            <div className="outlets-title-section">
              <div>
                <Text className="outlets-kicker">Location management</Text>
                <Title level={2} className="outlets-title">
                  Outlets
                </Title>
                <Text className="outlets-subtitle">
                  Keep venue details accurate for families and class schedules.
                </Text>
              </div>
            </div>
            <div className="outlets-header-actions">
              <Text className="outlets-count">
                {outlets.length} {outlets.length === 1 ? "location" : "locations"}
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                className="add-outlet-btn"
              >
                Add outlet
              </Button>
            </div>
          </div>
        </div>

        <section className="outlets-directory">
          <div className="outlets-directory-header">
            <div className="outlets-directory-heading">
              <Text className="outlets-directory-title">Your locations</Text>
              <Text className="outlets-directory-subtitle">
                {filteredOutlets.length} {filteredOutlets.length === 1 ? "outlet" : "outlets"} shown
              </Text>
            </div>
            <div className="outlets-directory-controls">
              <Search
                placeholder="Search name, MRT, or description"
                allowClear
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="outlet-search"
              />

              <Select
                value={sortBy}
                onChange={setSortBy}
                className="outlet-sort"
                aria-label="Sort outlets"
              >
                <Select.Option value="newest">Newest first</Select.Option>
                <Select.Option value="name">Name</Select.Option>
                <Select.Option value="listings">Most classes</Select.Option>
              </Select>

              <Radio.Group
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                buttonStyle="solid"
                className="outlet-view-toggle"
              >
                <Radio.Button value="grid" aria-label="Grid view">
                  <AppstoreOutlined />
                </Radio.Button>
                <Radio.Button value="list" aria-label="List view">
                  <UnorderedListOutlined />
                </Radio.Button>
              </Radio.Group>
            </div>
          </div>

          <div className="outlets-directory-content">
            {filteredOutlets.length === 0 ? (
              <div className="outlets-empty-state">
                <Empty
                  image={
                    <ShopOutlined
                      style={{ fontSize: 64, color: "var(--primary-color)" }}
                    />
                  }
                  description={
                    searchTerm ? (
                      <Space direction="vertical">
                        <Text>No outlets match your search</Text>
                        <Button onClick={() => setSearchTerm("")}>
                          Clear search
                        </Button>
                      </Space>
                    ) : (
                      <Space direction="vertical">
                        <Text>No outlets yet</Text>
                        <Text type="secondary">
                          Add your first location to start scheduling classes.
                        </Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleCreate}
                        >
                          Add your first outlet
                        </Button>
                      </Space>
                    )
                  }
                />
              </div>
            ) : (
              <div
                className={`outlets-grid ${
                  viewMode === "list" ? "outlets-list" : ""
                }`}
              >
                {filteredOutlets.map((outlet) => renderOutletCard(outlet))}
              </div>
            )}
          </div>
        </section>

        <Modal
          title={
            <Space>
              <ShopOutlined />
              <span>{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</span>
            </Space>
          }
          open={isModalOpen}
          onCancel={handleModalClose}
          footer={null}
          width={880}
          destroyOnClose
          className="outlet-modal"
        >
          <OutletForm
            outlet={editingOutlet}
            onSuccess={handleSaveSuccess}
            onCancel={handleModalClose}
          />
        </Modal>
      </div>
    </div>
  );
};

export default OutletsManagement;
