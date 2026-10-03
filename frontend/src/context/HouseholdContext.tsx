import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { householdsApi } from "../api/households.api";
import type { Household } from "../api/types";
import { useAuth } from "./AuthContext";

const ACTIVE_HOUSEHOLD_KEY = "diario_active_household_id";

type HouseholdContextValue = {
  households: Household[];
  activeHousehold: Household | null;
  activeHouseholdId: string | null;
  isLoading: boolean;
  refreshHouseholds: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  deleteHousehold: (householdId: string) => Promise<void>;
  setActiveHouseholdId: (householdId: string) => void;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

type HouseholdProviderProps = {
  children: ReactNode;
};

/**
 * Verwaltet die aktuell ausgewählte Wohnung.
 */
export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<
    string | null
  >(() => localStorage.getItem(ACTIVE_HOUSEHOLD_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const setActiveHouseholdId = useCallback((householdId: string) => {
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
    setActiveHouseholdIdState(householdId);
  }, []);

  const refreshHouseholds = useCallback(async () => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setHouseholds([]);
      setActiveHouseholdIdState(null);
      localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const loadedHouseholds = await householdsApi.list();
      setHouseholds(loadedHouseholds);

      const storedHouseholdId = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
      const storedHouseholdExists = loadedHouseholds.some(
        (household) => household.id === storedHouseholdId,
      );

      if (storedHouseholdId && storedHouseholdExists) {
        setActiveHouseholdIdState(storedHouseholdId);
        return;
      }

      const firstHousehold = loadedHouseholds[0];

      if (firstHousehold) {
        localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, firstHousehold.id);
        setActiveHouseholdIdState(firstHousehold.id);
      } else {
        localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
        setActiveHouseholdIdState(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    void refreshHouseholds();
  }, [refreshHouseholds]);

  const createHousehold = useCallback(
    async (name: string) => {
      const household = await householdsApi.create(name);
      await refreshHouseholds();
      setActiveHouseholdId(household.id);
    },
    [refreshHouseholds, setActiveHouseholdId],
  );

  const joinHousehold = useCallback(
    async (inviteCode: string) => {
      const household = await householdsApi.join(inviteCode);
      await refreshHouseholds();
      setActiveHouseholdId(household.id);
    },
    [refreshHouseholds, setActiveHouseholdId],
  );

  const deleteHousehold = useCallback(
    async (householdId: string) => {
      await householdsApi.delete(householdId);

      if (activeHouseholdId === householdId) {
        localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
        setActiveHouseholdIdState(null);
      }

      await refreshHouseholds();
    },
    [activeHouseholdId, refreshHouseholds],
  );

  const activeHousehold = useMemo(
    () =>
      households.find((household) => household.id === activeHouseholdId) ??
      null,
    [activeHouseholdId, households],
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      households,
      activeHousehold,
      activeHouseholdId,
      isLoading,
      refreshHouseholds,
      createHousehold,
      joinHousehold,
      deleteHousehold,
      setActiveHouseholdId,
    }),
    [
      activeHousehold,
      activeHouseholdId,
      createHousehold,
      deleteHousehold,
      households,
      isLoading,
      joinHousehold,
      refreshHouseholds,
      setActiveHouseholdId,
    ],
  );

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

/**
 * Liefert die aktuell ausgewählte Wohnung und zugehörige Aktionen.
 */
export function useHousehold(): HouseholdContextValue {
  const context = useContext(HouseholdContext);

  if (!context) {
    throw new Error(
      "useHousehold muss innerhalb von HouseholdProvider verwendet werden.",
    );
  }

  return context;
}
