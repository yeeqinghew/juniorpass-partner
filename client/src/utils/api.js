/**
 * API Configuration for Junior Pass Partner Portal
 * Centralized API management with authentication
 */
import { AUTH_ROLES } from "../constants/auth";


/**
 * Get the API base URL based on environment
 * Priority: staging same-origin proxy > VITE_API_URL > local fallback
 */
const getBaseURL = () => {
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
export const fetchWithAuth = async (endpoint, options = {}) => {
  const baseURL = getBaseURL();

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;

  // Default headers
  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-Auth-Role": AUTH_ROLES.PARTNER,
  };

  // Merge headers
  const config = {
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
    console.error(`Partner API Error [${endpoint}]:`, error.message);
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
  UPDATE_PARTNER: (partnerId) => `/partners/${partnerId}`,

  // Partner Dashboard
  DASHBOARD_OVERVIEW: "/partners/dashboard/overview",
  DASHBOARD_BOOKINGS: "/partners/dashboard/bookings",
  DASHBOARD_REVENUE: "/partners/dashboard/revenue",
  PAYOUTS: "/payouts/partner",
  PAYOUT_STATEMENT: (payoutId, format = "") =>
    `/payouts/${payoutId}/statement${format ? `.${format}` : ""}`,

  // Classes/Listings Management
  GET_ALL_LISTINGS: "/listings/partner",
  GET_PARTNER_LISTINGS: (partnerId) => `/listings/partner/${partnerId}`,
  GET_LISTING: (listingId) => `/listings/${listingId}`,
  CREATE_LISTING: "/listings",
  UPDATE_LISTING: (listingId) => `/listings/${listingId}`,
  UPDATE_LISTING_SCHEDULES: (listingId) => `/listings/${listingId}/schedules`,
  UPDATE_LISTING_STATUS: (listingId) => `/listings/${listingId}/status`,
  DELETE_LISTING: (listingId) => `/listings/${listingId}`,
  TOGGLE_LISTING_STATUS: (listingId) => `/listings/${listingId}/toggle-status`,

  // Schedules
  GET_SCHEDULES: (listingId) => `/schedules/${listingId}`,
  CREATE_SCHEDULE: "/schedules",
  UPDATE_SCHEDULE: (scheduleId) => `/schedules/${scheduleId}`,
  DELETE_SCHEDULE: (scheduleId) => `/schedules/${scheduleId}`,

  // Bookings
  GET_BOOKINGS: "/bookings/partner",
  GET_BOOKINGS_FOR_LISTING: (listingId) => `/bookings/listing/${listingId}`,
  CONFIRM_BOOKING: (bookingId) => `/bookings/${bookingId}/confirm`,
  CANCEL_BOOKING: (bookingId) => `/bookings/${bookingId}/cancel`,

  // Session management
  GET_PARTNER_SESSIONS: "/class-occurrences/partner/sessions",
  CHANGE_PARTNER_SESSION: (action) =>
    `/class-occurrences/partner/sessions/${action}`,

  // Make-up requests
  GET_MAKEUP_REQUESTS: "/makeup-requests/partner",
  RESPOND_MAKEUP_REQUEST: (requestId) =>
    `/makeup-requests/${requestId}/respond`,

  // Reviews
  GET_REVIEWS: "/reviews/partner/all",
  REPLY_TO_REVIEW: (reviewId) => `/reviews/${reviewId}/reply`,

  // Promotions
  GET_PROMOTIONS: "/promotions/partner",
  GET_PROMOTION_OPTIONS: "/promotions/partner/options",
  CREATE_PROMOTION: "/promotions/partner",
  UPDATE_PROMOTION_STATUS: (promotionId) =>
    `/promotions/partner/${promotionId}/status`,

  // Outlets
  GET_OUTLETS: (partnerId) => `/partners/${partnerId}/outlets`,
  CREATE_OUTLET: "/outlets",
  UPDATE_OUTLET: (outletId) => `/outlets/${outletId}`,
  DELETE_OUTLET: (outletId) => `/outlets/${outletId}`,

  // Media Upload
  UPLOAD_PARTNER_LOGO: "/media/upload/partner-logo",
  UPLOAD_PARTNER_DP: "/media/upload/partner-dp",
  UPLOAD_LISTING_IMAGE: "/media/upload/listing-image",
  UPLOAD_OUTLET_IMAGE: "/media/upload/outlet-image",
  DELETE_MEDIA: "/media/delete",

  // Notifications
  GET_NOTIFICATIONS: "/notifications?type=partner",
  GET_UNREAD_COUNT: "/notifications/unread-count?type=partner",
  MARK_NOTIFICATION_READ: (notificationId) => `/notifications/${notificationId}/read`,
  MARK_ALL_NOTIFICATIONS_READ: "/notifications/read-all",

  // Miscellaneous
  GET_ALL_CATEGORIES: "/categories",
  GET_ALL_AGE_GROUPS: "/misc/getAllAgeGroups",
  GET_ALL_PACKAGES: "/misc/getAllPackages",
};

export default getBaseURL;
