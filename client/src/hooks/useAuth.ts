import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth, API_ENDPOINTS } from "../utils/api";
import type { PartnerProfile } from "../types/partner";

const useAuth = () => {
  const [user, setUser] = useState<PartnerProfile>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const setAuth = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);

    if (!authenticated) {
      setUser(undefined);
    }
  }, []);

  const getPartnerInfo = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_PARTNER);
      const parseRes = (await response.json()) as PartnerProfile & {
        error?: string;
      };
      if (!response.ok) throw new Error(parseRes.error || "Unable to load partner");
      setUser(parseRes);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }, []);

  const isAuth = useCallback(async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.VERIFY_AUTH);

      const parseRes = (await response.json()) as {
        authenticated?: boolean;
        error?: string;
      };
      if (response.ok && parseRes.authenticated) {
        setAuth(true);
        await getPartnerInfo();
        setLoading(false);
      } else {
        if (isAuthenticated) {
          toast.error(parseRes.error || "Your session has expired");
        }
        setAuth(false);
        setLoading(false);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      setAuth(false);
      setLoading(false);
    }
  }, [getPartnerInfo, isAuthenticated, setAuth]);

  useEffect(() => {
    isAuth();
  }, [isAuth]);

  return {
    isAuthenticated,
    loading,
    setLoading,
    user,
    setAuth,
  };
};

export default useAuth;
