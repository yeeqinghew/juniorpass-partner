import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PartnerLogin from "../components/Login";
import PartnerClasses from "../components/Classes";
import PartnerHomeLayout from "../layouts/PartnerHomeLayout";
import PartnerLandingLayout from "../layouts/PartnerLandingLayout";
import PartnerHome from "../components/Home";
import UserContext from "../components/UserContext";
import AuthenticatedRoute from "./AuthenticatedRoute";
import NotFound from "../utils/404";
import ResetPassword from "../components/ResetPassword";
import CreateClass from "../components/Classes/CreateClass";
import useAuth from "../hooks/useAuth";
import Class from "../components/Classes/Class";
import EditClass from "../components/Classes/EditClass";
import Profile from "../components/Profile";
import OutletsManagement from "../components/Outlets/OutletsManagement";
import ForcePasswordChange from "../components/ForcePasswordChange";
import Earnings from "../components/Earnings";
import MakeupRequests from "../components/MakeupRequests";
import Reviews from "../components/Reviews";
import Promotions from "../components/Promotions";
import { DataProvider } from "../hooks/DataContext";

const Routers = () => {
  const { isAuthenticated, loading, setLoading, user, setAuth } = useAuth();

  return (
    <UserContext.Provider value={{ user }}>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/*" element={<PartnerLandingLayout />}>
          <Route
            path="login"
            element={
              !isAuthenticated ? (
                <PartnerLogin setAuth={setAuth} />
              ) : (
                <Navigate replace to="/home" />
              )
            }
          />
          <Route path="reset-password" element={<ResetPassword />} />
          {/* Password Change - Requires authentication but accessible before profile completion */}
          <Route
            path="change-password"
            element={
              isAuthenticated ? (
                <ForcePasswordChange setAuth={setAuth} />
              ) : (
                <Navigate replace to="/login" />
              )
            }
          />
          <Route
            element={
              <AuthenticatedRoute
                isAuthenticated={isAuthenticated}
                loading={loading}
                user={user}
              />
            }
          >
            <Route
              element={
                <DataProvider>
                  <PartnerHomeLayout
                    setAuth={setAuth}
                    setLoading={setLoading}
                  />
                </DataProvider>
              }
            >
              <Route path="home" element={<PartnerHome />} />
              <Route path="profile" element={<Profile />} />
              <Route
                path="classes"
                element={<PartnerClasses setAuth={setAuth} />}
              />
              <Route path="outlets" element={<OutletsManagement />} />
              <Route path="earnings" element={<Earnings />} />
              <Route path="make-up-requests" element={<MakeupRequests />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="class/:listing_id" element={<Class />} />
              <Route path="class/:listing_id/edit" element={<EditClass />} />
              <Route path="create-class" element={<CreateClass />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </UserContext.Provider>
  );
};

export default Routers;
