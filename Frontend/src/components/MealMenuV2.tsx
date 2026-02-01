import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Check, Clock, Utensils, Flame, Apple, Camera, TrendingUp, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import MacroCircle from './MacroCircle';
import MealHistory from './MealHistory';
import { useToast } from '@/hooks/use-toast';

import { API_BASE_URL } from '../config/api';

interface FoodOption {
  id: number;
  name: string;
  name_hebrew: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  recommended_quantity?: string | null; // Trainer's recommended amount
  notes: string;
}

interface MacroCategory {
  id: number;
  macro_type: 'protein' | 'carb' | 'fat';
  quantity_instruction: string;
  notes: string;
  food_options: FoodOption[];
}

interface MealSlot {
  id: number;
  name: string;
  time_suggestion: string;
  notes: string;
  order_index: number;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  macro_categories: MacroCategory[];
}

interface MealPlan {
  id: number;
  name: string;
  description: string;
  number_of_meals: number;
  total_calories: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  is_active: boolean;
  meal_slots: MealSlot[];
}

interface ClientMealChoice {
  id: number;
  food_option_id?: number | null;
  meal_slot_id?: number | null;
  date: string;
  quantity?: string;
  custom_food_name?: string;
  custom_calories?: number;
  custom_protein?: number;
  custom_carbs?: number;
  custom_fat?: number;
}

