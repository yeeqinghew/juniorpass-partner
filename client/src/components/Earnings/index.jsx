import { useCallback, useEffect, useState } from "react";
import { Alert, Empty, Skeleton, Table, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { Text, Title } = Typography;

const money = (value) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(Number(value || 0));

const date = (value) => (value ? dayjs(value).format("D MMM YYYY") : "—");

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: {}, payouts: [], earnings: [] });

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.PAYOUTS);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load earnings");
      setData(payload);
    } catch (requestError) {
      setError(requestError.message || "Unable to load earnings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const summaryCards = [
    {
      label: "Pending delivery",
      amount: data.summary?.pending_amount,
      credits: data.summary?.pending_credits,
      icon: <ClockCircleOutlined />,
      tone: "pending",
    },
    {
      label: "Available for payout",
      amount: data.summary?.available_amount,
      credits: data.summary?.available_credits,
      icon: <WalletOutlined />,
      tone: "available",
    },
    {
      label: "Processing",
      amount: data.summary?.processing_amount,
      credits: data.summary?.processing_credits,
      icon: <CalendarOutlined />,
      tone: "processing",
    },
    {
      label: "Paid all time",
      amount: data.summary?.paid_amount,
      credits: data.summary?.paid_credits,
      icon: <CheckCircleOutlined />,
      tone: "paid",
    },
  ];

  const payoutColumns = [
    {
      title: "Period",
      key: "period",
      render: (_, payout) => (
        <span>{date(payout.period_start)} – {date(dayjs(payout.period_end).subtract(1, "day"))}</span>
      ),
    },
    { title: "Credits", dataIndex: "total_credits", key: "credits" },
    { title: "Payout", dataIndex: "net_amount", key: "amount", render: money },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag className={`earnings-status is-${status.toLowerCase()}`}>{titleCase(status)}</Tag>
      ),
    },
    {
      title: "Transfer reference",
      dataIndex: "transfer_reference",
      key: "reference",
      render: (value) => value || "—",
    },
  ];

  const earningColumns = [
    {
      title: "Class",
      dataIndex: "listing_title",
      key: "class",
      render: (value, earning) => (
        <div className="earning-class-cell">
          <Text strong>{value || (earning.source === "OPENING_BALANCE" ? "Opening balance" : "—")}</Text>
          {earning.scheduled_date && <Text type="secondary">{date(earning.scheduled_date)}</Text>}
        </div>
      ),
    },
    { title: "Credits", dataIndex: "credits", key: "credits" },
    { title: "Value", dataIndex: "gross_amount", key: "amount", render: money },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag className={`earning-status is-${status.toLowerCase()}`}>{titleCase(status)}</Tag>
      ),
    },
  ];

  return (
    <div className="earnings-page">
      <section className="earnings-header">
        <div>
          <Text className="earnings-kicker">Finance</Text>
          <Title level={1}>Earnings & payouts</Title>
          <Text className="earnings-subtitle">
            Track delivered class earnings and your monthly JuniorPASS transfers.
          </Text>
        </div>
        <div className="earnings-header-icon" aria-hidden="true">
          <DollarOutlined />
        </div>
      </section>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Earnings could not be loaded"
          description={error}
          action={<button type="button" onClick={loadEarnings}>Try again</button>}
          className="earnings-alert"
        />
      )}

      {loading ? (
        <div className="earnings-loading"><Skeleton active /></div>
      ) : (
        <>
          <div className="earnings-summary">
            {summaryCards.map((card) => (
              <article className={`earnings-summary-card is-${card.tone}`} key={card.label}>
                <span className="earnings-summary-icon">{card.icon}</span>
                <span>{card.label}</span>
                <strong>{money(card.amount)}</strong>
                <small>{card.credits || 0} credits</small>
              </article>
            ))}
          </div>

          <Alert
            type="info"
            showIcon
            message={`Next settlement cycle: ${date(data.next_settlement_date)}`}
            description="Completed classes become available for the next monthly settlement. JuniorPASS records the transfer after it is sent."
            className="earnings-cycle-alert"
          />

          <section className="earnings-panel">
            <div className="earnings-panel-heading">
              <div>
                <Text className="earnings-kicker">Statements</Text>
                <Title level={3}>Payout history</Title>
              </div>
            </div>
            <Table
              rowKey="payout_id"
              columns={payoutColumns}
              dataSource={data.payouts || []}
              pagination={false}
              locale={{ emptyText: <Empty description="No payout statements yet" /> }}
            />
          </section>

          <section className="earnings-panel">
            <div className="earnings-panel-heading">
              <div>
                <Text className="earnings-kicker">Ledger</Text>
                <Title level={3}>Recent earnings</Title>
              </div>
            </div>
            <Table
              rowKey="earning_id"
              columns={earningColumns}
              dataSource={data.earnings || []}
              pagination={{ pageSize: 12, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="No earnings recorded yet" /> }}
            />
          </section>
        </>
      )}
    </div>
  );
};

export default Earnings;
