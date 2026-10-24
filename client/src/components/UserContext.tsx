import { createContext } from "react";
import type { PartnerProfile } from "../types/partner";

export type UserContextValue = {
  user?: PartnerProfile;
};

const UserContext = createContext<UserContextValue>({ user: undefined });
export default UserContext;
