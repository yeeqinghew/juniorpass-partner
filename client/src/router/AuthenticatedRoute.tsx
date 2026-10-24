import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "../utils/Spinner";
import toast from "react-hot-toast";
import type { PartnerProfile } from "../types/partner";

type AuthenticatedRouteProps = {
  isAuthenticated: boolean;
  loading: boolean;
  user?: PartnerProfile;
};

const AuthenticatedRoute = ({
  isAuthenticated,
  loading,
  user,
}: AuthenticatedRouteProps) => {
  const location = useLocation();

  // Show loading spinner while authentication status is being determined
  if (loading) {
    return <Spinner />;
  }

  // Check if the user is not authenticated or is logging out
  if (!isAuthenticated) {
    toast.error("You have not logged in");
    return <Navigate to="/login" />;
  }

  // Force password change if required (block all routes except change-password)
  if (user?.requires_password_change && location.pathname !== "/change-password") {
    toast.error("Please change your password before continuing");
    return <Navigate to="/change-password" replace />;
  }

  // Render the child routes if the user is authenticated
  return <Outlet />;
};

export default AuthenticatedRoute;
