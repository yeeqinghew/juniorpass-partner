import React, { useEffect, useState } from "react";
import {
  InboxOutlined,
  LeftOutlined,
  DownloadOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  EditOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Col,
  Image,
  Row,
  Typography,
  Tabs,
  Table,
  Card,
  Tag,
  Space,
  Statistic,
  Empty,
  Badge,
  Divider,
  message,
  Dropdown,
  Modal,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth, API_ENDPOINTS } from "../../utils/api";
import { formatChildAge } from "../../utils/age.js";
import toast from "react-hot-toast";
import "./ClassEdit.css";
import "./ClassDetails.css";

const { Title, Text, Paragraph } = Typography;

const Class = () => {
  const [modal, modalContextHolder] = Modal.useModal();
  const navigate = useNavigate();
  const { listing_id } = useParams();
  const [listing, setListing] = useState();
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Fetch registered students for this class
  const fetchRegisteredStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_BOOKINGS_FOR_LISTING(listing_id),
      );

      if (response.ok) {
        const data = await response.json();
        setRegisteredStudents(data || []);
      } else {
        setRegisteredStudents([]);
      }
    } catch (error) {
      console.error("Error fetching registered students:", error);
      setRegisteredStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    async function fetchClassDetails() {
      try {
        const response = await fetchWithAuth(
          API_ENDPOINTS.GET_LISTING(listing_id),
          {
            method: "GET",
          },
        );
        const parseRes = await response.json();
        setListing(parseRes);
      } catch (error) {
        console.error("Error fetching class details:", error);
      }
    }
    fetchClassDetails();
    fetchRegisteredStudents();
  }, [listing_id]);

  // Export students to CSV
  const exportToCSV = () => {
    if (registeredStudents.length === 0) {
      message.warning("No students to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Child Name",
      "Child Age",
      "Schedule",
      "Booking Date",
    ];
    const csvContent = [
      headers.join(","),
      ...registeredStudents.map((student) =>
        [
          student.parent_name || "N/A",
          student.email || "N/A",
          student.phone || "N/A",
          student.child_name || "N/A",
          formatChildAge(student),
          student.schedule_day || "N/A",
          student.booking_date
            ? new Date(student.booking_date).toLocaleDateString()
            : "N/A",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${listing?.listing_title || "class"}_students_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Student list exported successfully!");
  };

  // Navigate to edit page
  const handleEditClass = () => {
    navigate(`/class/${listing_id}/edit`);
  };

  const signupCount = Math.max(
    Number(listing?.signup_count || 0),
    registeredStudents.length,
  );
  const canSetInactive = listing?.active && signupCount === 0;

  const updateListingStatus = async () => {
    try {
      setStatusUpdating(true);
      const newStatus = !listing.active;
      const response = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_LISTING_STATUS(listing_id),
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

      setListing((current) => ({ ...current, active: newStatus }));
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

  const statusMenuItems = canSetInactive
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
      ];

  // Parse images
  const getImages = () => {
    let images = listing?.images;
    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch {
        images = [];
      }
    }
    if (!Array.isArray(images)) {
      images = [];
    }
    return images;
  };

  // Parse outlets and schedule groups
  const getOutletsInfo = () => {
    return listing?.outlets_info || [];
  };

  // Get total schedule count across all outlets
  const getTotalScheduleCount = () => {
    return getOutletsInfo().reduce((total, outlet) => {
      return total + (outlet.schedule_groups?.length || 0);
    }, 0);
  };

  // Format time for display
  const formatTime = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    return `${startTime} - ${endTime}`;
  };

  const formatOutletAddress = (address) => {
    if (!address) return "Unknown location";
    if (typeof address === "object") {
      return address.ADDRESS || address.address || "Unknown location";
    }

    try {
      const parsedAddress = JSON.parse(address);
      return parsedAddress.ADDRESS || parsedAddress.address || address;
    } catch {
      return address;
    }
  };

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="overview-tab">
      {/* Compact summary */}
      <Card className="class-summary-card mb-24">
        <Row gutter={[0, 16]}>
          <Col xs={12} md={6} className="summary-item">
            <Statistic
              title={<span className="stat-card-title">Total Bookings</span>}
              value={registeredStudents.length}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col xs={12} md={6} className="summary-item">
            <Statistic
              title={<span className="stat-card-title">Programs</span>}
              value={getTotalScheduleCount()}
              prefix={<CalendarOutlined />}
            />
          </Col>
          <Col xs={12} md={6} className="summary-item">
            <Statistic
              title={<span className="stat-card-title">Status</span>}
              value={listing?.active ? "Active" : "Inactive"}
            />
          </Col>
          <Col xs={12} md={6} className="summary-item summary-item-last">
            <Statistic
              title={<span className="stat-card-title">Rating</span>}
              value={listing?.rating || 0}
              suffix={<span className="rating-suffix">/ 5</span>}
            />
          </Col>
        </Row>
      </Card>

      {/* Class Info */}
      <Card className="class-info-card">
        <Row gutter={[32, 32]}>
          <Col xs={24} lg={16}>
            <Space direction="vertical" size="large" className="detail-stack">
              <div>
                <Title level={2} className="detail-class-title">
                  {listing?.listing_title}
                </Title>
                <Paragraph className="class-description">
                  {listing?.description}
                </Paragraph>
              </div>

              <Divider className="detail-divider" />

              <Row gutter={[24, 20]}>
                <Col span={12}>
                  <Space direction="vertical" size={8}>
                    <Text type="secondary" className="section-label">
                      Age Groups
                    </Text>
                    <Space wrap size={[8, 8]}>
                      {listing?.age_groups &&
                        (Array.isArray(listing.age_groups) ? (
                          listing.age_groups.map((age, i) => (
                            <Tag key={i} className="age-group-tag">
                              {age}
                            </Tag>
                          ))
                        ) : (
                          <Tag className="age-group-tag">
                            {listing.age_groups}
                          </Tag>
                        ))}
                    </Space>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" size={8}>
                    <Text type="secondary" className="section-label">
                      Created
                    </Text>
                    <Text strong className="detail-created-date">
                      {listing?.created_at
                        ? new Date(listing.created_at).toLocaleDateString(
                            "en-SG",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <div className="image-gallery-container">
              {getImages().length > 0 ? (
                <Image.PreviewGroup>
                  <div className="image-grid">
                    {getImages()
                      .slice(0, 4)
                      .map((img, i) => (
                        <Image key={i} src={img} className="gallery-image" />
                      ))}
                  </div>
                </Image.PreviewGroup>
              ) : (
                <div className="no-images-placeholder">
                  <InboxOutlined className="no-images-icon" />
                  <Text type="secondary">No images</Text>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      <Card className="class-policy-card">
        <div className="class-policy-heading">
          <SafetyCertificateOutlined />
          <div>
            <Title level={3}>Booking policy</Title>
            <Text>These terms are shown to families before confirmation.</Text>
          </div>
        </div>
        <dl className="class-policy-grid">
          <div>
            <dt>Cancellation deadline</dt>
            <dd>{listing?.cancellation_notice_hours ?? 24} hours before class</dd>
          </div>
          <div>
            <dt>Refund before deadline</dt>
            <dd>{listing?.refund_before_deadline_percent ?? 100}% of credits</dd>
          </div>
          <div>
            <dt>Refund after deadline</dt>
            <dd>{listing?.refund_after_deadline_percent ?? 0}% of credits</dd>
          </div>
          <div>
            <dt>Make-up requests</dt>
            <dd>
              {listing?.makeup_allowed
                ? `Allowed with ${listing?.makeup_notice_hours ?? 24} hours’ notice`
                : "Not allowed"}
            </dd>
          </div>
          <div className="class-policy-requirements">
            <dt>Important requirements</dt>
            <dd>
              {listing?.class_requirements ||
                "No additional requirements provided"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Schedules & Locations */}
      <Card className="programs-card">
        <div className="programs-header">
          <Space align="center" size={12}>
            <EnvironmentOutlined className="programs-icon" />
            <Title level={3} className="programs-title">
              Programs & Schedules
            </Title>
          </Space>
        </div>

        {getOutletsInfo().length > 0 ? (
          <Space direction="vertical" size={32} className="detail-stack">
            {getOutletsInfo().map((outlet, outletIndex) => (
              <div key={outletIndex}>
                {/* Outlet Header */}
                <div className="outlet-header">
                  <Space align="center">
                    <EnvironmentOutlined className="outlet-icon" />
                    <Text strong className="outlet-name">
                      {formatOutletAddress(outlet.outlet_address)}
                    </Text>
                    {outlet.nearest_mrt && (
                      <Tag className="outlet-mrt-tag">
                        {outlet.nearest_mrt} MRT
                      </Tag>
                    )}
                  </Space>
                </div>

                {/* Schedule Groups */}
                {outlet.schedule_groups && outlet.schedule_groups.length > 0 ? (
                  <Row gutter={[20, 20]}>
                    {outlet.schedule_groups.map((group, groupIndex) => (
                      <Col xs={24} xl={12} key={groupIndex}>
                        <Card
                          className="program-card"
                          hoverable
                        >
                          <Space
                            direction="vertical"
                            size={20}
                            className="detail-stack"
                          >
                            {/* Header Tags */}
                            <div>
                              <Space wrap size={[8, 8]}>
                                {group.package_types?.map((type, i) => (
                                  <Tag
                                    key={i}
                                    className={
                                      type === "full-term"
                                        ? "package-tag-fullterm"
                                        : type === "short-term"
                                          ? "package-tag-shortterm"
                                          : "package-tag-payg"
                                    }
                                  >
                                    {type.toUpperCase()}
                                  </Tag>
                                ))}
                                {group.is_progressive && (
                                  <Tag className="package-tag-progressive">
                                    PROGRESSIVE
                                  </Tag>
                                )}
                              </Space>
                              <div className="program-frequency">
                                <Space size={12}>
                                  <Tag
                                    icon={<SyncOutlined />}
                                    className="info-tag"
                                  >
                                    {group.frequency || "Weekly"}
                                  </Tag>
                                </Space>
                              </div>
                            </div>

                            {/* Time Slots */}
                            <div>
                              <Text strong className="subsection-header">
                                Time Slots
                              </Text>
                              {group.is_progressive && (
                                <Tag
                                  icon={<TeamOutlined />}
                                  className="info-tag"
                                >
                                  {group.capacity ?? "Not set"} programme capacity
                                </Tag>
                              )}
                              <Space
                                direction="vertical"
                                size={8}
                                className="detail-stack"
                              >
                                {group.time_slots?.map((slot, slotIndex) => (
                                  <div
                                    key={slotIndex}
                                    className="time-slot-item"
                                  >
                                    <CalendarOutlined className="time-slot-icon" />
                                    <Text strong className="time-slot-day">
                                      {slot.day}
                                    </Text>
                                    <ClockCircleOutlined className="time-slot-time-icon" />
                                    <Text className="time-slot-time">
                                      {formatTime(
                                        slot.start_time,
                                        slot.end_time,
                                      )}
                                    </Text>
                                    {!group.is_progressive && (
                                      <Tag
                                        icon={<TeamOutlined />}
                                        className="info-tag"
                                      >
                                        {slot.slots ?? "Not set"} capacity
                                      </Tag>
                                    )}
                                  </div>
                                ))}
                              </Space>
                            </div>

                            {/* Pricing */}
                            {(group.price_payg ||
                              group.price_fullterm ||
                              group.price_shortterm) && (
                              <div>
                                <Text strong className="subsection-header">
                                  Pricing
                                </Text>
                                <Space
                                  direction="vertical"
                                  size={8}
                                  className="detail-stack"
                                >
                                  {group.price_payg && (
                                    <div className="pricing-item pricing-item-payg">
                                      <Space>
                                        <DollarOutlined className="pricing-icon-payg" />
                                        <Text className="pricing-label-payg">
                                          Pay-as-you-go
                                        </Text>
                                      </Space>
                                      <Text
                                        strong
                                        className="pricing-value-payg"
                                      >
                                        ${group.price_payg}
                                      </Text>
                                    </div>
                                  )}
                                  {group.price_fullterm && (
                                    <div className="pricing-item pricing-item-fullterm">
                                      <Space>
                                        <DollarOutlined className="pricing-icon-fullterm" />
                                        <Text className="pricing-label-fullterm">
                                          Full-term
                                        </Text>
                                        {group.full_term_class_count && (
                                          <Text
                                            type="secondary"
                                            className="pricing-class-count"
                                          >
                                            ({group.full_term_class_count}{" "}
                                            classes)
                                          </Text>
                                        )}
                                      </Space>
                                      <Text
                                        strong
                                        className="pricing-value-fullterm"
                                      >
                                        ${group.price_fullterm}
                                      </Text>
                                    </div>
                                  )}
                                  {group.price_shortterm && (
                                    <div className="pricing-item pricing-item-shortterm">
                                      <Space>
                                        <DollarOutlined className="pricing-icon-shortterm" />
                                        <Text className="pricing-label-shortterm">
                                          Short-term
                                        </Text>
                                        {group.short_term_class_count && (
                                          <Text
                                            type="secondary"
                                            className="pricing-class-count"
                                          >
                                            ({group.short_term_class_count}{" "}
                                            classes)
                                          </Text>
                                        )}
                                      </Space>
                                      <Text
                                        strong
                                        className="pricing-value-shortterm"
                                      >
                                        ${group.price_shortterm}
                                      </Text>
                                    </div>
                                  )}
                                </Space>
                              </div>
                            )}

                            {/* Start Date */}
                            {group.full_term_start_date && (
                              <div className="start-date-box">
                                <Space>
                                  <PlayCircleOutlined className="start-date-icon" />
                                  <Text
                                    type="secondary"
                                    className="start-date-label"
                                  >
                                    Starts:
                                  </Text>
                                  <Text strong className="start-date-value">
                                    {new Date(
                                      group.full_term_start_date,
                                    ).toLocaleDateString("en-SG", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </Text>
                                </Space>
                              </div>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty
                    description="No programs for this outlet"
                    className="empty-outlet-programs"
                  />
                )}

                {outletIndex < getOutletsInfo().length - 1 && (
                  <Divider className="outlet-divider" />
                )}
              </div>
            ))}
          </Space>
        ) : (
          <Empty
            description="No programs configured"
            className="empty-programs"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  );

  // Group students by class date
  const getStudentsGroupedByDate = () => {
    const grouped = {};
    registeredStudents.forEach((student) => {
      const dateKey = student.start_date
        ? new Date(student.start_date).toLocaleDateString("en-SG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "No Date";

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: student.start_date,
          students: [],
        };
      }
      grouped[dateKey].students.push(student);
    });

    // Sort by date
    return Object.entries(grouped)
      .sort(([, a], [, b]) => new Date(a.date) - new Date(b.date))
      .map(([dateKey, data]) => ({
        dateKey,
        ...data,
      }));
  };

  // Simplified columns for grouped view (without Class Date column)
  const groupedStudentColumns = [
    {
      title: "Parent",
      dataIndex: "parent_name",
      key: "parent_name",
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div className="text-medium">{text || "N/A"}</div>
            <Text type="secondary" className="text-small">
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Child",
      dataIndex: "child_name",
      key: "child_name",
      render: (text, record) => (
        <div>
          <div>{text || "N/A"}</div>
          <Text type="secondary" className="text-small">
            Age: {formatChildAge(record)}
          </Text>
        </div>
      ),
    },
    {
      title: "Schedule",
      dataIndex: "schedule_day",
      key: "schedule_day",
      render: (text, record) => {
        let timeDisplay = "";
        if (record.schedule_time) {
          if (Array.isArray(record.schedule_time)) {
            timeDisplay = record.schedule_time.join(" - ");
          } else if (typeof record.schedule_time === "string") {
            try {
              const parsed = JSON.parse(record.schedule_time);
              if (Array.isArray(parsed)) {
                timeDisplay = parsed.join(" - ");
              } else {
                timeDisplay = record.schedule_time;
              }
            } catch {
              timeDisplay = record.schedule_time;
            }
          } else {
            timeDisplay = String(record.schedule_time);
          }
        }
        return (
          <Tag color="blue">
            {text} {timeDisplay}
          </Tag>
        );
      },
    },
    {
      title: "Booked On",
      dataIndex: "booking_date",
      key: "booking_date",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "N/A"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "active" ? "green" : "orange"}>
          {status || "Active"}
        </Tag>
      ),
    },
  ];

  // Students Tab Content
  const StudentsTab = () => {
    const groupedStudents = getStudentsGroupedByDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="students-tab">
        <Card
          className="students-card"
          title={
            <Space>
              <TeamOutlined />
              <span>Registered Students ({registeredStudents.length})</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportToCSV}
              disabled={registeredStudents.length === 0}
            >
              Export to CSV
            </Button>
          }
        >
          {registeredStudents.length > 0 ? (
            <div className="grouped-students">
              {groupedStudents.map((group, index) => {
                const classDate = new Date(group.date);
                classDate.setHours(0, 0, 0, 0);
                const isPast = classDate < today;
                const isToday = classDate.getTime() === today.getTime();

                const headerClass = isPast
                  ? "past"
                  : isToday
                    ? "today"
                    : "upcoming";

                return (
                  <div key={index} className="date-group mb-24">
                    {/* Date Header */}
                    <div className={`date-group-header ${headerClass}`}>
                      <CalendarOutlined
                        className={`date-group-icon ${headerClass}`}
                      />
                      <div className="flex-1">
                        <Text
                          strong
                          className={`date-group-title ${isPast ? "past" : ""}`}
                        >
                          {group.dateKey}
                        </Text>
                        {isToday && (
                          <Tag color="blue" className="ml-8">
                            Today
                          </Tag>
                        )}
                        {isPast && (
                          <Tag color="default" className="ml-8">
                            Past
                          </Tag>
                        )}
                      </div>
                      <Badge
                        count={group.students.length}
                        className={`date-group-badge ${headerClass}`}
                      />
                      <Text type="secondary" className="ml-8">
                        {group.students.length === 1 ? "student" : "students"}
                      </Text>
                    </div>

                    {/* Students Table for this date */}
                    <Table
                      columns={groupedStudentColumns}
                      dataSource={group.students}
                      loading={loadingStudents}
                      rowKey={(record) => record.booking_id || record.id}
                      pagination={false}
                      size="small"
                      className={isPast ? "opacity-70" : ""}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No students registered yet.
                  <br />
                  <Text type="secondary">
                    Students will appear here once they book this class.
                  </Text>
                </span>
              }
            />
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="class-detail-container">
      {modalContextHolder}
      <header className="class-detail-header">
        <div className="class-detail-heading">
          <div className="class-detail-context">
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => navigate("/classes")}
              className="class-detail-back"
              aria-label="Back to classes"
            />
            <span
              className={`class-detail-status ${
                listing?.active ? "is-active" : "is-inactive"
              }`}
            >
              <Badge status={listing?.active ? "success" : "default"} />
              {listing?.active ? "Active" : "Inactive"}
            </span>
          </div>
          <Title level={1} className="class-detail-title">
            {listing?.listing_title || "Class Details"}
          </Title>
          <Text className="class-detail-subtitle">
            Review listing information, schedules, and registered students.
          </Text>
        </div>
        <div className="class-detail-actions">
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
            disabled={registeredStudents.length === 0}
          >
            Export Students
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEditClass}
          >
            Edit Class
          </Button>
          {listing?.active ? (
            <Dropdown
              menu={{
                items: statusMenuItems,
                onClick: ({ key }) => {
                  if (key === "inactive") confirmInactive();
                },
              }}
              trigger={["click"]}
            >
              <Button
                icon={<MoreOutlined />}
                loading={statusUpdating}
                disabled={statusUpdating}
                aria-label="More listing actions"
              />
            </Dropdown>
          ) : (
            <Button
              icon={<CheckCircleOutlined />}
              onClick={updateListingStatus}
              loading={statusUpdating}
              disabled={statusUpdating}
            >
              Activate listing
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="class-detail-tabs"
        items={[
          {
            key: "overview",
            label: (
              <span>
                <EyeOutlined />
                Overview
              </span>
            ),
            children: <OverviewTab />,
          },
          {
            key: "students",
            label: (
              <span>
                <TeamOutlined />
                Students ({registeredStudents.length})
              </span>
            ),
            children: <StudentsTab />,
          },
        ]}
      />
    </div>
  );
};

export default Class;
