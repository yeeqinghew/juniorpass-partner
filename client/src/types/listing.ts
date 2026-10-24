export type Listing = {
  listing_id: string | number;
  listing_title?: string;
  package_types?: string;
  age_groups?: string;
  credit?: number;
  description?: string;
  schedule_info?: ListingSchedule[];
  [key: string]: unknown;
};

export type ListingSchedule = {
  outlet_id: string | number;
  outlet_address?: string;
  nearest_mrt?: string;
  day?: string;
  timeslot?: string[];
  frequency?: string;
  slots?: number;
  credit?: number;
};
