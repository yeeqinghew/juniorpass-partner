/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy class-card API model migration boundary.
import { useState } from "react";
import { Button, Card, Carousel, Dropdown, Modal, Tag } from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  InboxOutlined,
  MoreOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";

const ClassCard = ({ listing, setListing }) => {
  const navigate = useNavigate();
  const [modal, modalContextHolder] = Modal.useModal();
  const [statusUpdating, setStatusUpdating] = useState(false);
  const signupCount = Number(listing.signup_count || 0);
  const canSetInactive = listing.active && signupCount === 0;
  const outlets = Array.isArray(listing.outlets_info)
    ? listing.outlets_info
    : [];
  const scheduleCount = outlets.reduce(
    (total, outlet) => total + (outlet.schedule_groups?.length || 0),
    0,
  );

  const getImages = () => {
    let images = listing?.images;
    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch {
        images = [];
      }
    }
    return Array.isArray(images) ? images : [];
  };

  const updateListingStatus = async () => {
    try {
      setStatusUpdating(true);
      const newStatus = !listing.active;
      const response = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_LISTING_STATUS(listing.listing_id),
        {
          method: "PATCH",
          body: JSON.stringify({ active: newStatus }),
        },
      );
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to update listing status",
        );
      }

      setListing((current) =>
        current.map((item) =>
          item.listing_id === listing.listing_id
            ? { ...item, active: newStatus }
            : item,
        ),
      );
      toast.success(
        newStatus ? "Listing activated" : "Listing set to inactive",
      );
    } catch (error) {
      toast.error(error.message || "Failed to update listing status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const confirmInactive = () => {
    modal.confirm({
      title: "Set this listing to inactive?",
      content:
        "Parents will no longer see or book it. You can activate it again later.",
      okText: "Set inactive",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: updateListingStatus,
    });
  };

  const handleMoreAction = ({ key, domEvent }) => {
    domEvent?.stopPropagation?.();

    if (key === "inactive") {
      confirmInactive();
    } else if (key === "activate") {
      updateListingStatus();
    }
  };

  const moreItems = listing.active
    ? canSetInactive
      ? [
          {
            key: "inactive",
            label: "Set inactive",
            icon: <InboxOutlined />,
            danger: true,
          },
        ]
      : [
          {
            key: "inactive-unavailable",
            label: "Cannot inactivate — has sign-ups",
            icon: <TeamOutlined />,
            disabled: true,
          },
        ]
    : [
        {
          key: "activate",
          label: "Activate listing",
          icon: <CheckCircleOutlined />,
        },
      ];

  const images = getImages();

  return (
    <>
      {modalContextHolder}
      <Card
      className="class-card"
      cover={
        <div className="class-card-media">
          <div
            className={`class-status-badge ${
              listing.active ? "class-status-active" : "class-status-inactive"
            }`}
          >
            {listing.active ? "Active" : "Inactive"}
          </div>
          {images.length > 0 ? (
            <Carousel autoplay autoplaySpeed={3000}>
              {images.map((imageUrl, index) => (
                <div key={imageUrl || index}>
                  <img
                    className="class-card-image"
                    alt={`${listing.listing_title} ${index + 1}`}
                    src={imageUrl}
                  />
                </div>
              ))}
            </Carousel>
          ) : (
            <div className="class-card-image-placeholder">
              <InboxOutlined />
              <span>No image</span>
            </div>
          )}
        </div>
      }
    >
      <div className="class-card-content">
        <div className="class-card-heading">
          <h3>{listing.listing_title}</h3>
          <p>{listing.description || "No description available"}</p>
        </div>

        <div className="class-card-metrics">
          <span>
            <TeamOutlined /> {signupCount} sign-up{signupCount === 1 ? "" : "s"}
          </span>
          <span>
            <EnvironmentOutlined /> {outlets.length} outlet{outlets.length === 1 ? "" : "s"}
          </span>
          <span>
            <ScheduleOutlined /> {scheduleCount} schedule{scheduleCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="class-info-tags">
          {(listing.categories || []).slice(0, 3).map((category) => (
            <Tag key={category}>{category}</Tag>
          ))}
        </div>

        <div className="class-card-actions">
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/class/${listing.listing_id}`)}
          >
            View details
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/class/${listing.listing_id}/edit`)}
          >
            Edit
          </Button>
          <Dropdown
            menu={{ items: moreItems, onClick: handleMoreAction }}
            trigger={["click"]}
          >
            <Button
              icon={<MoreOutlined />}
              loading={statusUpdating}
              disabled={statusUpdating}
              aria-label="More listing actions"
            />
          </Dropdown>
        </div>
      </div>
      </Card>
    </>
  );
};

export default ClassCard;
