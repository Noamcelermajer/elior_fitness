import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config/api";
import { Trash2, Plus, Search } from "lucide-react";
import type { MacroType, MeasurementType, V3DayViewResponse, V3FoodOption, V3DailyMacrosResponse, V3MealSlotView } from "../types/meals-v3";
import { formatDateForAPI, getWeekDays, getWeekRange } from "../utils/dashboard";

type MealCompletionStatus = {
  id: number;
  client_id: number;
  meal_slot_id: number;
  date: string;
  is_completed: boolean;
  completion_method?: string | null;
};

type MacroCategoryPlan = {
  // Quantity eaten for this macro category (e.g. "150g" or "1 serving").
  // This becomes the `quantity_instruction` in the v3 plan and is fixed for all swaps.
  quantityInstruction: string;
  recommendedFoodOptionId: number | null;
  // Allowed swaps (order matters; trainer can manage by list order).
  allowedSwapFoodOptionIds: number[];
};

type MealSlotPlanState = {
  protein: MacroCategoryPlan;
  carb: MacroCategoryPlan;
  fat: MacroCategoryPlan;
};

type FoodById = Record<number, V3FoodOption>;

type V3CompleteMacroCategoryFoodCreate = {
  name: string;
  name_hebrew?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  serving_size?: string | null;
  measurement_type?: MeasurementType;
  notes?: string | null;
};

type V3CompleteMacroCategoryCreate = {
  macro_type: MacroType;
  quantity_instruction?: string | null;
  calorie_goal?: number | null;
  track_cross_macros?: boolean;
  notes?: string | null;
  food_options: V3CompleteMacroCategoryFoodCreate[];
};

type V3CompleteMealSlotCreate = {
  name: string;
  time_suggestion?: string | null;
  notes?: string | null;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  macro_categories: V3CompleteMacroCategoryCreate[];
};

type V3CompleteMealPlanCreate = {
  client_id: number;
  name: string;
  description?: string | null;
  number_of_meals: number;
  total_calories?: number | null;
  protein_target?: number | null;
  carb_target?: number | null;
  fat_target?: number | null;
  meal_slots: V3CompleteMealSlotCreate[];
};

const dayLabel = (dateStr: string, isRtlHe: boolean): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  const locale = isRtlHe ? "he-IL" : "en-GB";
  return d.toLocaleDateString(locale, { weekday: "short" }).toUpperCase();
};

const createDefaultMacroCategoryPlan = (): MacroCategoryPlan => ({
  quantityInstruction: "100g",
  recommendedFoodOptionId: null,
  allowedSwapFoodOptionIds: [],
});

