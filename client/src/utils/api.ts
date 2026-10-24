/**
 * API Configuration for Junior Pass Partner Portal
 * Centralized API management with authentication
 */
import { AUTH_ROLES } from "../constants/auth";


/**
 * Get the API base URL based on environment
 * Priority: staging same-origin proxy > VITE_API_URL > local fallback
 */
type EndpointId = string | number;

const getBaseURL = (): string => {
  // Use a same-origin API only on the staging partner hostname. The Vercel
  // routing rule for that host proxies these calls to the Railway backend.
  if (window.location.hostname === "staging.partner.juniorpass.sg") {
    return window.location.origin;
  }

  // 1. Use explicit API URL if provided (for production/staging)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Development mode - use localhost with configurable port
  const port = import.meta.env.VITE_API_PORT || "5000";
  const hostname = window.location.hostname;

  // Use https in production, http in development
  const protocol = hostname === 'localhost' || hostname === '127.0.0.1' ? 'http' : 'https';

  return `${protocol}://${hostname}:${port}`;
};

/**
 * Authenticated fetch wrapper for the Partner portal.
 * The browser sends the role-scoped HttpOnly session cookie automatically.
 *
 * @param {string} endpoint - API endpoint (e.g., "/partners/login")
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const baseURL = getBaseURL();

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;

  // Default headers
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "X-Auth-Role": AUTH_ROLES.PARTNER,
  };

  // Merge headers
  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized - session cookie is missing or expired
    if (response.status === 401) {
      console.warn("Partner session is missing or expired");
    }

    return response;
  } catch (error) {
    console.error(
      `Partner API Error [${endpoint}]:`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};

/**
 * API Endpoints for Partner Portal
 * All endpoints (except login) require partner authentication
 */
export const API_ENDPOINTS = {
  // Partner Auth
  LOGIN: "/partners/login",
  VERIFY_AUTH: "/partners/is-verify",
  LOGOUT: "/partners/logout",
  CHANGE_PASSWORD: "/partners/change-password",
  COMPLETE_PROFILE: "/partners/complete-profile",
  RESET_PASSWORD: "/partners/reset-password",

  // Partner Profile
  GET_PARTNER: "/partners/",
  UPDATE_PARTNER: (partnerId: EndpointId) => `/partners/${partnerId}`,

  // Partner Dashboard
  DASHBOARD_OVERVIEW: "/partners/dashboard/overview",
  DASHBOARD_BOOKINGS: "/partners/dashboard/bookings",
  DASHBOARD_REVENUE: "/partners/dashboard/revenue",
  PAYOUTS: "/payouts/partner",
  PAYOUT_STATEMENT: (payoutId: EndpointId, format = "") =>
    `/payouts/${payoutId}/statement${format ? `.${format}` : ""}`,

  // Classes/Listings Management
  GET_ALL_LISTINGS: "/listings/partner",
  GET_PARTNER_LISTINGS: (partnerId: EndpointId) => `/listings/partner/${partnerId}`,
  GET_LISTING: (listingId: EndpointId) => `/listings/${listingId}`,
  CREATE_LISTING: "/listings",
  UPDATE_LISTING: (listingId: EndpointId) => `/listings/${listingId}`,
  UPDATE_LISTING_SCHEDULES: (listingId: EndpointId) => `/listings/${listingId}/schedules`,
  UPDATE_LISTING_STATUS: (listingId: EndpointId) => `/listings/${listingId}/status`,
  DELETE_LISTING: (listingId: EndpointId) => `/listings/${listingId}`,
  TOGGLE_LISTING_STATUS: (listingId: EndpointId) => `/listings/${listingId}/toggle-status`,

  // Schedules
  GET_SCHEDULES: (listingId: EndpointId) => `/schedules/${listingId}`,
  CREATE_SCHEDULE: "/schedules",
  UPDATE_SCHEDULE: (scheduleId: EndpointId) => `/schedules/${scheduleId}`,
  DELETE_SCHEDULE: (scheduleId: EndpointId) => `/schedules/${scheduleId}`,

  // Bookings
  GET_BOOKINGS: "/bookings/partner",
  GET_BOOKINGS_FOR_LISTING: (listingId: EndpointId) => `/bookings/listing/${listingId}`,
  CONFIRM_BOOKING: (bookingId: EndpointId) => `/bookings/${bookingId}/confirm`,
  CANCEL_BOOKING: (bookingId: EndpointId) => `/bookings/${bookingId}/cancel`,

  // Session management
  GET_PARTNER_SESSIONS: "/class-occurrences/partner/sessions",
  CHANGE_PARTNER_SESSION: (action: string) =>
    `/class-occurrences/partner/sessions/${action}`,

  // Make-up requests
  GET_MAKEUP_REQUESTS: "/makeup-requests/partner",
  RESPOND_MAKEUP_REQUEST: (requestId: EndpointId) =>
    `/makeup-requests/${requestId}/respond`,

  // Reviews
  GET_REVIEWS: "/reviews/partner/all",
  REPLY_TO_REVIEW: (reviewId: EndpointId) => `/reviews/${reviewId}/reply`,

  // Promotions
  GET_PROMOTIONS: "/promotions/partner",
  GET_PROMOTION_OPTIONS: "/promotions/partner/options",
  CREATE_PROMOTION: "/promotions/partner",
  UPDATE_PROMOTION_STATUS: (promotionId: EndpointId) =>
    `/promotions/partner/${promotionId}/status`,

  // Outlets
  GET_OUTLETS: (partnerId: EndpointId) => `/partners/${partnerId}/outlets`,
  CREATE_OUTLET: "/outlets",
  UPDATE_OUTLET: (outletId: EndpointId) => `/outlets/${outletId}`,
  DELETE_OUTLET: (outletId: EndpointId) => `/outlets/${outletId}`,

  // Media Upload
  UPLOAD_PARTNER_LOGO: "/media/upload/partner-logo",
  UPLOAD_PARTNER_DP: "/media/upload/partner-dp",
  UPLOAD_LISTING_IMAGE: "/media/upload/listing-image",
  UPLOAD_OUTLET_IMAGE: "/media/upload/outlet-image",
  DELETE_MEDIA: "/media/delete",

  // Notifications
  GET_NOTIFICATIONS: "/notifications?type=partner",
  GET_UNREAD_COUNT: "/notifications/unread-count?type=partner",
  MARK_NOTIFICATION_READ: (notificationId: EndpointId) => `/notifications/${notificationId}/read`,
  MARK_ALL_NOTIFICATIONS_READ: "/notifications/read-all",

  // Miscellaneous
  GET_ALL_CATEGORIES: "/categories",
  GET_ALL_AGE_GROUPS: "/misc/getAllAgeGroups",
  GET_ALL_PACKAGES: "/misc/getAllPackages",
};

export default getBaseURL;