interface DailyMacros {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

type CompletionRecord = {
  isCompleted: boolean;
  method?: 'manual' | 'auto' | string;
};

const parseGrams = (value?: string | number | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const match = value.match(/[\d.,]+/);
  if (!match) return 0;
  const normalized = match[0].replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Unit for grams is localized in component via t('meals.gramsShort')
const formatGramsValue = (value?: string | number | null): number => {
  const grams = parseGrams(value);
  return grams ? Math.round(grams) : 0;
};

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toString();
};

const getServingDefault = (value: string | number | null | undefined, fallback = '100'): string => {
  const grams = parseGrams(value);
  if (grams > 0) {
    return grams.toString();
  }
  return fallback;
};

const MealMenuV2 = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [choices, setChoices] = useState<ClientMealChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [selectedFood, setSelectedFood] = useState<{food: FoodOption, slotId: number} | null>(null);
  const [gramsInput, setGramsInput] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showCustomFoodDialog, setShowCustomFoodDialog] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const [mealCompletions, setMealCompletions] = useState<Record<number, CompletionRecord>>({});
  const [completionAdjustments, setCompletionAdjustments] = useState<
    Record<number, { calories: number; protein: number; carbs: number; fat: number }>
  >({});
  const [allFoodBankItems, setAllFoodBankItems] = useState<any[]>([]);
  const [showFoodBankDialog, setShowFoodBankDialog] = useState<{slotId: number, macroType: string} | null>(null); // macroType can be 'protein'|'carb'|'fat'|'all'
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const foodOptionMeta = useMemo(() => {
    const map = new Map<
      number,
      { slotId: number; macroType: MacroCategory['macro_type']; serving: number; option: FoodOption }
    >();

    if (!mealPlan) {
      return map;
    }

    mealPlan.meal_slots.forEach((slot) => {
      slot.macro_categories.forEach((category) => {
        category.food_options.forEach((option) => {
          map.set(option.id, {
            slotId: slot.id,
            macroType: category.macro_type,
            serving: parseGrams(option.serving_size) || 100,
            option,
          });
        });
      });
    });

    // Include user-added foods from food bank (not in plan) so meal totals calculate correctly
    choices.forEach((choice) => {
      if (!choice.food_option_id || map.has(choice.food_option_id)) return;
      const item = allFoodBankItems.find((i) => i.id === choice.food_option_id);
      if (!item || !choice.meal_slot_id) return;
      const macroType = (String(item.macro_type || 'protein').toLowerCase()) as MacroCategory['macro_type'];
      const option: FoodOption = {
        id: item.id,
        name: item.name,
        name_hebrew: item.name_hebrew || '',
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        serving_size: item.serving_size || '100g',
        notes: '',
      };
      map.set(choice.food_option_id, {
        slotId: choice.meal_slot_id,
        macroType,
        serving: parseGrams(item.serving_size) || 100,
        option,
      });
    });

    return map;
  }, [mealPlan, choices, allFoodBankItems]);

  const getCategoryTotalConsumed = useCallback(
    (slotId: number, macroType: MacroCategory['macro_type']) => {
      return choices.reduce((sum, choice) => {
        if (!choice.food_option_id) {
          return sum;
        }
        const meta = foodOptionMeta.get(choice.food_option_id);
        if (!meta) {
          return sum;
        }
        if (meta.slotId !== slotId || meta.macroType !== macroType) {
          return sum;
        }
        return sum + parseGrams(choice.quantity);
      }, 0);
    },
    [choices, foodOptionMeta]
  );

  const getOptionConsumedGrams = useCallback(
    (slotId: number, optionId: number) => {
      const choice = choices.find(
        (c) => c.meal_slot_id === slotId && c.food_option_id === optionId
      );
      return parseGrams(choice?.quantity);
    },
    [choices]
  );

  const getOptionRemainingGrams = useCallback(
    (slotId: number, _macroType: MacroCategory['macro_type'], option: FoodOption) => {
      const recommended = parseGrams(option.recommended_quantity || option.serving_size);
      if (recommended <= 0) return 0;
      const consumed = getOptionConsumedGrams(slotId, option.id);
      return Math.max(0, recommended - consumed);
    },
    [getOptionConsumedGrams]
  );

  useEffect(() => {
    const initialise = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        await fetchMealPlan();
        await fetchChoices(selectedDate);
        await fetchDailyMacros(selectedDate);
        await fetchMealCompletions(selectedDate);
        await fetchAllFoodBankItems();
      } finally {
        setLoading(false);
      }
    };

    initialise();
  }, [user?.id, selectedDate]);

  const fetchMealPlan = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/meals/plans?client_id=${user?.id}&active_only=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setMealPlan(data[0]); // Get the first active meal plan
        }
      }
    } catch (error) {
      console.error('Failed to fetch meal plan:', error);
      setError('Failed to load meal plan');
    }
  };

  const fetchChoices = async (dateOverride?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const dateParam = dateOverride ?? selectedDate ?? new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/v2/meals/choices?client_id=${user?.id}&date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChoices(data);
        await fetchMealCompletions(dateParam);
      }
    } catch (error) {
      console.error('Failed to fetch choices:', error);
    }
  };

  const fetchAllFoodBankItems = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/meals/meal-bank?include_public=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllFoodBankItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch food bank items:', error);
    }
  };

  const fetchDailyMacros = async (dateOverride?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const dateParam = dateOverride ?? new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/v2/meals/daily-macros?client_id=${user?.id}&date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyMacros(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily macros:', error);
    }
  };

  const fetchMealCompletions = async (dateOverride?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const dateParam = dateOverride ?? new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/v2/meals/completions?date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const statusMap: Record<number, CompletionRecord> = {};
        data.forEach((status: any) => {
          statusMap[status.meal_slot_id] = {
            isCompleted: Boolean(status.is_completed),
            method: status.completion_method ?? undefined,
          };
        });
        setMealCompletions(statusMap);
      }
    } catch (error) {
      console.error('Failed to fetch meal completions:', error);
    }
  };

  const upsertMealCompletion = useCallback(
    async (mealSlotId: number, isCompleted: boolean, method: 'manual' | 'auto') => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/v2/meals/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meal_slot_id: mealSlotId,
            date: `${selectedDate || new Date().toISOString().split('T')[0]}T12:00:00.000Z`,
            is_completed: isCompleted,
            completion_method: method,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMealCompletions((prev) => ({
            ...prev,
            [mealSlotId]: {
              isCompleted: Boolean(data.is_completed),
              method: data.completion_method ?? method,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to update meal completion:', error);
      }
    },
    [selectedDate]
  );

  const getMealTotals = useCallback(
    (slotId: number) => {
      return choices.reduce(
        (acc, choice) => {
          const meta = choice.food_option_id ? foodOptionMeta.get(choice.food_option_id) : undefined;
          const associatedSlotId = choice.meal_slot_id ?? meta?.slotId;

          if (associatedSlotId !== slotId) {
            return acc;
          }

          if (choice.custom_food_name) {
            acc.calories += choice.custom_calories ?? 0;
            acc.protein += choice.custom_protein ?? 0;
            acc.carbs += choice.custom_carbs ?? 0;
            acc.fat += choice.custom_fat ?? 0;
            return acc;
          }

          if (meta) {
            const option = meta.option;
            const gramsConsumed = parseGrams(choice.quantity);
            const baseServing = meta.serving > 0 ? meta.serving : 100;
            const scale = gramsConsumed > 0 && baseServing > 0 ? gramsConsumed / baseServing : 1;

            acc.calories += (option.calories ?? 0) * scale;
            acc.protein += (option.protein ?? 0) * scale;
            acc.carbs += (option.carbs ?? 0) * scale;
            acc.fat += (option.fat ?? 0) * scale;
          }

          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
    },
    [choices, foodOptionMeta]
  );

  useEffect(() => {
    if (!mealPlan) return;

    // Per-meal targets removed - auto-completion based on per-meal targets is disabled
    // Meals can only be manually marked as complete now
    // Auto-completion based on daily totals could be added in the future if needed
  }, [mealPlan]);

  const getRemainingAllowanceForOption = useCallback(
    (food: FoodOption, slotId: number) => {
      const meta = foodOptionMeta.get(food.id);
      if (!meta) {
        return parseGrams(food.serving_size);
      }
      return getOptionRemainingGrams(slotId, meta.macroType, food);
    },
    [foodOptionMeta, getOptionRemainingGrams]
  );

  const openFoodDialog = (food: FoodOption, slotId: number) => {
    const existingChoice = choices.find(
      c => c.meal_slot_id === slotId && c.food_option_id === food.id
    );
    const defaultAmount = food.recommended_quantity || food.serving_size;
    if (existingChoice) {
      const existingValue = parseGrams(existingChoice.quantity);
      setGramsInput(existingValue > 0 ? existingValue.toString() : getServingDefault(defaultAmount));
    } else {
      setGramsInput(getServingDefault(defaultAmount));
    }
    setSelectedFood({ food, slotId });
  };

  const submitFoodChoice = async () => {
    if (!selectedFood || !gramsInput) return;

    try {
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('access_token');
      const existingChoice = choices.find(
        c => c.meal_slot_id === selectedFood.slotId && c.food_option_id === selectedFood.food.id
      );

      if (existingChoice) {
        // Update existing choice
        const response = await fetch(`${API_BASE_URL}/v2/meals/choices/${existingChoice.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity: `${gramsInput}g`,
          }),
        });

        if (response.ok) {
          const updated = await response.json();
          setChoices(choices.map(c => c.id === updated.id ? updated : c));
        }
      } else {
        // Create new choice
        const response = await fetch(`${API_BASE_URL}/v2/meals/choices`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            food_option_id: selectedFood.food.id,
            meal_slot_id: selectedFood.slotId,
            date: `${dateParam}T12:00:00.000Z`,
            quantity: `${gramsInput}g`,
          }),
        });

        if (response.ok) {
          const newChoice = await response.json();
          setChoices([...choices, newChoice]);
        }
      }

      // Refresh choices and macro calculations to ensure consistency
      await fetchChoices(selectedDate);
      await fetchDailyMacros(selectedDate);
      
      // Close dialog
      setSelectedFood(null);
      setGramsInput('');
    } catch (error) {
      console.error('Failed to submit food choice:', error);
    }
  };

  const handleToggleCompletion = (slotId: number, checked: boolean) => {
    const slot = mealPlan?.meal_slots.find((s) => s.id === slotId);
    const totals = getMealTotals(slotId);

    if (checked && slot) {
      // Use daily targets instead of per-meal targets
      // Calculate remaining based on daily totals, not per-meal
      const dailyTargets = {
        calories: mealPlan?.total_calories ?? 0,
        protein: mealPlan?.protein_target ?? 0,
        carbs: mealPlan?.carb_target ?? 0,
        fat: mealPlan?.fat_target ?? 0,
      };

      // Get all consumed totals (including this meal)
      const allTotals = getDailyTotals();
      const caloriesRemaining = Math.max(0, dailyTargets.calories - allTotals.consumed.calories);
      const proteinRemaining = Math.max(0, dailyTargets.protein - allTotals.consumed.protein);
      const carbRemaining = Math.max(0, dailyTargets.carbs - allTotals.consumed.carbs);
      const fatRemaining = Math.max(0, dailyTargets.fat - allTotals.consumed.fat);

      setCompletionAdjustments((prev) => ({
        ...prev,
        [slotId]: {
          calories: caloriesRemaining,
          protein: proteinRemaining,
          carbs: carbRemaining,
          fat: fatRemaining,
        },
      }));
    } else {
      setCompletionAdjustments((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
    }

    upsertMealCompletion(slotId, checked, 'manual');
  };

  const submitCustomFood = async () => {
    if (!customFood.name.trim() || !customFood.calories) return;

    try {
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/meals/choices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_food_name: customFood.name,
          custom_calories: parseFloat(customFood.calories) || 0,
          custom_protein: parseFloat(customFood.protein) || 0,
          custom_carbs: parseFloat(customFood.carbs) || 0,
          custom_fat: parseFloat(customFood.fat) || 0,
          date: `${selectedDate || new Date().toISOString().split('T')[0]}T12:00:00.000Z`,
        }),
      });

      if (response.ok) {
        const newChoice = await response.json();
        setChoices([...choices, newChoice]);
        setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
        setShowCustomFoodDialog(false);
        await fetchChoices(selectedDate);
        await fetchDailyMacros(selectedDate);
        toast({
          title: t('common.success'),
          description: t('meals.customFoodAdded'),
        });
      } else {
        const errorData = await response.json().catch(() => null);
        toast({
          title: t('common.error'),
          description: errorData?.detail || t('meals.customFoodError'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to submit custom food:', error);
      toast({
        title: t('common.error'),
        description: t('meals.customFoodError'),
        variant: "destructive",
      });
    }
  };

  const deleteFoodChoice = async (choiceId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/v2/meals/choices/${choiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setChoices(choices.filter(c => c.id !== choiceId));
      await fetchChoices(selectedDate);
      await fetchDailyMacros(selectedDate);
    } catch (error) {
      console.error('Failed to delete choice:', error);
    }
  };

  const isFoodOptionSelected = (mealSlotId: number, foodOptionId: number) => {
    return choices.some(
      c => c.meal_slot_id === mealSlotId && c.food_option_id === foodOptionId
    );
  };

  const getMacroIcon = (macroType: string) => {
    switch (macroType) {
      case 'protein':
        return '🍗';
      case 'carb':
        return '🍞';
      case 'fat':
        return '🥑';
      default:
        return '🍽️';
    }
  };

  const getMacroName = (macroType: string) => {
    switch (macroType) {
      case 'protein':
        return t('meals.protein');
      case 'carb':
        return t('meals.carbs');
      case 'fat':
        return t('meals.fats');
      default:
        return macroType;
    }
  };

  const finishDay = async () => {
    if (!dailyMacros) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/meals/history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: user?.id,
          date: new Date().toISOString(),
          total_calories: dailyMacros.consumed.calories,
          total_protein: dailyMacros.consumed.protein,
          total_carbs: dailyMacros.consumed.carbs,
          total_fat: dailyMacros.consumed.fat,
          is_complete: true,
        }),
      });

      if (response.ok) {
        alert('Day saved successfully!');
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Failed to save day:', error);
      alert('Failed to save day');
    }
  };

  const displayDailyMacros = useMemo(() => {
    if (!dailyMacros) return null;
    const totals = Object.values(completionAdjustments).reduce(
      (acc, cur) => ({
        calories: acc.calories + cur.calories,
        protein: acc.protein + cur.protein,
        carbs: acc.carbs + cur.carbs,
        fat: acc.fat + cur.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const consumed = {
      calories: dailyMacros.consumed.calories + totals.calories,
      protein: dailyMacros.consumed.protein + totals.protein,
      carbs: dailyMacros.consumed.carbs + totals.carbs,
      fat: dailyMacros.consumed.fat + totals.fat,
    };

    const remaining = {
      calories: Math.max(0, dailyMacros.targets.calories - consumed.calories),
      protein: Math.max(0, dailyMacros.targets.protein - consumed.protein),
      carbs: Math.max(0, dailyMacros.targets.carbs - consumed.carbs),
      fat: Math.max(0, dailyMacros.targets.fat - consumed.fat),
    };

    const percentages = {
      calories: dailyMacros.targets.calories ? (consumed.calories / dailyMacros.targets.calories) * 100 : 0,
      protein: dailyMacros.targets.protein ? (consumed.protein / dailyMacros.targets.protein) * 100 : 0,
      carbs: dailyMacros.targets.carbs ? (consumed.carbs / dailyMacros.targets.carbs) * 100 : 0,
      fat: dailyMacros.targets.fat ? (consumed.fat / dailyMacros.targets.fat) * 100 : 0,
    };

    return {
      ...dailyMacros,
      consumed,
      remaining,
      percentages,
    };
  }, [dailyMacros, completionAdjustments]);

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">{t('meals.loadingMealPlan')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-gradient">{t('meals.myMealPlan')}</h1>
            <p className="text-muted-foreground mt-1">{t('meals.trackNutrition')}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Utensils className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">{t('meals.noActiveMealPlan')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('meals.trainerNotAssignedPlan')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                {mealPlan.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {mealPlan.description || t('meals.trackNutrition')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowCustomFoodDialog(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('meals.addCustomFood')}</span>
                <span className="sm:hidden">{t('meals.addFood', 'Add Food')}</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">{showHistory ? t('meals.hideHistory') : t('meals.showHistory')}</span>
                <span className="sm:hidden">{showHistory ? t('meals.hide', 'Hide') : t('meals.show', 'Show')}</span>
              </Button>
              <Button 
                onClick={finishDay}
                className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto"
              >
                <Check className="h-4 w-4 mr-2" />
                {t('meals.finishDay')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Date navigation: user chooses day; totals are calculated from selected foods */}
        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            aria-label={t('meals.prevDay', 'Previous day')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {selectedDate === new Date().toISOString().split('T')[0]
              ? t('meals.today', 'Today')
              : new Date(selectedDate + 'T12:00:00').toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            aria-label={t('meals.nextDay', 'Next day')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Daily Macro Progress: daily goal vs consumed (calculated from user's food choices) */}
        {displayDailyMacros && (
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>{t('meals.macros')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MacroCircle
                  label={t('meals.carbohydrates')}
                  consumed={displayDailyMacros.consumed.carbs}
                  target={displayDailyMacros.targets.carbs}
                  unit={t('meals.gramsShort', 'g')}
                  color="rgb(34, 197, 194)"
                />
                <MacroCircle
                  label={t('meals.fat')}
                  consumed={displayDailyMacros.consumed.fat}
                  target={displayDailyMacros.targets.fat}
                  unit={t('meals.gramsShort', 'g')}
                  color="rgb(168, 85, 247)"
                />
                <MacroCircle
                  label={t('meals.protein')}
                  consumed={displayDailyMacros.consumed.protein}
                  target={displayDailyMacros.targets.protein}
                  unit={t('meals.gramsShort', 'g')}
                  color="rgb(251, 146, 60)"
                />
              </div>
              
              {/* Calories Summary */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">{t('meals.dailyCalories')}</p>
                  <p className={`text-3xl font-bold ${displayDailyMacros.consumed.calories > displayDailyMacros.targets.calories ? 'text-destructive' : 'text-foreground'}`}>
                    {displayDailyMacros.consumed.calories.toFixed(0)} <span className="text-lg text-muted-foreground">/ {displayDailyMacros.targets.calories}</span>
                  </p>
                  {displayDailyMacros.consumed.calories > displayDailyMacros.targets.calories && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Over by {(displayDailyMacros.consumed.calories - displayDailyMacros.targets.calories).toFixed(0)} calories
                      </p>
                    </div>
                  )}
                  <Progress 
                    value={Math.min(displayDailyMacros.percentages.calories, 100)} 
                    className={`mt-3 h-2 ${displayDailyMacros.consumed.calories > displayDailyMacros.targets.calories ? 'bg-destructive/20' : ''}`} 
                  />
                  {displayDailyMacros.percentages.calories > 100 && (
                    <Progress 
                      value={100} 
                      className="mt-1 h-2 bg-destructive/50" 
                    />
                  )}
                </div>
                
                {/* Macro Over Alerts */}
                {(displayDailyMacros.consumed.protein > displayDailyMacros.targets.protein ||
                  displayDailyMacros.consumed.carbs > displayDailyMacros.targets.carbs ||
                  displayDailyMacros.consumed.fat > displayDailyMacros.targets.fat) && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">⚠️ {t('meals.macroLimitsExceeded', 'Exceeded macro limits:')}</p>
                    <div className="space-y-1 text-xs">
                      {displayDailyMacros.consumed.protein > displayDailyMacros.targets.protein && (
                        <p className="text-destructive">
                          {t('meals.protein')}: {displayDailyMacros.consumed.protein.toFixed(0)}{t('meals.gramsShort', 'g')} / {displayDailyMacros.targets.protein}{t('meals.gramsShort', 'g')} 
                          (+{(displayDailyMacros.consumed.protein - displayDailyMacros.targets.protein).toFixed(0)}{t('meals.gramsShort', 'g')} {t('meals.over')})
                        </p>
                      )}
                      {displayDailyMacros.consumed.carbs > displayDailyMacros.targets.carbs && (
                        <p className="text-destructive">
                          {t('meals.carbs')}: {displayDailyMacros.consumed.carbs.toFixed(0)}{t('meals.gramsShort', 'g')} / {displayDailyMacros.targets.carbs}{t('meals.gramsShort', 'g')} 
                          (+{(displayDailyMacros.consumed.carbs - displayDailyMacros.targets.carbs).toFixed(0)}{t('meals.gramsShort', 'g')} {t('meals.over')})
                        </p>
                      )}
                      {displayDailyMacros.consumed.fat > displayDailyMacros.targets.fat && (
                        <p className="text-destructive">
                          {t('meals.fat')}: {displayDailyMacros.consumed.fat.toFixed(0)}{t('meals.gramsShort', 'g')} / {displayDailyMacros.targets.fat}{t('meals.gramsShort', 'g')} 
                          (+{(displayDailyMacros.consumed.fat - displayDailyMacros.targets.fat).toFixed(0)}{t('meals.gramsShort', 'g')} {t('meals.over')})
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Foods Section */}
        {choices.filter(c => c.custom_food_name).length > 0 && (
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Custom Foods</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {choices.filter(c => c.custom_food_name).map((choice) => (
                  <div key={choice.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium mb-2">{choice.custom_food_name}</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-md border border-orange-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.kcal')}</span>
                          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{choice.custom_calories?.toFixed(0) || 0}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-md border border-emerald-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.protein')}</span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{choice.custom_protein?.toFixed(0) || 0}{t('meals.gramsShort', 'g')}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-md border border-cyan-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.carbs')}</span>
                          <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{choice.custom_carbs?.toFixed(0) || 0}{t('meals.gramsShort', 'g')}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-md border border-purple-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.fat')}</span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{choice.custom_fat?.toFixed(0) || 0}{t('meals.gramsShort', 'g')}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => deleteFoodChoice(choice.id)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meal Slots */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t('meals.dailyMeals')} ({mealPlan.number_of_meals})</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {mealPlan.meal_slots.map((slot) => {
              const completion = mealCompletions[slot.id];
              const isCompleted = completion?.isCompleted ?? false;
              const mealTotals = getMealTotals(slot.id);
              const completionAdjustment = completionAdjustments[slot.id] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
              const effectiveTotals = {
                calories: mealTotals.calories + completionAdjustment.calories,
                protein: mealTotals.protein + completionAdjustment.protein,
                carbs: mealTotals.carbs + completionAdjustment.carbs,
                fat: mealTotals.fat + completionAdjustment.fat,
              };
              // Per-meal targets removed - only use daily totals
              // No per-meal delta calculations

              return (
                <AccordionItem key={slot.id} value={`meal-${slot.id}`} className="border rounded-lg">
                  <Card>
                    <AccordionTrigger className="hover:no-underline px-6 py-4">
                      <div className="flex flex-col gap-2 w-full pr-4 text-left">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">🍽️</span>
                            <div>
                              <p className="font-semibold text-lg">{slot.name}</p>
                              {slot.time_suggestion && (
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {slot.time_suggestion}
                                </p>
                              )}
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(checked) => handleToggleCompletion(slot.id, Boolean(checked))}
                            />
                            <span>{isCompleted ? t('meals.mealCompleted') : t('meals.markComplete')}</span>
                          </div>
                        </div>
                        {/* Per-meal calculated total (no goal per meal – sum of user's food choices) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground ms-11">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">{Math.round(effectiveTotals.calories)} {t('meals.kcal')}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{Math.round(effectiveTotals.protein)}g {t('meals.protein')}</span>
                          <span className="text-cyan-600 dark:text-cyan-400">{Math.round(effectiveTotals.carbs)}g {t('meals.carbs')}</span>
                          <span className="text-purple-600 dark:text-purple-400">{Math.round(effectiveTotals.fat)}g {t('meals.fat')}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-6 pb-4">
                      {slot.notes && (
                        <p className="text-sm text-muted-foreground mb-4 italic">{slot.notes}</p>
                      )}
                      
                      <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 gap-1">
                          <TabsTrigger value="all" className="text-xs sm:text-sm">
                            {t('meals.allTab', 'All')}
                          </TabsTrigger>
                          {slot.macro_categories.map((category) => (
                            <TabsTrigger key={category.id} value={category.macro_type} className="text-xs sm:text-sm">
                              {getMacroIcon(category.macro_type)} {getMacroName(category.macro_type)}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {/* All tab: show all food from all categories */}
                        <TabsContent value="all" className="mt-4 space-y-3">
                          <div className="space-y-2">
                            {slot.macro_categories.map((category) => (
                              <React.Fragment key={category.id}>
                                {category.food_options.length > 0 && (
                                  <>
                                    {category.food_options.map((option) => {
                                      const isSelected = isFoodOptionSelected(slot.id, option.id);
                                      const selectedChoice = choices.find(
                                        c => c.meal_slot_id === slot.id && c.food_option_id === option.id
                                      );
                                      const recommendedGrams = option.recommended_quantity
                                        ? parseGrams(option.recommended_quantity)
                                        : parseGrams(option.serving_size);
                                      const remainingGrams = getOptionRemainingGrams(slot.id, category.macro_type, option);
                                      const consumedGrams = getOptionConsumedGrams(slot.id, option.id);
                                      return (
                                        <div
                                          key={option.id}
                                          className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            isSelected ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                                          }`}
                                          onClick={() => openFoodDialog(option, slot.id)}
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <p className="font-medium">
                                                {i18n.language === 'he' ? (option.name_hebrew || option.name) : option.name}
                                              </p>
                                              {isSelected && (
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="bg-primary/10 text-primary">
                                                    {selectedChoice?.quantity || `${Math.round(consumedGrams || 0)}${t('meals.gramsShort', 'g')}`}
                                                  </Badge>
                                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); if (selectedChoice) deleteFoodChoice(selectedChoice.id); }}>✕</Button>
                                                </div>
                                              )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                              <span>{getMacroName(category.macro_type)}</span>
                                              <span>•</span>
                                              <span>{option.calories} {t('meals.kcal')} • {option.protein}{t('meals.gramsShort', 'g')} {t('meals.protein')} • {option.carbs}{t('meals.gramsShort', 'g')} {t('meals.carbs')} • {option.fat}{t('meals.gramsShort', 'g')} {t('meals.fat')}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </React.Fragment>
                            ))}
                            {choices
                              .filter(c => c.meal_slot_id === slot.id && c.food_option_id)
                              .filter(c => !slot.macro_categories.some(cat => cat.food_options.some((opt: FoodOption) => opt.id === c.food_option_id)))
                              .map(choice => {
                                const foodBankItem = allFoodBankItems.find(item => item.id === choice.food_option_id);
                                if (!foodBankItem) return null;
                                const consumedGrams = parseGrams(choice.quantity);
                                return (
                                  <div
                                    key={choice.id}
                                    className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors border-primary/30"
                                    onClick={() => {
                                      const foodOption: FoodOption = {
                                        id: foodBankItem.id, name: foodBankItem.name, name_hebrew: foodBankItem.name_hebrew || '',
                                        calories: foodBankItem.calories || 0, protein: foodBankItem.protein || 0, carbs: foodBankItem.carbs || 0, fat: foodBankItem.fat || 0,
                                        serving_size: foodBankItem.serving_size || '100g', notes: ''
                                      };
                                      openFoodDialog(foodOption, slot.id);
                                    }}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className="font-medium">{i18n.language === 'he' ? (foodBankItem.name_hebrew || foodBankItem.name) : foodBankItem.name}</p>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-primary/10 text-primary">{choice.quantity || `${Math.round(consumedGrams || 0)}${t('meals.gramsShort', 'g')}`}</Badge>
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); deleteFoodChoice(choice.id); }}>✕</Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            <Button variant="outline" className="w-full" onClick={() => setShowFoodBankDialog({ slotId: slot.id, macroType: 'all' })}>
                              <Plus className="w-4 h-4 mr-2" />
                              {t('meals.addFood', 'Add Food')}
                            </Button>
                          </div>
                        </TabsContent>
                        
                        {slot.macro_categories.map((category) => (
                          <TabsContent key={category.id} value={category.macro_type} className="mt-4 space-y-3">
                            {category.quantity_instruction && (
                              <p className="text-sm text-muted-foreground">
                                Target: <span className="font-medium">{category.quantity_instruction}</span>
                              </p>
                            )}
                            
                            <div className="space-y-2">
                              {/* Recommended Foods */}
                              {category.food_options.length > 0 && (
                                <>
                                  {category.food_options.map((option) => {
                                  const isSelected = isFoodOptionSelected(slot.id, option.id);
                                  const selectedChoice = choices.find(
                                    c => c.meal_slot_id === slot.id && c.food_option_id === option.id
                                  );
                                  // Use recommended_quantity if available, otherwise fall back to serving_size
                                  const recommendedGrams = option.recommended_quantity 
                                    ? parseGrams(option.recommended_quantity) 
                                    : parseGrams(option.serving_size);
                                  const remainingGrams = getOptionRemainingGrams(slot.id, category.macro_type, option);
                                  const consumedGrams = getOptionConsumedGrams(slot.id, option.id);
                                  return (
                                    <div
                                      key={option.id}
                                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        isSelected 
                                          ? 'bg-primary/10 border-primary' 
                                          : 'bg-card hover:bg-accent'
                                      }`}
                                      onClick={() => openFoodDialog(option, slot.id)}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className="font-medium">
                                            {i18n.language === 'he' ? (option.name_hebrew || option.name) : option.name}
                                          </p>
                                          {isSelected && (
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                                {selectedChoice?.quantity || `${Math.round(consumedGrams || 0)}${t('meals.gramsShort', 'g')}`}
                                              </Badge>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (selectedChoice) deleteFoodChoice(selectedChoice.id);
                                                }}
                                              >
                                                ✕
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="mt-2 space-y-2">
                                          {/* Macros Grid */}
                                          <div className="grid grid-cols-4 gap-2">
                                            <div className="flex flex-col items-center p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-md border border-orange-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.kcal')}</span>
                                              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{option.calories}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-md border border-emerald-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.protein')}</span>
                                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{option.protein}{t('meals.gramsShort', 'g')}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-md border border-cyan-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.carbs')}</span>
                                              <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{option.carbs}{t('meals.gramsShort', 'g')}</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-md border border-purple-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.fat')}</span>
                                              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{option.fat}{t('meals.gramsShort', 'g')}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Recommended Amount and Remaining */}
                                          <div className="flex items-center justify-between text-xs gap-4">
                                            {recommendedGrams > 0 && (
                                              <span className="text-muted-foreground">
                                                {option.recommended_quantity 
                                                  ? t('meals.recommendedAmount', 'Recommended') 
                                                  : t('meals.servingSize')}: <span className="font-medium text-foreground">{formatGramsValue(recommendedGrams)}{formatGramsValue(recommendedGrams) ? t('meals.gramsShort', 'g') : ''}</span>
                                              </span>
                                            )}
                                            <span className="text-muted-foreground">
                                              {t('meals.remainingAmount', 'Remaining Amount')}: <span className="font-medium text-foreground">{Math.max(0, Math.round(remainingGrams))}{t('meals.gramsShort', 'g')}</span>
                                            </span>
                                          </div>
                                        </div>
                                        {consumedGrams > 0 && (
                                          <p className="text-xs text-muted-foreground">
                                            {t('meals.eaten')}: {Math.round(consumedGrams)}{t('meals.gramsShort', 'g')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                  })}
                                </>
                              )}
                              
                              {/* User-Selected Foods (from food bank, not in recommended list) */}
                              {choices
                                .filter(c => c.meal_slot_id === slot.id && c.food_option_id)
                                .filter(c => {
                                  // Only show if not in recommended list
                                  const isRecommended = category.food_options.some(opt => opt.id === c.food_option_id);
                                  return !isRecommended;
                                })
                                .map(choice => {
                                  const foodBankItem = allFoodBankItems.find(item => item.id === choice.food_option_id);
                                  if (!foodBankItem || foodBankItem.macro_type !== category.macro_type) return null;
                                  
                                  const consumedGrams = parseGrams(choice.quantity);
                                  return (
                                    <div
                                      key={choice.id}
                                      className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors border-primary/30"
                                      onClick={() => {
                                        const foodOption: FoodOption = {
                                          id: foodBankItem.id,
                                          name: foodBankItem.name,
                                          name_hebrew: foodBankItem.name_hebrew || '',
                                          calories: foodBankItem.calories || 0,
                                          protein: foodBankItem.protein || 0,
                                          carbs: foodBankItem.carbs || 0,
                                          fat: foodBankItem.fat || 0,
                                          serving_size: foodBankItem.serving_size || '100g',
                                          notes: ''
                                        };
                                        openFoodDialog(foodOption, slot.id);
                                      }}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className="font-medium">
                                            {i18n.language === 'he' ? (foodBankItem.name_hebrew || foodBankItem.name) : foodBankItem.name}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-primary/10 text-primary">
                                              {choice.quantity || `${Math.round(consumedGrams || 0)}${t('meals.gramsShort', 'g')}`}
                                            </Badge>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFoodChoice(choice.id);
                                              }}
                                            >
                                              ✕
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              
                              {/* Add Food Button */}
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowFoodBankDialog({ slotId: slot.id, macroType: category.macro_type })}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('meals.addFood', 'Add Food')}
                              </Button>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Meal History Panel */}
        {showHistory && (
          <div className="mt-8">
            <MealHistory clientId={user?.id} />
          </div>
        )}
      </div>

      {/* Gram Input Dialog */}
      <Dialog open={selectedFood !== null} onOpenChange={(open) => !open && setSelectedFood(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedFood && (i18n.language === 'he' 
                ? (selectedFood.food.name_hebrew || selectedFood.food.name) 
                : selectedFood.food.name)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFood && (() => {
            const remainingAllowance = getRemainingAllowanceForOption(selectedFood.food, selectedFood.slotId);
            const hasFiniteLimit = Number.isFinite(remainingAllowance);
            const safeRemaining = hasFiniteLimit ? remainingAllowance : Infinity;
            const inputGrams = parseFloat(gramsInput) || 0;
            const projectedRemaining = hasFiniteLimit ? safeRemaining - inputGrams : Infinity;
            const normalizedRemaining = hasFiniteLimit
              ? Math.round(Math.max(projectedRemaining, 0))
              : Infinity;
            const exceedsLimit = hasFiniteLimit ? projectedRemaining < 0 : false;
            
            return (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">{t('meals.nutritionalInfo', 'Nutritional Info')} ({t('meals.per', 'per')} {selectedFood.food.serving_size || `100${t('meals.gramsShort', 'g')}`})</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>{t('meals.calories')}: <span className="font-medium">{selectedFood.food.calories} {t('meals.kcal')}</span></div>
                    <div>{t('meals.protein')}: <span className="font-medium">{selectedFood.food.protein}{t('meals.gramsShort', 'g')}</span></div>
                    <div>{t('meals.carbs')}: <span className="font-medium">{selectedFood.food.carbs}{t('meals.gramsShort', 'g')}</span></div>
                    <div>{t('meals.fat')}: <span className="font-medium">{selectedFood.food.fat}{t('meals.gramsShort', 'g')}</span></div>
                  </div>
                </div>

                {/* Remaining Allowance Info */}
                {hasFiniteLimit && (
                  <div className={`p-3 rounded-lg border ${exceedsLimit ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'}`}>
                    <p className={`text-sm font-medium ${exceedsLimit ? 'text-destructive' : 'text-primary'}`}>
                      {t('meals.remainingDailyAllowance')}: <span className="font-bold">{normalizedRemaining}{t('meals.gramsShort', 'g')}</span>
                    </p>
                  </div>
                )}

                {/* Warning if exceeding - but allow it */}
                {exceedsLimit && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ {t('meals.remainingExceeded', { amount: Math.abs(Math.round(projectedRemaining)) })}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('meals.howMuchDidYouEat')}</label>
                  <Input
                    type="number"
                    value={gramsInput}
                    onChange={(e) => setGramsInput(e.target.value)}
                    placeholder={t('meals.enterGrams')}
                    className={`text-lg ${exceedsLimit ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedFood(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    className="flex-1 gradient-orange text-background"
                    onClick={submitFoodChoice}
                    disabled={!gramsInput || inputGrams <= 0}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {t('common.confirm')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Custom Food Dialog */}
      <Dialog open={showCustomFoodDialog} onOpenChange={setShowCustomFoodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('meals.addCustomFood')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('meals.customFoodName')} *</label>
              <Input
                placeholder={t('meals.customFoodNamePlaceholder', 'e.g., snack, pizza slice, etc.')}
                value={customFood.name}
                onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                className="w-full"
                dir="auto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('meals.customFoodCalories')} *</label>
                <Input
                  type="number"
                  placeholder="455"
                  value={customFood.calories}
                  onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('meals.customFoodProtein')}</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={customFood.protein}
                  onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('meals.customFoodCarbs')}</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={customFood.carbs}
                  onChange={(e) => setCustomFood({ ...customFood, carbs: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('meals.customFoodFat')}</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={customFood.fat}
                  onChange={(e) => setCustomFood({ ...customFood, fat: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowCustomFoodDialog(false);
                  setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 gradient-orange text-background"
                onClick={submitCustomFood}
                disabled={!customFood.name.trim() || !customFood.calories}
              >
                <Check className="w-4 h-4 mr-2" />
                Add Food
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Bank Selection Dialog */}
      <Dialog open={showFoodBankDialog !== null} onOpenChange={(open) => !open && setShowFoodBankDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('meals.selectFood', 'Select Food')}</DialogTitle>
            <DialogDescription>
              {t('meals.selectFromFoodBank', 'Select a food from the food bank')}
            </DialogDescription>
          </DialogHeader>
          
          {showFoodBankDialog && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {allFoodBankItems
                .filter(item => {
                  if (showFoodBankDialog.macroType === 'all') return true;
                  const itemMacro = String(item.macro_type ?? '').toLowerCase();
                  const filterMacro = String(showFoodBankDialog.macroType).toLowerCase();
                  return itemMacro === filterMacro;
                })
                .map((item) => {
                  const isAlreadySelected = choices.some(
                    c => c.meal_slot_id === showFoodBankDialog.slotId && c.food_option_id === item.id
                  );
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAlreadySelected 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card hover:bg-accent'
                      }`}
                      onClick={() => {
                        if (!isAlreadySelected) {
                          const foodOption: FoodOption = {
                            id: item.id,
                            name: item.name,
                            name_hebrew: item.name_hebrew || '',
                            calories: item.calories || 0,
                            protein: item.protein || 0,
                            carbs: item.carbs || 0,
                            fat: item.fat || 0,
                            serving_size: item.serving_size || '100g',
                            notes: ''
                          };
                          openFoodDialog(foodOption, showFoodBankDialog.slotId);
                          setShowFoodBankDialog(null);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {i18n.language === 'he' ? (item.name_hebrew || item.name) : item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.calories} {t('meals.kcal')} • {item.protein}{t('meals.gramsShort', 'g')} {t('meals.protein')} • {item.carbs}{t('meals.gramsShort', 'g')} {t('meals.carbs')} • {item.fat}{t('meals.gramsShort', 'g')} {t('meals.fat')}
                          </p>
                        </div>
                        {isAlreadySelected && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {t('meals.selected', 'Selected')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {allFoodBankItems.filter(item => {
                if (showFoodBankDialog.macroType === 'all') return true;
                const itemMacro = String(item.macro_type ?? '').toLowerCase();
                const filterMacro = String(showFoodBankDialog.macroType).toLowerCase();
                return itemMacro === filterMacro;
              }).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {t('meals.noFoodItems', 'No food items available')}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealMenuV2;