const TrainerWeeklyMealsPlannerV3: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const isRtlHe = (i18n.language || "").toLowerCase().startsWith("he");
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // Production uses real `/v3/meals`. Opt into mock only with `?mock=1` (dev / isolated QA).
  const [useV3MockBackend, setUseV3MockBackend] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mockEnabled = params.get("mock") === "1" || params.get("mock") === "true";
    setUseV3MockBackend(mockEnabled);
  }, [location.search]);

  useEffect(() => {
    // Real flow: trainer opens this page from `ClientProfile -> meal planning`,
    // so we expect `location.state.client` (or `?clientId=`) to already exist.
    const state = location.state as unknown as {
      client?: { id?: number; full_name?: string | null; username?: string | null };
    } | null;

    const fromState = typeof state?.client?.id === "number" ? state.client!.id : null;

    const params = new URLSearchParams(location.search);
    const fromQueryRaw = params.get("clientId") ?? params.get("client_id");
    const fromQuery = fromQueryRaw && !Number.isNaN(Number(fromQueryRaw)) ? Number(fromQueryRaw) : null;

    const nextClientId = fromState ?? fromQuery;
    if (typeof nextClientId !== "number") return;

    setClientId(nextClientId);
    const nextName =
      state?.client?.full_name ?? state?.client?.username ?? `Client ${nextClientId}`;
    setClientDisplayName(nextName);
  }, [location.search, location.state]);

  const [clients, setClients] = useState<Array<{ id: number; full_name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState<number | null>(null);
  const [clientDisplayName, setClientDisplayName] = useState<string | null>(null);
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const { start } = getWeekRange(new Date());
    return formatDateForAPI(start);
  });

  const weekDays = useMemo(() => getWeekDays(new Date(`${weekStartDate}T12:00:00`)).map(formatDateForAPI), [weekStartDate]);
  const weekEndDate = useMemo(() => weekDays[weekDays.length - 1] ?? weekStartDate, [weekDays, weekStartDate]);

  const [completionsByDay, setCompletionsByDay] = useState<Record<string, Record<number, boolean>>>({});

  const [dayView, setDayView] = useState<V3DayViewResponse | null>(null);
  const [daySummary, setDaySummary] = useState<V3DailyMacrosResponse | null>(null);

  const [proteinCatalog, setProteinCatalog] = useState<V3FoodOption[]>([]);
  const [carbCatalog, setCarbCatalog] = useState<V3FoodOption[]>([]);
  const [fatCatalog, setFatCatalog] = useState<V3FoodOption[]>([]);

  const catalogByMacro: Record<MacroType, FoodById> = useMemo(() => {
    const toMap = (items: V3FoodOption[]): FoodById =>
      items.reduce((acc, item) => {
        if (typeof item.id === "number") acc[item.id] = item;
        return acc;
      }, {} as FoodById);
    return {
      protein: toMap(proteinCatalog),
      carb: toMap(carbCatalog),
      fat: toMap(fatCatalog),
    };
  }, [proteinCatalog, carbCatalog, fatCatalog]);

  const [mealSlotPlansById, setMealSlotPlansById] = useState<Record<number, MealSlotPlanState>>({});

  const fetchClients = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => null))?.detail || `HTTP ${res.status}`);
      }
      type ClientApi = { id: number; full_name?: string | null; username?: string | null; email?: string | null };
      const data = (await res.json()) as ClientApi[];
      setClients(
        data.map((c) => ({
          id: c.id,
          full_name: c.full_name ?? c.username ?? `Client ${c.id}`,
          email: c.email ?? "",
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCatalog = useCallback(
    async (macroType: MacroType) => {
      if (useV3MockBackend) {
        const res = await fetch(`${API_BASE_URL}/v3/meals-mock/catalog?macro_type=${macroType}&include_public=true`);
        if (!res.ok) {
          throw new Error((await res.json().catch(() => null))?.detail || `HTTP ${res.status}`);
        }
        return (await res.json()) as V3FoodOption[];
      }

      if (!token) return [];
      const res = await fetch(`${API_BASE_URL}/v3/meals/catalog?macro_type=${macroType}&include_public=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => null))?.detail || `HTTP ${res.status}`);
      }
      return (await res.json()) as V3FoodOption[];
    },
    [token, useV3MockBackend]
  );

  const fetchAllCatalog = useCallback(async () => {
    const [protein, carb, fat] = await Promise.all([fetchCatalog("protein"), fetchCatalog("carb"), fetchCatalog("fat")]);
    setProteinCatalog(protein);
    setCarbCatalog(carb);
    setFatCatalog(fat);
  }, [fetchCatalog]);

  const fetchCompletionsWeek = useCallback(async () => {
    if (useV3MockBackend) {
      setCompletionsByDay({});
      return;
    }
    if (!token || !clientId) return;
    const byDay: Record<string, Record<number, boolean>> = {};
    await Promise.all(
      weekDays.map(async (day) => {
        const res = await fetch(`${API_BASE_URL}/v2/meals/completions?date=${day}&client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as MealCompletionStatus[];
        byDay[day] = data.reduce((acc, row) => {
          acc[row.meal_slot_id] = Boolean(row.is_completed);
          return acc;
        }, {} as Record<number, boolean>);
      })
    );
    setCompletionsByDay(byDay);
  }, [clientId, token, useV3MockBackend, weekDays]);

  const initializeMealSlotPlansFromDayView = useCallback(
    (view: V3DayViewResponse) => {
      const next: Record<number, MealSlotPlanState> = {};

      for (const slot of view.slots) {
        const proteinCat = slot.categories.find((c) => c.macro_type === "protein");
        const carbCat = slot.categories.find((c) => c.macro_type === "carb");
        const fatCat = slot.categories.find((c) => c.macro_type === "fat");

        const recommendedOrNull = (food: V3FoodOption | undefined | null) => (typeof food?.id === "number" ? food : null);

        const proteinRecommended = recommendedOrNull(proteinCat?.recommended_foods?.[0] ?? null);
        const carbRecommended = recommendedOrNull(carbCat?.recommended_foods?.[0] ?? null);
        const fatRecommended = recommendedOrNull(fatCat?.recommended_foods?.[0] ?? null);

        const mockAllowed: boolean = useV3MockBackend;

        const toAllowedIds = (foods: V3FoodOption[] | undefined | null): number[] => {
          if (!foods || foods.length === 0) return [];
          if (mockAllowed) return [];
          return foods
            .slice(1)
            .map((f) => (typeof f.id === "number" ? f.id : null))
            .filter((id): id is number => typeof id === "number");
        };

        const proteinQuantity = proteinCat?.quantity_instruction ?? proteinRecommended?.serving_size ?? "100g";
        const carbQuantity = carbCat?.quantity_instruction ?? carbRecommended?.serving_size ?? "100g";
        const fatQuantity = fatCat?.quantity_instruction ?? fatRecommended?.serving_size ?? "100g";

        next[slot.meal_slot_id] = {
          protein: {
            quantityInstruction: proteinQuantity,
            recommendedFoodOptionId: proteinRecommended?.id ?? null,
            allowedSwapFoodOptionIds: toAllowedIds(proteinCat?.recommended_foods ?? []),
          },
          carb: {
            quantityInstruction: carbQuantity,
            recommendedFoodOptionId: carbRecommended?.id ?? null,
            allowedSwapFoodOptionIds: toAllowedIds(carbCat?.recommended_foods ?? []),
          },
          fat: {
            quantityInstruction: fatQuantity,
            recommendedFoodOptionId: fatRecommended?.id ?? null,
            allowedSwapFoodOptionIds: toAllowedIds(fatCat?.recommended_foods ?? []),
          },
        };
      }

      setMealSlotPlansById(next);
    },
    [setMealSlotPlansById, useV3MockBackend]
  );

  const fetchDayForWeek = useCallback(async () => {
    if (!clientId) return;
    if (!useV3MockBackend && !token) return;
    setLoading(true);
    setError(null);
    try {
      const [viewRes, summaryRes] = useV3MockBackend
        ? [
            fetch(`${API_BASE_URL}/v3/meals-mock/day?date=${weekStartDate}`),
            fetch(`${API_BASE_URL}/v3/meals-mock/day/summary?date=${weekStartDate}`),
          ]
        : [
            fetch(`${API_BASE_URL}/v3/meals/day?date=${weekStartDate}&client_id=${clientId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/v3/meals/day/summary?date=${weekStartDate}&client_id=${clientId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ];
      if (!viewRes.ok) {
        throw new Error((await viewRes.json().catch(() => null))?.detail || `HTTP ${viewRes.status}`);
      }
      if (!summaryRes.ok) {
        throw new Error((await summaryRes.json().catch(() => null))?.detail || `HTTP ${summaryRes.status}`);
      }
      const view = (await viewRes.json()) as V3DayViewResponse;
      const summary = (await summaryRes.json()) as V3DailyMacrosResponse;

      setDayView(view);
      setDaySummary(summary);
      initializeMealSlotPlansFromDayView(view);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load day view");
    } finally {
      setLoading(false);
    }
  }, [clientId, initializeMealSlotPlansFromDayView, token, useV3MockBackend, weekStartDate]);

  useEffect(() => {
    if (!user || user.role !== "TRAINER") return;
    if (clientId) return;
    fetchClients();
  }, [clientId, fetchClients, user]);

  useEffect(() => {
    // Bootstrap catalog once, independent of week/client.
    fetchAllCatalog().catch(() => null);
  }, [fetchAllCatalog]);

  useEffect(() => {
    if (!clientId) return;
    fetchCompletionsWeek().catch(() => null);
  }, [clientId, fetchCompletionsWeek]);

  useEffect(() => {
    if (!clientId) return;
    fetchDayForWeek().catch(() => null);
  }, [clientId, fetchDayForWeek]);

  const mealSlots = useMemo(() => dayView?.slots ?? [], [dayView]);

  const updateMacroCategoryPlan = useCallback(
    (mealSlotId: number, macroType: MacroType, updater: (p: MacroCategoryPlan) => MacroCategoryPlan) => {
      setMealSlotPlansById((prev) => {
        const existing = prev[mealSlotId];
        const empty: MealSlotPlanState = {
          protein: createDefaultMacroCategoryPlan(),
          carb: createDefaultMacroCategoryPlan(),
          fat: createDefaultMacroCategoryPlan(),
        };

        const currentSlot = existing ?? empty;
        const macroKey = macroType as keyof MealSlotPlanState;
        return {
          ...prev,
          [mealSlotId]: {
            ...currentSlot,
            [macroKey]: updater(currentSlot[macroKey]),
          },
        };
      });
    },
    []
  );

  const setRecommendedFood = useCallback(
    (mealSlotId: number, macroType: MacroType, foodOptionId: number | null) => {
      updateMacroCategoryPlan(mealSlotId, macroType, (p) => ({
        ...p,
        recommendedFoodOptionId: foodOptionId,
        allowedSwapFoodOptionIds: foodOptionId ? p.allowedSwapFoodOptionIds.filter((id) => id !== foodOptionId) : p.allowedSwapFoodOptionIds,
      }));
    },
    [updateMacroCategoryPlan]
  );

  const setQuantityInstruction = useCallback(
    (mealSlotId: number, macroType: MacroType, quantityInstruction: string) => {
      updateMacroCategoryPlan(mealSlotId, macroType, (p) => ({ ...p, quantityInstruction }));
    },
    [updateMacroCategoryPlan]
  );

  const addAllowedSwapFood = useCallback(
    (mealSlotId: number, macroType: MacroType, foodOptionId: number) => {
      updateMacroCategoryPlan(mealSlotId, macroType, (p) => {
        const exists = p.allowedSwapFoodOptionIds.includes(foodOptionId);
        if (exists) return p;
        if (p.recommendedFoodOptionId === foodOptionId) return p;
        return { ...p, allowedSwapFoodOptionIds: [...p.allowedSwapFoodOptionIds, foodOptionId] };
      });
    },
    [updateMacroCategoryPlan]
  );

  const removeAllowedSwapFood = useCallback(
    (mealSlotId: number, macroType: MacroType, foodOptionId: number) => {
      updateMacroCategoryPlan(mealSlotId, macroType, (p) => ({
        ...p,
        allowedSwapFoodOptionIds: p.allowedSwapFoodOptionIds.filter((id) => id !== foodOptionId),
      }));
    },
    [updateMacroCategoryPlan]
  );

  const [foodDialogOpen, setFoodDialogOpen] = useState(false);
  const [foodDialogMacroType, setFoodDialogMacroType] = useState<MacroType>("protein");
  const [foodDialogMealSlotId, setFoodDialogMealSlotId] = useState<number | null>(null);
  type FoodDialogMode = "recommended" | "allowed";
  const [foodDialogMode, setFoodDialogMode] = useState<FoodDialogMode>("recommended");
  const [foodDialogQuery, setFoodDialogQuery] = useState("");

  const foodDialogInputRef = useRef<HTMLInputElement | null>(null);

  const openFoodDialog = useCallback((macroType: MacroType, mealSlotId: number, mode: FoodDialogMode) => {
    setFoodDialogMacroType(macroType);
    setFoodDialogMealSlotId(mealSlotId);
    setFoodDialogMode(mode);
    setFoodDialogQuery("");
    setFoodDialogOpen(true);
  }, []);

  useEffect(() => {
    if (foodDialogOpen) {
      window.setTimeout(() => foodDialogInputRef.current?.focus(), 50);
    }
  }, [foodDialogOpen]);

  const currentDialogSlotPlan = useMemo(() => {
    if (!foodDialogMealSlotId) return null;
    return mealSlotPlansById[foodDialogMealSlotId] ?? null;
  }, [foodDialogMealSlotId, mealSlotPlansById]);

  const catalogItemsForDialog = useMemo(() => {
    if (foodDialogMacroType === "protein") return proteinCatalog;
    if (foodDialogMacroType === "carb") return carbCatalog;
    return fatCatalog;
  }, [carbCatalog, fatCatalog, foodDialogMacroType, proteinCatalog]);

  const filteredCatalogItems = useMemo(() => {
    const q = foodDialogQuery.trim().toLowerCase();
    if (!q) return catalogItemsForDialog;
    return catalogItemsForDialog.filter((item) => {
      const name = (isRtlHe ? item.name_hebrew ?? item.name : item.name) ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [catalogItemsForDialog, foodDialogQuery, isRtlHe]);

  const applyFoodSelection = useCallback(
    (food: V3FoodOption) => {
      if (!foodDialogMealSlotId) return;
      if (typeof food.id !== "number") return;

      if (foodDialogMode === "recommended") {
        setRecommendedFood(foodDialogMealSlotId, foodDialogMacroType, food.id);
      } else {
        addAllowedSwapFood(foodDialogMealSlotId, foodDialogMacroType, food.id);
      }

      setFoodDialogOpen(false);
    },
    [addAllowedSwapFood, foodDialogMacroType, foodDialogMealSlotId, foodDialogMode, setRecommendedFood]
  );

  const publishWeekPlan = useCallback(async () => {
    if (!clientId) return;
    if (mealSlots.length === 0) {
      setError(t("weeklyMeals.noPlanToEdit", "No meal plan exists for this client. Create one first."));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!daySummary) return;
      if (!useV3MockBackend && !token) return;

      const plansPayloadSlots: V3CompleteMealSlotCreate[] = mealSlots
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((slot) => {
          const slotPlan = mealSlotPlansById[slot.meal_slot_id];
          if (!slotPlan) {
            throw new Error(`Missing plan state for slot ${slot.meal_slot_id}`);
          }

          const slotMacroCreate = (macroType: MacroType): V3CompleteMacroCategoryCreate => {
            const macroKey = macroType as keyof MealSlotPlanState;
            const plan = slotPlan[macroKey];
            const recommendedId = plan.recommendedFoodOptionId;
            const quantityInstruction = plan.quantityInstruction || "100g";

            if (typeof recommendedId !== "number") {
              throw new Error(`Missing recommended food for ${macroType} in slot ${slot.meal_slot_id}`);
            }

            const allowedIds = plan.allowedSwapFoodOptionIds.filter((id) => id !== recommendedId);
            const foodIdsInOrder = [recommendedId, ...allowedIds];

            const food_options: V3CompleteMacroCategoryFoodCreate[] = foodIdsInOrder.map((foodId) => {
              const food = catalogByMacro[macroType][foodId];
              if (!food || typeof food.id !== "number") {
                return {
                  name: "",
                  name_hebrew: null,
                  calories: null,
                  protein: null,
                  carbs: null,
                  fat: null,
                  serving_size: quantityInstruction,
                  measurement_type: undefined,
                  notes: null,
                };
              }

              return {
                name: food.name ?? "",
                name_hebrew: food.name_hebrew ?? null,
                calories: food.calories ?? null,
                protein: food.protein ?? null,
                carbs: food.carbs ?? null,
                fat: food.fat ?? null,
                serving_size: quantityInstruction,
                measurement_type: food.measurement_type,
                notes: null,
              };
            });

            return {
              macro_type: macroType,
              quantity_instruction: quantityInstruction,
              calorie_goal: null,
              track_cross_macros: false,
              notes: null,
              food_options,
            };
          };

          return {
            name: slot.name,
            time_suggestion: slot.time_suggestion ?? null,
            notes: slot.notes ?? null,
            target_calories: null,
            target_protein: null,
            target_carbs: null,
            target_fat: null,
            macro_categories: ["protein", "carb", "fat"].map((m) => slotMacroCreate(m as MacroType)),
          };
        });

      const payload: V3CompleteMealPlanCreate = {
        client_id: clientId,
        name: t("weeklyMeals.planName", "Weekly Meal Plan"),
        description: null,
        number_of_meals: mealSlots.length,
        total_calories: Math.round(daySummary.targets.calories),
        protein_target: Math.round(daySummary.targets.protein),
        carb_target: Math.round(daySummary.targets.carbs),
        fat_target: Math.round(daySummary.targets.fat),
        meal_slots: plansPayloadSlots,
      };

      const endpoint = useV3MockBackend ? `${API_BASE_URL}/v3/meals-mock/plans` : `${API_BASE_URL}/v3/meals/plans`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...(useV3MockBackend ? {} : { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }

      // Refresh day view so UI reflects the published plan structure.
      await fetchDayForWeek();
      await fetchCompletionsWeek();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish week plan");
    } finally {
      setLoading(false);
    }
  }, [
    API_BASE_URL,
    clientId,
    daySummary,
    fetchCompletionsWeek,
    fetchDayForWeek,
    mealSlots,
    setError,
    t,
    token,
    mealSlotPlansById,
    catalogByMacro,
    useV3MockBackend,
    weekStartDate,
  ]);

  const completenessForDay = useCallback(
    (dayStr: string) => {
      const completionMap = completionsByDay[dayStr] ?? {};
      const total = mealSlots.length;
      if (total === 0) return { completed: 0, total: 0 };
      const completed = mealSlots.reduce((sum, slot) => sum + (completionMap[slot.meal_slot_id] ? 1 : 0), 0);
      return { completed, total };
    },
    [completionsByDay, mealSlots]
  );

  const isMobileBlockerText = t("weeklyMeals.mobileBlocker", "This page must be accessed via computer due to complexity.");

  return (
    <Layout currentPage="dashboard">
      {/* Mobile-first: hard block editing on phone */}
      <div className="lg:hidden p-4">
        <Card className="rounded-xl border-border/60 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("weeklyMeals.mobileTitle", "Desktop only")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{isMobileBlockerText}</CardContent>
        </Card>
      </div>

      <div className="hidden lg:block pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold">{t("weeklyMeals.title", "Weekly Meal Planner (v3)")}</h1>
              <p className="text-muted-foreground text-sm break-words">
                {t("weeklyMeals.subtitle", { start: weekStartDate, end: weekEndDate })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {clientId ? (
                <div className="min-w-[220px]">
                  <label className="text-sm font-medium">{t("weeklyMeals.client", "Client")}</label>
                  <div className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background text-sm break-words">
                    {clientDisplayName ?? `Client ${clientId}`}
                  </div>
                </div>
              ) : (
                <div className="min-w-[220px]">
                  <label className="text-sm font-medium">{t("weeklyMeals.client", "Client")}</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background"
                    value={clientId ?? ""}
                    onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t("weeklyMeals.selectClient", "Select client...")}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="min-w-[220px]">
                <label className="text-sm font-medium">{t("weeklyMeals.weekStart", "Week start (Mon)")}</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  dir={isRtlHe ? "rtl" : "ltr"}
                />
              </div>
            </div>
          </div>

          {error ? (
            <Card className="border-destructive">
              <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : null}

          {loading && (
            <Card>
              <CardContent className="pt-5 pb-5 text-center text-muted-foreground text-sm">{t("common.loading", "Loading...")}</CardContent>
            </Card>
          )}

          {/* Completion overview + editor */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-4 space-y-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("weeklyMeals.completion", "Meal completion")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weekDays.map((dayStr) => {
                      const { completed, total } = completenessForDay(dayStr);
                      return (
                        <div
                          key={dayStr}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold tabular-nums">{dayLabel(dayStr, isRtlHe)}</div>
                            <div className="text-xs text-muted-foreground break-words">{dayStr}</div>
                          </div>
                          <Badge variant={total > 0 && completed === total ? "default" : "secondary"}>
                            {completed}/{total}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {daySummary ? (
                <Card className="rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t("weeklyMeals.dailyTargets", "Daily targets")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("meals.calories", "Calories")}</span>
                      <span className="font-semibold tabular-nums">{Math.round(daySummary.targets.calories)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("meals.protein", "Protein")}</span>
                      <span className="font-semibold tabular-nums">{Math.round(daySummary.targets.protein)}g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("meals.carbs", "Carbs")}</span>
                      <span className="font-semibold tabular-nums">{Math.round(daySummary.targets.carbs)}g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("meals.fats", "Fats")}</span>
                      <span className="font-semibold tabular-nums">{Math.round(daySummary.targets.fat)}g</span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Button
                type="button"
                className="w-full gradient-orange text-background"
                onClick={publishWeekPlan}
                disabled={loading || !clientId}
              >
                <Plus className="h-4 w-4 ms-0 me-2" />
                {t("weeklyMeals.publish", "Publish week plan")}
              </Button>
            </div>

            <div className="col-span-12 xl:col-span-8 space-y-3">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("weeklyMeals.mealSlots", "Meal slots")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mealSlots.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      {t("weeklyMeals.noMeals", "No meal slots found for this client. Create a v3 meal plan first.")}
                    </div>
                  ) : (
                    mealSlots
                      .slice()
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((slot) => {
                        const slotPlan = mealSlotPlansById[slot.meal_slot_id] ?? null;
                        const allowedTotal = slotPlan
                          ? slotPlan.protein.allowedSwapFoodOptionIds.length +
                            slotPlan.carb.allowedSwapFoodOptionIds.length +
                            slotPlan.fat.allowedSwapFoodOptionIds.length
                          : 0;

                        return (
                          <div key={slot.meal_slot_id} className="rounded-lg border bg-background/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-base font-semibold truncate">{slot.name}</div>
                                  {slot.time_suggestion ? (
                                    <Badge variant="outline" className="shrink-0">
                                      {slot.time_suggestion}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("weeklyMeals.allowedSwapsCount", { count: allowedTotal }, "Allowed swaps")}:{" "}
                                  <span className="tabular-nums">{allowedTotal}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 space-y-3">
                              {(
                                [
                                  { macro: "protein" as const, label: t("meals.protein", "Protein") },
                                  { macro: "carb" as const, label: t("meals.carbs", "Carbs") },
                                  { macro: "fat" as const, label: t("meals.fats", "Fats") },
                                ] as const
                              ).map((m) => {
                                const macroKey = m.macro;
                                const macroPlan = slotPlan ? slotPlan[macroKey] : null;
                                const recommendedId = macroPlan?.recommendedFoodOptionId ?? null;
                                const recommendedFood = recommendedId ? catalogByMacro[macroKey][recommendedId] : undefined;
                                const allowedIds = macroPlan?.allowedSwapFoodOptionIds ?? [];

                                const allowedFoods = allowedIds
                                  .map((id) => catalogByMacro[macroKey][id])
                                  .filter((f): f is V3FoodOption => Boolean(f && typeof f.id === "number"));

                                return (
                                  <div key={`${slot.meal_slot_id}_${macroKey}`} className="rounded-lg border bg-background/60 p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start"
                                          onClick={() => openFoodDialog(macroKey, slot.meal_slot_id, "recommended")}
                                        >
                                          <Search className="h-4 w-4 me-2" />
                                          {recommendedFood
                                            ? isRtlHe
                                              ? recommendedFood.name_hebrew ?? recommendedFood.name
                                              : recommendedFood.name
                                            : t("weeklyMeals.pickFood", "Pick food")}
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                                      <div className="md:col-span-4">
                                        <div className="text-xs text-muted-foreground mb-1">{t("weeklyMeals.quantity", "Fixed quantity")}</div>
                                        <Input
                                          value={macroPlan?.quantityInstruction ?? "100g"}
                                          onChange={(e) => setQuantityInstruction(slot.meal_slot_id, macroKey, e.target.value)}
                                          placeholder="100g"
                                          dir="ltr"
                                        />
                                      </div>
                                      <div className="md:col-span-8">
                                        <div className="text-xs text-muted-foreground mb-1">{t("weeklyMeals.macroPreview", "Preview")}</div>
                                        <div className="rounded-md border bg-background/50 p-2 text-sm">
                                          {recommendedFood ? (
                                            <div className="flex flex-col gap-1">
                                              <div className="tabular-nums">
                                                {t("meals.calories", "Calories")}: {recommendedFood.calories ?? 0}
                                              </div>
                                              <div className="tabular-nums text-muted-foreground">
                                                {t("meals.protein", "Protein")}: {recommendedFood.protein ?? 0}g ·{" "}
                                                {t("meals.carbs", "Carbs")}: {recommendedFood.carbs ?? 0}g ·{" "}
                                                {t("meals.fats", "Fats")}: {recommendedFood.fat ?? 0}g
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-muted-foreground">{t("weeklyMeals.noFoodSelected", "No food selected")}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="text-xs text-muted-foreground">{t("weeklyMeals.allowedSwaps", "Allowed swaps")}</div>
                                      {allowedFoods.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">{t("weeklyMeals.noAllowedSwaps", "No allowed swaps selected.")}</div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                          {allowedFoods.map((f) => {
                                            const name = isRtlHe ? f.name_hebrew ?? f.name : f.name;
                                            return (
                                              <div key={f.id} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                                                <span className="text-xs truncate max-w-[160px]">{name}</span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={() => removeAllowedSwapFood(slot.meal_slot_id, macroKey, f.id as number)}
                                                  aria-label={t("common.delete", "Delete")}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openFoodDialog(macroKey, slot.meal_slot_id, "allowed")}
                                      >
                                        <Plus className="h-4 w-4 me-2" />
                                        {t("weeklyMeals.addAllowedFood", "Add allowed food")}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={foodDialogOpen} onOpenChange={(open) => setFoodDialogOpen(open)}>
        <DialogContent className="sm:max-w-md w-full max-w-md mx-auto rounded-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("weeklyMeals.selectFood", "Select food")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t("weeklyMeals.search", "Search")}</label>
              <Input
                ref={foodDialogInputRef}
                value={foodDialogQuery}
                onChange={(e) => setFoodDialogQuery(e.target.value)}
                placeholder={t("weeklyMeals.searchPlaceholder", "Type to search...")}
                dir={isRtlHe ? "rtl" : "ltr"}
              />
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-lg border bg-background/60">
              {filteredCatalogItems.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t("weeklyMeals.noResults", "No results")}</div>
              ) : (
                <div className="flex flex-col divide-y">
                  {filteredCatalogItems.map((item) => {
                    const selected = (() => {
                      if (typeof item.id !== "number") return false;
                      if (!currentDialogSlotPlan) return false;
                      const macroKey = foodDialogMacroType as keyof MealSlotPlanState;
                      if (foodDialogMode === "recommended") {
                        return currentDialogSlotPlan[macroKey].recommendedFoodOptionId === item.id;
                      }
                      return currentDialogSlotPlan[macroKey].allowedSwapFoodOptionIds.includes(item.id);
                    })();
                    const name = isRtlHe ? item.name_hebrew ?? item.name : item.name;
                    return (
                      <Button
                        key={typeof item.id === "number" ? item.id : name}
                        type="button"
                        variant={selected ? "default" : "ghost"}
                        className="justify-start rounded-none px-3 py-2 w-full"
                        onClick={() => applyFoodSelection(item)}
                      >
                        <div className="flex flex-col w-full items-start">
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="truncate text-sm font-semibold">{name}</span>
                            {selected ? <Badge variant="outline">{t("weeklyMeals.selected", "Selected")}</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {t("meals.calories", "Calories")}: {item.calories ?? 0} ·{" "}
                            {t("meals.protein", "Protein")}: {item.protein ?? 0}g ·{" "}
                            {t("meals.carbs", "Carbs")}: {item.carbs ?? 0}g ·{" "}
                            {t("meals.fats", "Fats")}: {item.fat ?? 0}g
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setFoodDialogOpen(false)} className="w-full sm:w-auto">
                {t("common.cancel", "Cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TrainerWeeklyMealsPlannerV3;

