import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CreateMealPlanV2 from "./CreateMealPlanV2";
import { useFeatures } from "../contexts/FeaturesContext";

const CreateMealPlanV3: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mealsV3Enabled, featuresLoaded } = useFeatures();

  useEffect(() => {
    if (!featuresLoaded || !mealsV3Enabled) return;
    navigate("/trainer-weekly-meals-v3" + location.search, {
      replace: true,
      state: location.state,
    });
  }, [location.search, location.state, featuresLoaded, mealsV3Enabled, navigate]);

  if (!featuresLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
        {t("common.loading")}
      </div>
    );
  }

  if (mealsV3Enabled) return null;

  return <CreateMealPlanV2 apiVersion="v3" />;
};

export default CreateMealPlanV3;
