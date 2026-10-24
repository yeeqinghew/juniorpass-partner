import { Typography } from "antd";
import ClassCard from "./ClassCard";
import LoadingContainer from "../../utils/LoadingContainer";
import type { Dispatch, SetStateAction } from "react";
import type { Listing } from "../../types/listing";

const { Text, Title } = Typography;

const AllClasses = ({ listing, setListing, loading }: {
  listing?: Listing[];
  setListing: Dispatch<SetStateAction<Listing[]>>;
  loading?: boolean;
}) => {
  if (loading) {
    return <LoadingContainer />;
  }

  if (!listing || listing.length === 0) {
    return (
      <div className="empty-classes">
        <div className="empty-classes-icon">📚</div>
        <Title level={3} className="empty-classes-title">
          No classes yet
        </Title>
        <Text className="empty-classes-text">
          Start by creating your first class to attract students and grow your
          business
        </Text>
      </div>
    );
  }

  return (
    <div className="classes-grid">
      {listing.map((list) => (
        <ClassCard
          key={list.listing_id}
          listing={list}
          setListing={setListing}
        />
      ))}
    </div>
  );
};

export default AllClasses;
