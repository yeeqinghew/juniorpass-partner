import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Rate, Tag, Typography } from "antd";
import { MessageOutlined, StarOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../utils/api";
import "./index.css";

const { Text, Title } = Typography;

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [replyReview, setReplyReview] = useState(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_REVIEWS);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load reviews");
      setReviews(data.reviews || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const submitReply = async () => {
    if (!replyReview || !reply.trim()) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.REPLY_TO_REVIEW(replyReview.review_id),
        { method: "PATCH", body: JSON.stringify({ reply }) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save reply");
      toast.success("Reply published");
      setReplyReview(null);
      setReply("");
      await loadReviews();
    } catch (submitError) {
      toast.error(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="partner-reviews-page">
      <header className="partner-reviews-header">
        <div>
          <Text className="partner-reviews-kicker">Customer feedback</Text>
          <Title level={1}>Reviews</Title>
          <Text>Read verified booking reviews and respond publicly.</Text>
        </div>
        <span className="partner-reviews-header-icon"><StarOutlined /></span>
      </header>

      {error ? (
        <Alert type="error" showIcon message="Reviews could not be loaded" />
      ) : null}

      <section className="partner-reviews-panel" aria-busy={loading}>
        {reviews.length > 0 ? (
          <div className="partner-review-list">
            {reviews.map((review) => (
              <article className="partner-review-card" key={review.review_id}>
                <div className="partner-review-card-heading">
                  <div>
                    <strong>{review.listing_title}</strong>
                    <span>
                      {review.reviewer_name} · Verified booking ·{" "}
                      {new Date(review.created_at).toLocaleDateString("en-SG")}
                    </span>
                  </div>
                  <Rate disabled value={review.rating} />
                </div>
                {review.tags?.length > 0 ? (
                  <div className="partner-review-tags">
                    {review.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  </div>
                ) : null}
                <p>{review.comment || "No written comment."}</p>
                {review.status === "hidden" ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Hidden by Junior Pass"
                    description={review.moderation_reason}
                  />
                ) : null}
                {review.partner_reply ? (
                  <div className="partner-review-reply">
                    <strong>Your response</strong>
                    <p>{review.partner_reply}</p>
                  </div>
                ) : null}
                <Button
                  icon={<MessageOutlined />}
                  onClick={() => {
                    setReplyReview(review);
                    setReply(review.partner_reply || "");
                  }}
                >
                  {review.partner_reply ? "Edit response" : "Respond"}
                </Button>
              </article>
            ))}
          </div>
        ) : loading ? (
          <div className="partner-review-loading">Loading reviews…</div>
        ) : (
          <Empty description="No reviews yet" />
        )}
      </section>

      <Modal
        open={Boolean(replyReview)}
        title="Respond to review"
        onCancel={() => {
          if (saving) return;
          setReplyReview(null);
          setReply("");
        }}
        onOk={submitReply}
        okText="Publish response"
        confirmLoading={saving}
        okButtonProps={{ disabled: !reply.trim() }}
        className="partner-review-modal"
      >
        <p>Your response is public. Do not include a child’s personal information.</p>
        <Input.TextArea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={5}
          maxLength={1000}
          showCount
          placeholder="Thank the parent or address their feedback…"
        />
      </Modal>
    </div>
  );
};

export default Reviews;
