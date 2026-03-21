import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Layout from "../components/Layout";
import { API_BASE_URL } from "../config/api";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MacroType, V3DayViewResponse, V3FoodOption, V3MealCompletionStatusResponse, V3MealLogCreateRequest, V3MealSlotView } from "../types/meals-v3";

const parseGrams = (value: string): number => {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : 0;
};

const normalizeQuantityInstruction = (value?: string | null): string => {
  if (!value) return "100g";
  const trimmed = value.trim();
  if (!trimmed) return "100g";
  return trimmed;
};

const clampToPercent = (percent: number): number => {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, percent));
};

const macroLabel = (t: ReturnType<typeof useTranslation>["t"], macroType: MacroType): string => {
  switch (macroType) {
    case "protein":
      return t("meals.protein", "Protein");
    case "carb":
      return t("meals.carbs", "Carbs");
    case "fat":
      return t("meals.fats", "Fats");
    default:
      return macroType;
  }
};

export type MealMenuV3Mode = "mock" | "real";

export type MealMenuV3Props = {
  mode?: MealMenuV3Mode;
  /** When true, render only the meal UI (parent supplies `Layout`). */
  embedded?: boolean;
};

export const MealMenuV3: React.FC<MealMenuV3Props> = ({ mode = "real", embedded = false }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const v3MealsBase = mode === "mock" ? `${API_BASE_URL}/v3/meals-mock` : `${API_BASE_URL}/v3/meals`;

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dayView, setDayView] = useState<V3DayViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logInProgressKey, setLogInProgressKey] = useState<string | null>(null);

  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customDialogSlot, setCustomDialogSlot] = useState<V3MealSlotView | null>(null);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customCalories, setCustomCalories] = useState("0");
  const [customProtein, setCustomProtein] = useState("0");
  const [customCarbs, setCustomCarbs] = useState("0");
  const [customFat, setCustomFat] = useState("0");
  const [customGramsInput, setCustomGramsInput] = useState("100");
  const [customSaving, setCustomSaving] = useState(false);

  const [askTrainerOpen, setAskTrainerOpen] = useState(false);
  const [askTrainerSlot, setAskTrainerSlot] = useState<V3MealSlotView | null>(null);
  const [askTrainerMacroType, setAskTrainerMacroType] = useState<MacroType>("protein");
  const [askTrainerMessage, setAskTrainerMessage] = useState("");
  const [askTrainerSaving, setAskTrainerSaving] = useState(false);

  const [completedMealSlotIds, setCompletedMealSlotIds] = useState<Record<number, boolean>>({});
  const [deselectedMealCategoryKeys, setDeselectedMealCategoryKeys] = useState<Record<string, boolean>>({});
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const swipeDeletingRef = React.useRef(false);

  const [swapOpen, setSwapOpen] = useState(false);
  const [swapSlot, setSwapSlot] = useState<V3MealSlotView | null>(null);
  const [swapMacroType, setSwapMacroType] = useState<MacroType>("protein");
  const [swapQuery, setSwapQuery] = useState("");
  const [swapSaving, setSwapSaving] = useState(false);
  const [swapSelectedFoodId, setSwapSelectedFoodId] = useState<number | null>(null);
  const [swapCatalogFoods, setSwapCatalogFoods] = useState<V3FoodOption[]>([]);
  const [swapCatalogLoading, setSwapCatalogLoading] = useState(false);
  const swapSearchInputRef = useRef<HTMLInputElement | null>(null);

  const isRtlHe = (i18n.language || "").toLowerCase().startsWith("he");

  const getLocalizedFoodName = useCallback(
    (food: V3FoodOption): string => {
      if (isRtlHe) return food.name_hebrew || food.name;
      return food.name;
    },
    [isRtlHe]
  );

  const computeRecommendedDisplayMacros = useCallback(
    (food: V3FoodOption, quantityInstruction?: string | null) => {
      const quantity = normalizeQuantityInstruction(quantityInstruction);
      const grams = parseGrams(quantity);

      const measurementType = food.measurement_type;
      const scale = measurementType === "per_portion" ? grams : grams / 100;

      return {
        calories: (food.calories ?? 0) * scale,
        protein: (food.protein ?? 0) * scale,
        carbs: (food.carbs ?? 0) * scale,
        fat: (food.fat ?? 0) * scale,
      };
    },
    []
  );

  const fetchDayView = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "real" && !accessToken) {
        throw new Error("Missing access token");
      }

      const res = await fetch(`${v3MealsBase}/day?date=${selectedDate}`, {
        method: "GET",
        headers: mode === "real" && accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as V3DayViewResponse;
      setDayView(data);

      if (mode === "real") {
        const compRes = await fetch(`${API_BASE_URL}/v3/meals/completions?date=${selectedDate}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (compRes.ok) {
          const rows = (await compRes.json()) as V3MealCompletionStatusResponse[];
          setCompletedMealSlotIds(
            rows.reduce<Record<number, boolean>>((acc, row) => {
              acc[row.meal_slot_id] = row.is_completed;
              return acc;
            }, {})
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load day");
    } finally {
      setLoading(false);
    }
  }, [accessToken, mode, selectedDate, v3MealsBase]);

  useEffect(() => {
    fetchDayView();
  }, [fetchDayView]);

  useEffect(() => {
    if (!swapOpen) {
      setSwapCatalogFoods([]);
      setSwapCatalogLoading(false);
      return;
    }

    let cancelled = false;

    const loadCatalog = async () => {
      setSwapCatalogLoading(true);
      try {
        if (mode === "real" && !accessToken) {
          setSwapCatalogFoods([]);
          return;
        }
        const url = `${v3MealsBase}/catalog?macro_type=${swapMacroType}&include_public=true`;
        const res = await fetch(url, {
          headers: mode === "real" && accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        if (!res.ok) {
          if (!cancelled) setSwapCatalogFoods([]);
          return;
        }
        const data = (await res.json()) as V3FoodOption[];
        if (!cancelled) setSwapCatalogFoods(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSwapCatalogFoods([]);
      } finally {
        if (!cancelled) setSwapCatalogLoading(false);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [accessToken, mode, swapMacroType, swapOpen, v3MealsBase]);

  useEffect(() => {
    if (swapOpen) {
      window.setTimeout(() => swapSearchInputRef.current?.focus(), 50);
    }
  }, [swapOpen]);

  // Reset per-day sandbox state when the date changes.
  useEffect(() => {
    setCompletedMealSlotIds({});
    setDeselectedMealCategoryKeys({});
  }, [selectedDate]);

  const logPlanFood = useCallback(
    async (slot: V3MealSlotView, macroType: MacroType, foodOptionId: number, quantityInstruction?: string | null) => {
      const key = `${slot.meal_slot_id}:${macroType}`;
      setLogInProgressKey(key);
      try {
        const payload: V3MealLogCreateRequest = {
          date: selectedDate,
          meal_slot_id: slot.meal_slot_id,
          macro_type: macroType,
          food_option_id: foodOptionId,
          quantity: normalizeQuantityInstruction(quantityInstruction),
        };

        const res = await fetch(`${v3MealsBase}/logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(mode === "real" && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.detail || `HTTP ${res.status}`);
        }

        await fetchDayView();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save log");
      } finally {
        setLogInProgressKey(null);
      }
    },
    [accessToken, fetchDayView, mode, selectedDate, v3MealsBase]
  );

  const deleteMealLog = useCallback(
    async (mealSlotId: number, macroType: MacroType) => {
      try {
        if (mode === "mock") {
          const payload: V3MealLogCreateRequest = {
            date: selectedDate,
            meal_slot_id: mealSlotId,
            macro_type: macroType,
            food_option_id: null,
            quantity: null,
          };

          const res = await fetch(`${v3MealsBase}/logs`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const detail = await res.json().catch(() => null);
            throw new Error(detail?.detail || `HTTP ${res.status}`);
          }

          await fetchDayView();
          return;
        }

        if (!dayView || !accessToken) return;

        // Real backend: delete by choice_id path.
        // Custom food is stored as a choice with `food_option_id == null`.
        const customChoice = dayView.choices.find(
          (c) =>
            c.meal_slot_id === mealSlotId &&
            c.food_option_id == null &&
            Boolean((c.custom_food_name ?? "").trim())
        );

        if (customChoice) {
          const res = await fetch(`${API_BASE_URL}/v3/meals/logs/${customChoice.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            const detail = await res.json().catch(() => null);
            throw new Error(detail?.detail || `HTTP ${res.status}`);
          }

          await fetchDayView();
          return;
        }

        const slot = dayView.slots.find((s) => s.meal_slot_id === mealSlotId) ?? null;
        const category = slot?.categories.find((c) => c.macro_type === macroType) ?? null;
        const chosenFoodId = typeof category?.chosen_food?.food_option_id === "number" ? category?.chosen_food?.food_option_id : null;
        if (!chosenFoodId) return;

        const chosenChoice = dayView.choices.find(
          (c) => c.meal_slot_id === mealSlotId && c.food_option_id === chosenFoodId
        );
        if (!chosenChoice) return;

        const res = await fetch(`${API_BASE_URL}/v3/meals/logs/${chosenChoice.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.detail || `HTTP ${res.status}`);
        }

        await fetchDayView();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete log");
      }
    },
    [accessToken, dayView, fetchDayView, mode, selectedDate]
  );

  const applyMealCompletion = useCallback(
    async (slot: V3MealSlotView) => {
      const mealSlotHasCustomOverall =
        mode === "mock"
          ? slot.categories.some((c) => {
              const ch = c.chosen_food;
              if (!ch) return false;
              return ch.food_option_id == null && Boolean((ch.custom_food_name ?? "").trim());
            })
          : Boolean(
              dayView?.choices.some(
                (c) =>
                  c.meal_slot_id === slot.meal_slot_id &&
                  c.food_option_id == null &&
                  Boolean((c.custom_food_name ?? "").trim())
              )
            );

      // If the trainee logged a "custom food overall", the mock already stores it under one macro
      // but computes all macro totals, so we should not add defaults on top.
      if (mealSlotHasCustomOverall) {
        if (mode === "real") {
          if (!accessToken) return;
          const completionRes = await fetch(`${API_BASE_URL}/v3/meals/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              meal_slot_id: slot.meal_slot_id,
              date: selectedDate,
              is_completed: true,
              completion_method: "manual",
            }),
          });

          if (!completionRes.ok) {
            const detail = await completionRes.json().catch(() => null);
            throw new Error(detail?.detail || `HTTP ${completionRes.status}`);
          }
        }

        await fetchDayView();
        return;
      }

      const logsToCreate: Array<Pick<V3MealLogCreateRequest, "macro_type" | "food_option_id" | "quantity">> = [];

      for (const cat of slot.categories) {
        const deselectionKey = `${selectedDate}:${slot.meal_slot_id}:${cat.macro_type}`;
        if (deselectedMealCategoryKeys[deselectionKey]) continue;
        if (cat.chosen_food) continue; // already logged (via swap / earlier completion)

        const defaultFood = cat.recommended_foods[0];
        if (!defaultFood || typeof defaultFood.id !== "number") continue;

        logsToCreate.push({
          macro_type: cat.macro_type,
          food_option_id: defaultFood.id,
          quantity: normalizeQuantityInstruction(cat.quantity_instruction),
        });
      }

      try {
        for (const entry of logsToCreate) {
          const key = `${slot.meal_slot_id}:${entry.macro_type}`;
          setLogInProgressKey(key);

          const payload: V3MealLogCreateRequest = {
            date: selectedDate,
            meal_slot_id: slot.meal_slot_id,
            macro_type: entry.macro_type,
            food_option_id: entry.food_option_id as number,
            quantity: entry.quantity,
            custom_food_name: undefined,
            custom_calories: undefined,
            custom_protein: undefined,
            custom_carbs: undefined,
            custom_fat: undefined,
          };

          const res = await fetch(`${v3MealsBase}/logs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(mode === "real" && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const detail = await res.json().catch(() => null);
            throw new Error(detail?.detail || `HTTP ${res.status}`);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save completion");
      } finally {
        setLogInProgressKey(null);
      }

      if (mode === "real") {
        if (!accessToken) return;
        const completionRes = await fetch(`${API_BASE_URL}/v3/meals/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            meal_slot_id: slot.meal_slot_id,
            date: selectedDate,
            is_completed: true,
            completion_method: "manual",
          }),
        });

        if (!completionRes.ok) {
          const detail = await completionRes.json().catch(() => null);
          throw new Error(detail?.detail || `HTTP ${completionRes.status}`);
        }
      }

      await fetchDayView();
    },
    [accessToken, deselectedMealCategoryKeys, fetchDayView, mode, selectedDate, v3MealsBase, dayView]
  );

  const openCustomDialogForSlot = useCallback((slot: V3MealSlotView) => {
    setCustomDialogSlot(slot);

    setCustomFoodName("");
    setCustomCalories("0");
    setCustomProtein("0");
    setCustomCarbs("0");
    setCustomFat("0");
    setCustomGramsInput("100");

    setCustomDialogOpen(true);
  }, []);

  const submitCustomFood = useCallback(async () => {
    if (!customDialogSlot) return;
    setCustomSaving(true);
    try {
      const grams = parseGrams(customGramsInput);
      if (!grams || grams <= 0) {
        throw new Error("Invalid grams amount");
      }

      // Trainee enters macros for 100g, we scale them to the chosen grams.
      const scale = grams / 100;
      const baseCalories = Number(customCalories) || 0;
      const baseProtein = Number(customProtein) || 0;
      const baseCarbs = Number(customCarbs) || 0;
      const baseFat = Number(customFat) || 0;

      const quantityInstruction = `${grams}g`;

      // Backend contract requires a `macro_type`. For "custom food overall",
      // we store it under protein and render it as the meal-slot custom choice in the UI.

      const payload: V3MealLogCreateRequest = {
        date: selectedDate,
        meal_slot_id: customDialogSlot.meal_slot_id,
        macro_type: "protein",
        food_option_id: null,
        custom_food_name: customFoodName || t("meals.custom", "Custom"),
        custom_calories: baseCalories * scale,
        custom_protein: baseProtein * scale,
        custom_carbs: baseCarbs * scale,
        custom_fat: baseFat * scale,
        quantity: quantityInstruction,
      };

      const res = await fetch(`${v3MealsBase}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(mode === "real" && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }

      setCustomDialogOpen(false);
      setCustomDialogSlot(null);
      await fetchDayView();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save custom food");
    } finally {
      setCustomSaving(false);
    }
  }, [
    customDialogSlot,
    customCalories,
    customCarbs,
    customFat,
    customFoodName,
    customProtein,
    customGramsInput,
    fetchDayView,
    selectedDate,
    t,
  ]);

  const openAskTrainerDialog = useCallback((slot: V3MealSlotView) => {
    const proteinCat = slot.categories.find((c) => c.macro_type === "protein");

    setAskTrainerSlot(slot);
    setAskTrainerMacroType(proteinCat?.macro_type ?? "protein");
    setAskTrainerMessage("");
    setAskTrainerOpen(true);
  }, []);

  const submitAskTrainer = useCallback(async () => {
    if (!askTrainerSlot) return;
    setAskTrainerSaving(true);
    try {
      if (mode === "mock") {
        const entry = {
          date: selectedDate,
          meal_slot_id: askTrainerSlot.meal_slot_id,
          meal_slot_name: askTrainerSlot.name,
          macro_type: askTrainerMacroType,
          message: askTrainerMessage,
        };

        const key = "mealsV3Mock_chat_links";
        const prevRaw = localStorage.getItem(key);
        const prev = prevRaw ? (JSON.parse(prevRaw) as unknown[]) : [];
        localStorage.setItem(key, JSON.stringify([...prev, entry]));

        toast({
          title: t("meals.askTrainerLinkedTitle", "Sent to trainer (mock)"),
          description: t("meals.askTrainerLinkedDesc", "Saved locally in sandbox mode."),
        });

        setAskTrainerOpen(false);
        setAskTrainerSlot(null);
        return;
      }

      if (!user || !accessToken) {
        throw new Error("Missing auth");
      }

      const context = `${askTrainerSlot.name} (${macroLabel(t, askTrainerMacroType)})`;
      const messageText = `${context}: ${askTrainerMessage}`;

      const res = await fetch(`${API_BASE_URL}/v2/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          client_id: user.id,
          message: messageText,
          progress_entry_id: null,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }

      toast({
        title: t("meals.askTrainerLinkedTitle", "Sent to trainer"),
        description: t("meals.askTrainerLinkedDesc", "Saved in your chat."),
      });

      setAskTrainerOpen(false);
      setAskTrainerSlot(null);
      navigate("/chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link to chat");
    } finally {
      setAskTrainerSaving(false);
    }
  }, [
    accessToken,
    askTrainerMacroType,
    askTrainerMessage,
    askTrainerSlot,
    navigate,
    mode,
    selectedDate,
    t,
    toast,
    user,
  ]);

  const openSwapDialog = useCallback((slot: V3MealSlotView) => {
    const firstCat = slot.categories[0];
    setSwapSlot(slot);
    setSwapMacroType(firstCat?.macro_type ?? "protein");
    const cat = firstCat ?? slot.categories[0];
    const chosen = cat?.chosen_food ?? null;
    const chosenId =
      chosen?.source === "plan_food" && typeof chosen.food_option_id === "number" ? chosen.food_option_id : null;
    setSwapSelectedFoodId(chosenId);
    setSwapQuery("");
    setSwapOpen(true);
  }, []);

  const submitSwapFood = useCallback(
    async (foodOptionId: number, quantityInstruction?: string | null) => {
      if (!swapSlot) return;
      setSwapSaving(true);
      try {
        await logPlanFood(swapSlot, swapMacroType, foodOptionId, quantityInstruction);
        setSwapOpen(false);
        setSwapSlot(null);
        setSwapQuery("");
        setSwapSelectedFoodId(null);
      } finally {
        setSwapSaving(false);
      }
    },
    [logPlanFood, swapMacroType, swapSlot]
  );

  const totals = useMemo(() => dayView?.daily_macros, [dayView]);

  const dateLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return d.toLocaleDateString(isRtlHe ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, [isRtlHe, selectedDate]);

  const inner = (
    <div className="pb-20 lg:pb-8">
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">{t("meals.myMealPlan", "My Meal Plan")}</h1>
                <p className="text-muted-foreground mt-1">{t("meals.trackNutrition", "Track your nutrition and meals")}</p>
              </div>
              <div className="flex items-center gap-2 justify-between sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date(`${selectedDate}T12:00:00`);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  aria-label={t("meals.prevDay", "Previous day")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">{dateLabel}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date(`${selectedDate}T12:00:00`);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  aria-label={t("meals.nextDay", "Next day")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">{t("common.loading", "Loading...")}</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-center text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {totals && (
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{t("meals.macros", "Macros")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg border bg-background/60 p-3">
                    <div className="text-sm text-muted-foreground">{t("meals.calories", "Calories")}</div>
                    <div className="text-lg font-semibold tabular-nums leading-tight">
                      {Math.round(totals.consumed.calories)}
                      <span className="text-xs text-muted-foreground ms-1">/ {Math.round(totals.targets.calories)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded bg-muted">
                      <div className="bg-blue-500 h-2 rounded" style={{ width: `${clampToPercent(totals.percentages.calories)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-3">
                    <div className="text-sm text-muted-foreground">{t("meals.protein", "Protein")}</div>
                    <div className="text-lg font-semibold tabular-nums leading-tight">
                      {Math.round(totals.consumed.protein)}g
                      <span className="text-xs text-muted-foreground ms-1">/ {Math.round(totals.targets.protein)}g</span>
                    </div>
                    <div className="mt-2 h-2 rounded bg-muted">
                      <div className="bg-emerald-500 h-2 rounded" style={{ width: `${clampToPercent(totals.percentages.protein)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-3">
                    <div className="text-sm text-muted-foreground">{t("meals.carbs", "Carbs")}</div>
                    <div className="text-lg font-semibold tabular-nums leading-tight">
                      {Math.round(totals.consumed.carbs)}g
                      <span className="text-xs text-muted-foreground ms-1">/ {Math.round(totals.targets.carbs)}g</span>
                    </div>
                    <div className="mt-2 h-2 rounded bg-muted">
                      <div className="bg-red-500 h-2 rounded" style={{ width: `${clampToPercent(totals.percentages.carbs)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background/60 p-3">
                    <div className="text-sm text-muted-foreground">{t("meals.fats", "Fats")}</div>
                    <div className="text-lg font-semibold tabular-nums leading-tight">
                      {Math.round(totals.consumed.fat)}g
                      <span className="text-xs text-muted-foreground ms-1">/ {Math.round(totals.targets.fat)}g</span>
                    </div>
                    <div className="mt-2 h-2 rounded bg-muted">
                      <div className="bg-fuchsia-500 h-2 rounded" style={{ width: `${clampToPercent(totals.percentages.fat)}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {dayView?.slots?.length ? (
            <div className="space-y-4">
              {dayView.slots
                .slice()
                .sort((a, b) => a.order_index - b.order_index)
                .map((slot) => (
                  <Card
                    key={slot.meal_slot_id}
                    className={completedMealSlotIds[slot.meal_slot_id] ? "border-green-500/60 bg-green-500/10" : undefined}
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span>{slot.name}</span>
                        {slot.time_suggestion && <Badge variant="outline">{slot.time_suggestion}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        {(() => {
                          const mealSlotCustomOverall =
                            slot.categories.find((c) => {
                              const ch = c.chosen_food;
                              if (!ch) return false;
                              return ch.food_option_id == null && Boolean((ch.custom_food_name ?? "").trim());
                            })?.chosen_food ?? null;

                          const mealSlotCustomOverallMacroType =
                            slot.categories.find((c) => {
                              const ch = c.chosen_food;
                              if (!ch) return false;
                              return ch.food_option_id == null && Boolean((ch.custom_food_name ?? "").trim());
                            })?.macro_type ?? null;

                          return slot.categories.map((cat) => {
                            const deselectionKey = `${selectedDate}:${slot.meal_slot_id}:${cat.macro_type}`;
                            const isDeselected = Boolean(deselectedMealCategoryKeys[deselectionKey]);
                            const ownChosen = cat.chosen_food ?? null;
                            const chosen = ownChosen ?? mealSlotCustomOverall;
                            const isCustomChosen = Boolean(chosen && chosen.food_option_id == null);

                            const quantityText = (() => {
                            if (isCustomChosen && chosen?.quantity) return normalizeQuantityInstruction(chosen.quantity);
                              if (mealSlotCustomOverall?.quantity) return normalizeQuantityInstruction(mealSlotCustomOverall.quantity);
                              return normalizeQuantityInstruction(cat.quantity_instruction);
                            })();

                          const selectedPlanFood =
                            ownChosen?.source === "plan_food" && typeof ownChosen.food_option_id === "number"
                              ? cat.recommended_foods.find((f) => f.id === ownChosen.food_option_id) ?? cat.recommended_foods[0] ?? null
                              : cat.recommended_foods[0] ?? null;

                          const displayMacros = (() => {
                            if (chosen) {
                              return {
                                calories: chosen.display_calories ?? 0,
                                protein: chosen.display_protein ?? 0,
                                carbs: chosen.display_carbs ?? 0,
                                fat: chosen.display_fat ?? 0,
                              };
                            }
                              if (isDeselected) {
                                return { calories: 0, protein: 0, carbs: 0, fat: 0 };
                              }
                            if (!selectedPlanFood) {
                              return { calories: 0, protein: 0, carbs: 0, fat: 0 };
                            }
                            return computeRecommendedDisplayMacros(selectedPlanFood, quantityText);
                          })();

                          return (
                            <div
                              key={cat.macro_type}
                              className="space-y-3 rounded-lg border bg-background/50 p-3"
                              onTouchStart={(e) => {
                                if (Boolean(completedMealSlotIds[slot.meal_slot_id])) return;
                                if (e.touches.length !== 1) return;
                                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                                swipeDeletingRef.current = false;
                              }}
                              onTouchEnd={(e) => {
                                if (Boolean(completedMealSlotIds[slot.meal_slot_id])) return;
                                const start = touchStartRef.current;
                                if (!start || swipeDeletingRef.current) return;
                                if (e.changedTouches.length !== 1) return;

                                const dx = e.changedTouches[0].clientX - start.x;
                                const dy = e.changedTouches[0].clientY - start.y;

                                const absDx = Math.abs(dx);
                                const absDy = Math.abs(dy);

                                // Horizontal swipe: mark as delete (mobile-first).
                                if (absDx > 70 && absDy < 60) {
                                  swipeDeletingRef.current = true;

                                  const visibleIsCustom = Boolean(chosen && chosen.food_option_id == null);
                                  if (visibleIsCustom) {
                                    // Custom is treated as "overall", so deselect all macro categories for this meal slot.
                                    if (mealSlotCustomOverallMacroType) {
                                      void deleteMealLog(slot.meal_slot_id, mealSlotCustomOverallMacroType);
                                    }
                                    setDeselectedMealCategoryKeys((prev) => ({
                                      ...prev,
                                      [`${selectedDate}:${slot.meal_slot_id}:protein`]: true,
                                      [`${selectedDate}:${slot.meal_slot_id}:carb`]: true,
                                      [`${selectedDate}:${slot.meal_slot_id}:fat`]: true,
                                    }));
                                  } else {
                                    // If nothing is logged yet, swipe should still remove the default selection for completion.
                                    const macroTypeToDelete = cat.macro_type;
                                    if (chosen) {
                                      void deleteMealLog(slot.meal_slot_id, macroTypeToDelete);
                                      setDeselectedMealCategoryKeys((prev) => ({ ...prev, [deselectionKey]: true }));
                                    } else {
                                      setDeselectedMealCategoryKeys((prev) => ({ ...prev, [deselectionKey]: true }));
                                    }
                                  }
                                }

                                touchStartRef.current = null;
                                swipeDeletingRef.current = false;
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold">{macroLabel(t, cat.macro_type)}</h3>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    <span className="me-1">{t("meals.qty", "Qty")}:</span>
                                    <span className="tabular-nums">{quantityText}</span>
                                  </div>
                                </div>

                                {chosen ? (
                                  <Badge variant="default" className="shrink-0">
                                    {isCustomChosen ? t("meals.custom", "Custom") : t("meals.eaten", "Eaten")}
                                    <span className="ms-1 tabular-nums">
                                      {chosen.quantity ? parseGrams(chosen.quantity).toFixed(0) : 0}g
                                    </span>
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="shrink-0">
                                    {t("meals.remaining", "Remaining")}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div className="break-words text-base font-semibold leading-snug">
                                  {chosen
                                    ? isCustomChosen
                                      ? chosen.custom_food_name || t("meals.custom", "Custom")
                                      : selectedPlanFood
                                      ? getLocalizedFoodName(selectedPlanFood)
                                      : ""
                                      : isDeselected
                                      ? ""
                                      : selectedPlanFood
                                      ? getLocalizedFoodName(selectedPlanFood)
                                      : ""}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label={t("meals.swapFood", "Swap food")}
                                  disabled={loading || Boolean(completedMealSlotIds[slot.meal_slot_id])}
                                  onClick={() => {
                                    if (Boolean(completedMealSlotIds[slot.meal_slot_id])) return;
                                    setSwapSlot(slot);
                                    setSwapMacroType(cat.macro_type);
                                    const chosenForMacro = cat.chosen_food;
                                    const chosenId =
                                      typeof chosenForMacro?.food_option_id === "number"
                                        ? chosenForMacro.food_option_id
                                        : null;
                                    setSwapSelectedFoodId(chosenId);
                                    setSwapQuery("");
                                    setSwapOpen(true);
                                  }}
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(
                                  [
                                    {
                                      label: t("meals.calories", "Calories"),
                                      value: displayMacros.calories,
                                      color: "bg-blue-500",
                                      percent: totals
                                        ? clampToPercent((displayMacros.calories / (totals.targets.calories || 1)) * 100)
                                        : 0,
                                      unit: "",
                                    },
                                    {
                                      label: t("meals.protein", "Protein"),
                                      value: displayMacros.protein,
                                      color: "bg-emerald-500",
                                      percent: totals
                                        ? clampToPercent((displayMacros.protein / (totals.targets.protein || 1)) * 100)
                                        : 0,
                                      unit: "g",
                                    },
                                    {
                                      label: t("meals.carbs", "Carbs"),
                                      value: displayMacros.carbs,
                                      color: "bg-red-500",
                                      percent: totals
                                        ? clampToPercent((displayMacros.carbs / (totals.targets.carbs || 1)) * 100)
                                        : 0,
                                      unit: "g",
                                    },
                                    {
                                      label: t("meals.fats", "Fats"),
                                      value: displayMacros.fat,
                                      color: "bg-fuchsia-500",
                                      percent: totals ? clampToPercent((displayMacros.fat / (totals.targets.fat || 1)) * 100) : 0,
                                      unit: "g",
                                    },
                                  ] as const
                                ).map((m) => (
                                  <div key={m.label} className="rounded-md bg-background/60 p-2">
                                    <div className="text-xs text-muted-foreground">{m.label}</div>
                                    <div className="text-lg font-semibold tabular-nums leading-tight">
                                      {Math.round(m.value)}
                                      {m.unit}
                                    </div>
                                    <div className="mt-1 h-2 rounded bg-muted">
                                      <div className={`${m.color} h-2 rounded`} style={{ width: `${m.percent}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Compact UI: switching foods happens via the meal-slot "Swap food" dialog. */}
                            </div>
                          );
                          });
                        })()}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openAskTrainerDialog(slot)}
                          disabled={loading}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {t("meals.askTrainer", "Ask trainer")}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gradient-orange text-background"
                          onClick={() => openCustomDialogForSlot(slot)}
                          disabled={loading || Boolean(completedMealSlotIds[slot.meal_slot_id])}
                        >
                          <Plus className="h-4 w-4" />
                          {t("meals.addFood", "Add Food")}
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          className="flex-1"
                          onClick={async () => {
                            if (mode === "mock") {
                              setCompletedMealSlotIds((prev) => ({ ...prev, [slot.meal_slot_id]: true }));
                            }
                            await applyMealCompletion(slot);
                          }}
                          disabled={loading || Boolean(completedMealSlotIds[slot.meal_slot_id])}
                        >
                          {t("meals.complete", "Complete")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">{t("meals.noMeals", "No meals")}</p>
              </CardContent>
            </Card>
          )}

          <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
            <DialogContent className="sm:max-w-md w-full max-w-md mx-auto rounded-xl overflow-hidden">
              <DialogHeader>
                <DialogTitle>{t("meals.addCustomFood", "Add custom food")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="customGramsInput">
                      {t("meals.amountEaten", "Amount eaten (grams)")}
                    </label>
                    <Input
                      id="customGramsInput"
                      inputMode="decimal"
                      value={customGramsInput}
                      onChange={(e) => setCustomGramsInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="customFoodName">
                    {t("meals.foodName", "Food name")}
                  </label>
                  <Input
                    id="customFoodName"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="customCalories">
                      {t("meals.calories", "Calories")}
                    </label>
                    <Input id="customCalories" inputMode="decimal" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="customProtein">
                      {t("meals.protein", "Protein")} (g)
                    </label>
                    <Input id="customProtein" inputMode="decimal" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="customCarbs">
                      {t("meals.carbs", "Carbs")} (g)
                    </label>
                    <Input id="customCarbs" inputMode="decimal" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="customFat">
                      {t("meals.fats", "Fats")} (g)
                    </label>
                    <Input id="customFat" inputMode="decimal" value={customFat} onChange={(e) => setCustomFat(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setCustomDialogOpen(false)} disabled={customSaving}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                    <Button
                      className="gradient-orange text-background flex-1"
                      onClick={submitCustomFood}
                      disabled={customSaving || Boolean(customDialogSlot ? completedMealSlotIds[customDialogSlot.meal_slot_id] : false)}
                    >
                    {customSaving ? t("common.loading", "Loading...") : t("common.submit", "Submit")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={askTrainerOpen} onOpenChange={setAskTrainerOpen}>
            <DialogContent className="sm:max-w-md w-full max-w-md mx-auto rounded-xl overflow-hidden">
              <DialogHeader>
                <DialogTitle>{t("meals.askTrainer", "Ask trainer")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md border bg-background/60 p-3">
                  <div className="text-sm text-muted-foreground">{t("meals.linkContext", "Context")}</div>
                  <div className="text-sm font-semibold break-words mt-1">
                    {askTrainerSlot ? askTrainerSlot.name : ""}{" "}
                    <span className="text-muted-foreground font-normal">{macroLabel(t, askTrainerMacroType)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="askTrainerMsg">
                    {t("meals.messageToTrainer", "Message")}
                  </label>
                  <Textarea
                    id="askTrainerMsg"
                    value={askTrainerMessage}
                    onChange={(e) => setAskTrainerMessage(e.target.value)}
                    placeholder={t("meals.typeMessage", "Type your question")}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAskTrainerOpen(false)} disabled={askTrainerSaving}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button className="gradient-orange text-background flex-1" onClick={submitAskTrainer} disabled={askTrainerSaving}>
                    {askTrainerSaving ? t("common.loading", "Loading...") : t("common.submit", "Submit")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
            <DialogContent className="sm:max-w-md w-full max-w-md mx-auto rounded-xl overflow-hidden">
              <DialogHeader>
                <DialogTitle>{t("meals.foodBank", "Food bank")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md border bg-background/60 p-3">
                  <div className="text-sm text-muted-foreground">{t("meals.chooseCategory", "Category")}</div>
                  <div className="text-base font-semibold mt-1">{macroLabel(t, swapMacroType)}</div>
                </div>

                {(() => {
                  if (!swapSlot) return null;
                  const slotCompleted = Boolean(completedMealSlotIds[swapSlot.meal_slot_id]);
                  const planChosen = swapSlot.categories.find((c) => c.macro_type === swapMacroType)?.chosen_food ?? null;
                  const customChosenMacroType =
                    swapSlot.categories.find((c) => {
                      const ch = c.chosen_food;
                      if (!ch) return false;
                      return ch.food_option_id == null && Boolean((ch.custom_food_name ?? "").trim());
                    })?.macro_type ?? null;

                  const deletionMacroType = typeof planChosen?.food_option_id === "number" ? swapMacroType : customChosenMacroType;

                  if (!deletionMacroType) return null;

                  return (
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={swapSaving || slotCompleted}
                      onClick={async () => {
                        if (slotCompleted) return;
                        if (typeof planChosen?.food_option_id === "number") {
                          setDeselectedMealCategoryKeys((prev) => ({
                            ...prev,
                            [`${selectedDate}:${swapSlot.meal_slot_id}:${swapMacroType}`]: true,
                          }));
                        } else {
                          setDeselectedMealCategoryKeys((prev) => ({
                            ...prev,
                            [`${selectedDate}:${swapSlot.meal_slot_id}:protein`]: true,
                            [`${selectedDate}:${swapSlot.meal_slot_id}:carb`]: true,
                            [`${selectedDate}:${swapSlot.meal_slot_id}:fat`]: true,
                          }));
                        }
                        await deleteMealLog(swapSlot.meal_slot_id, deletionMacroType);
                        setSwapOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4 me-2" />
                      {t("common.delete", "Delete")}
                    </Button>
                  );
                })()}

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="swapSearch">
                    {t("meals.searchFood", "Search food")}
                  </label>
                  <Input
                    ref={swapSearchInputRef}
                    id="swapSearch"
                    value={swapQuery}
                    onChange={(e) => setSwapQuery(e.target.value)}
                    placeholder={t("meals.searchPlaceholder", "Type to search...")}
                    dir={isRtlHe ? "rtl" : "ltr"}
                  />
                </div>

                <div className="max-h-[45vh] overflow-auto rounded-lg border bg-background/60">
                  {(() => {
                    const category = swapSlot?.categories.find((c) => c.macro_type === swapMacroType) ?? null;
                    const planFoods = category?.recommended_foods ?? [];
                    const foodsSource =
                      swapCatalogFoods.length > 0 ? swapCatalogFoods : planFoods;
                    const foods = [...foodsSource].sort((a, b) =>
                      getLocalizedFoodName(a).localeCompare(getLocalizedFoodName(b), isRtlHe ? "he" : "en", {
                        sensitivity: "base",
                      })
                    );
                    const quantityInstruction = category?.quantity_instruction ?? null;
                    const q = swapQuery.trim().toLowerCase();

                    if (swapCatalogLoading) {
                      return (
                        <div className="p-4 text-sm text-muted-foreground text-center">{t("common.loading")}</div>
                      );
                    }

                    const filtered =
                      !q
                        ? foods
                        : foods.filter((f) => {
                            const label = (isRtlHe ? f.name_hebrew ?? f.name : f.name ?? "") ?? "";
                            return label.toLowerCase().includes(q);
                          });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-3 text-sm text-muted-foreground">{t("meals.noResults", "No results")}</div>
                      );
                    }

                    return (
                      <div className="flex flex-col p-1 gap-1">
                        {filtered.map((food) => {
                          if (typeof food.id !== "number") return null;
                          const isSelected = swapSelectedFoodId === food.id;
                          const display = computeRecommendedDisplayMacros(food, quantityInstruction);
                          const macroValue =
                            swapMacroType === "protein"
                              ? display.protein
                              : swapMacroType === "carb"
                                ? display.carbs
                                : display.fat;

                          return (
                            <Button
                              key={food.id}
                              type="button"
                              variant={isSelected ? "default" : "ghost"}
                              className="justify-start rounded-lg px-3 h-auto py-2 w-full"
                              onClick={() => submitSwapFood(food.id, quantityInstruction)}
                              disabled={swapSaving || Boolean(completedMealSlotIds[swapSlot?.meal_slot_id ?? -1])}
                            >
                              <div className="flex flex-col w-full items-start gap-1">
                                <div className="w-full flex items-center justify-between gap-2">
                                  <span className="truncate">{getLocalizedFoodName(food)}</span>
                                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                                </div>
                                <div className="text-xs text-muted-foreground w-full">
                                  {t("meals.calories", "Calories")}: {Math.round(display.calories)} ·{" "}
                                  {macroLabel(t, swapMacroType)}: {Math.round(macroValue)}g
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <Button variant="outline" className="w-full" onClick={() => setSwapOpen(false)} disabled={swapSaving}>
                  {t("common.cancel", "Cancel")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Meal variants UI removed: trainee can swap any food already via the existing meal-slot swap dialog. */}
        </div>
      </div>
  );

  if (embedded) return inner;

  return <Layout currentPage="meals">{inner}</Layout>;
};

/** Dev/sandbox route: same UI as production meals; use `?mock=1` only if you need the isolated mock API. */
const SandboxMealsV3: React.FC = () => {
  const [params] = useSearchParams();
  const mock = params.get("mock") === "1" || params.get("mock") === "true";
  return <MealMenuV3 mode={mock ? "mock" : "real"} />;
};

export default SandboxMealsV3;

