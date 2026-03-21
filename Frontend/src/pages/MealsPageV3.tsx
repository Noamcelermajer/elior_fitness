import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { MealMenuV3 } from "./SandboxMealsV3";
import { useAuth } from "../contexts/AuthContext";

const MealsPageV3 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (user.role === "TRAINER") {
        navigate("/trainer-dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  if (!user || user.role !== "CLIENT") {
    return null;
  }

  return (
    <Layout currentPage="meals">
      <MealMenuV3 mode="real" embedded />
    </Layout>
  );
};

export default MealsPageV3;
