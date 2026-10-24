import { Empty } from "antd";
import ClassCard from "./ClassCard";
import type { Dispatch, SetStateAction } from "react";
import type { Listing } from "../../types/listing";

type ClassListProps = {
  listing?: Listing[];
  setListing: Dispatch<SetStateAction<Listing[]>>;
  viewMode?: "grid" | "list";
};

const ActiveClasses = ({ listing, setListing, viewMode = "grid" }: ClassListProps) => {
  if (!listing || listing.length === 0) {
    return (
      <div className="classes-empty">
        <Empty
          description="No active classes found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className={viewMode === "grid" ? "classes-grid" : "classes-list"}>
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

export default ActiveClasses;
