import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

export type FeaturesContextValue = {
  mealsV3Enabled: boolean;
  featuresLoaded: boolean;
};

const FeaturesContext = createContext<FeaturesContextValue | undefined>(undefined);

export const FeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mealsV3Enabled, setMealsV3Enabled] = useState(false);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const readFeatures = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/system/features`);
        if (!res.ok) {
          if (!cancelled) {
            setMealsV3Enabled(false);
            setFeaturesLoaded(true);
          }
          return;
        }
        const data = (await res.json()) as { meals_v3_enabled?: boolean };
        if (!cancelled) {
          setMealsV3Enabled(Boolean(data.meals_v3_enabled));
          setFeaturesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setMealsV3Enabled(false);
          setFeaturesLoaded(true);
        }
      }
    };

    readFeatures();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FeaturesContext.Provider value={{ mealsV3Enabled, featuresLoaded }}>
      {children}
    </FeaturesContext.Provider>
  );
};

export const useFeatures = (): FeaturesContextValue => {
  const ctx = useContext(FeaturesContext);
  if (!ctx) {
    throw new Error("useFeatures must be used within FeaturesProvider");
  }
  return ctx;
};
