import { createContext, useEffect, useState, type ReactNode } from "react";
import { fetchWithAuth, API_ENDPOINTS } from "../utils/api";

export type ReferenceOption = {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
};

type DataContextValue = {
  categories: ReferenceOption[];
  categoriesError: string;
  packageTypes: ReferenceOption[];
  ageGroups: ReferenceOption[];
  loading: boolean;
};

const DataContext = createContext<DataContextValue>({
  categories: [], categoriesError: "", packageTypes: [], ageGroups: [], loading: false,
});

const DataProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<ReferenceOption[]>([]);
  const [packageTypes, setPackageTypes] = useState<ReferenceOption[]>([]);
  const [ageGroups, setAgeGroups] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");


  const getCategories = async () => {
    try {
      setCategoriesError("");
      const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_CATEGORIES);
      const data = (await response.json()) as ReferenceOption[] | { error?: string };
      if (!response.ok) {
        throw new Error(!Array.isArray(data) ? data.error || "Unable to load categories" : "Unable to load categories");
      }
      if (!Array.isArray(data)) {
        throw new Error("Invalid category response");
      }
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setCategories([]);
      setCategoriesError(
        "Categories could not be loaded. Refresh the page or contact support.",
      );
    }
  };

  const getPackageTypes = async () => {
    const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_PACKAGES);
    const data = (await response.json()) as ReferenceOption[];
    setPackageTypes(Array.isArray(data) ? data : []);
  };

  const getAgeGroups = async () => {
    const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_AGE_GROUPS);
    const data = (await response.json()) as ReferenceOption[];
    setAgeGroups(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getCategories(), getPackageTypes(), getAgeGroups()]).finally(
      () => setLoading(false)
    );
  }, []);

  return (
    <DataContext.Provider
      value={{
        categories,
        categoriesError,
        packageTypes,
        ageGroups,
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataContext, DataProvider };
