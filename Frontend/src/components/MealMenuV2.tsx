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
import { Plus, Check, Clock, Utensils, Flame, Apple, Camera, TrendingUp, History } from 'lucide-react';
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

const formatGrams = (value?: string | number | null): string => {
  const grams = parseGrams(value);
  if (!grams) return '';
  return `${Math.round(grams)}g`;
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
            serving: parseGrams(option.serving_size),
            option,
          });
        });
      });
    });

    return map;
  }, [mealPlan]);

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
    (slotId: number, macroType: MacroCategory['macro_type'], option: FoodOption) => {
      const recommended = parseGrams(option.serving_size);
      if (recommended <= 0) {
        return 0;
      }
      const consumed = getCategoryTotalConsumed(slotId, macroType);
      const remaining = Math.max(0, recommended - consumed);
      return remaining;
    },
    [getCategoryTotalConsumed]
  );

  useEffect(() => {
    const initialise = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        await fetchMealPlan();
        await fetchChoices();
        await fetchDailyMacros();
        await fetchMealCompletions();
      } finally {
        setLoading(false);
      }
    };

    initialise();
  }, [user?.id]);

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

  const fetchChoices = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/v2/meals/choices?client_id=${user?.id}&date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChoices(data);
        await fetchMealCompletions(today);
      }
    } catch (error) {
      console.error('Failed to fetch choices:', error);
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
            date: new Date().toISOString(),
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
    []
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

    const tolerance = 0.5;

    mealPlan.meal_slots.forEach((slot) => {
      const totals = getMealTotals(slot.id);
      const targets = {
        calories: slot.target_calories ?? null,
        protein: slot.target_protein ?? null,
        carbs: slot.target_carbs ?? null,
        fat: slot.target_fat ?? null,
      };

      const hasTargets = Object.values(targets).some((value) => value && value > 0);
      if (!hasTargets) {
        return;
      }

      const meetsCalories =
        !targets.calories || totals.calories >= targets.calories - tolerance;
      const meetsProtein =
        !targets.protein || totals.protein >= targets.protein - tolerance;
      const meetsCarbs =
        !targets.carbs || totals.carbs >= targets.carbs - tolerance;
      const meetsFat = !targets.fat || totals.fat >= targets.fat - tolerance;

      const meetsAll = meetsCalories && meetsProtein && meetsCarbs && meetsFat;
      const status = mealCompletions[slot.id];

      if (meetsAll) {
        if (!status || !status.isCompleted || status.method !== 'manual') {
          if (!status || !status.isCompleted || status.method !== 'auto') {
            upsertMealCompletion(slot.id, true, 'auto');
          }
        }
      } else if (status && status.isCompleted && status.method === 'auto') {
        upsertMealCompletion(slot.id, false, 'auto');
      }
    });
  }, [mealPlan, mealCompletions, getMealTotals, upsertMealCompletion]);

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
    // Check if already selected
    const existingChoice = choices.find(
      c => c.meal_slot_id === slotId && c.food_option_id === food.id
    );
    
    if (existingChoice) {
      const existingValue = parseGrams(existingChoice.quantity);
      setGramsInput(existingValue > 0 ? existingValue.toString() : getServingDefault(food.serving_size));
    } else {
      setGramsInput(getServingDefault(food.serving_size));
    }
    
    setSelectedFood({ food, slotId });
  };

  const submitFoodChoice = async () => {
    if (!selectedFood || !gramsInput) return;

    try {
      const today = new Date().toISOString().split('T')[0];
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
            date: new Date().toISOString(),
            quantity: `${gramsInput}g`,
          }),
        });

        if (response.ok) {
          const newChoice = await response.json();
          setChoices([...choices, newChoice]);
        }
      }

      // Refresh macro calculations
      await fetchDailyMacros(today);
      
      // Close dialog
      setSelectedFood(null);
      setGramsInput('');
    } catch (error) {
      console.error('Failed to submit food choice:', error);
    }
  };

  const handleToggleCompletion = (slotId: number, checked: boolean) => {
    upsertMealCompletion(slotId, checked, 'manual');
  };

  const submitCustomFood = async () => {
    if (!customFood.name.trim() || !customFood.calories) return;

    try {
      const today = new Date().toISOString().split('T')[0];
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
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const newChoice = await response.json();
        setChoices([...choices, newChoice]);
        setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
        setShowCustomFoodDialog(false);
        await fetchDailyMacros(today);
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
      const today = new Date().toISOString().split('T')[0];
      await fetchDailyMacros(today);
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
                <span className="sm:hidden">{t('meals.addFood', 'הוסף אוכל')}</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">{showHistory ? t('meals.hideHistory') : t('meals.showHistory')}</span>
                <span className="sm:hidden">{showHistory ? t('meals.hide', 'הסתר') : t('meals.show', 'הצג')}</span>
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
        {/* Daily Macro Progress */}
        {dailyMacros && (
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
                  consumed={dailyMacros.consumed.carbs}
                  target={dailyMacros.targets.carbs}
                  unit="ג"
                  color="rgb(34, 197, 194)"
                />
                <MacroCircle
                  label={t('meals.fat')}
                  consumed={dailyMacros.consumed.fat}
                  target={dailyMacros.targets.fat}
                  unit="ג"
                  color="rgb(168, 85, 247)"
                />
                <MacroCircle
                  label={t('meals.protein')}
                  consumed={dailyMacros.consumed.protein}
                  target={dailyMacros.targets.protein}
                  unit="ג"
                  color="rgb(251, 146, 60)"
                />
              </div>
              
              {/* Calories Summary */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">{t('meals.dailyCalories')}</p>
                  <p className={`text-3xl font-bold ${dailyMacros.consumed.calories > dailyMacros.targets.calories ? 'text-destructive' : 'text-foreground'}`}>
                    {dailyMacros.consumed.calories.toFixed(0)} <span className="text-lg text-muted-foreground">/ {dailyMacros.targets.calories}</span>
                  </p>
                  {dailyMacros.consumed.calories > dailyMacros.targets.calories && (
                    <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Over by {(dailyMacros.consumed.calories - dailyMacros.targets.calories).toFixed(0)} calories
                      </p>
                    </div>
                  )}
                  <Progress 
                    value={Math.min(dailyMacros.percentages.calories, 100)} 
                    className={`mt-3 h-2 ${dailyMacros.consumed.calories > dailyMacros.targets.calories ? 'bg-destructive/20' : ''}`} 
                  />
                  {dailyMacros.percentages.calories > 100 && (
                    <Progress 
                      value={100} 
                      className="mt-1 h-2 bg-destructive/50" 
                    />
                  )}
                </div>
                
                {/* Macro Over Alerts */}
                {(dailyMacros.consumed.protein > dailyMacros.targets.protein ||
                  dailyMacros.consumed.carbs > dailyMacros.targets.carbs ||
                  dailyMacros.consumed.fat > dailyMacros.targets.fat) && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">⚠️ {t('meals.macroLimitsExceeded', 'חרגת ממגבלות המאקרו:')}</p>
                    <div className="space-y-1 text-xs">
                      {dailyMacros.consumed.protein > dailyMacros.targets.protein && (
                        <p className="text-destructive">
                          {t('meals.protein')}: {dailyMacros.consumed.protein.toFixed(0)}ג / {dailyMacros.targets.protein}ג 
                          (+{(dailyMacros.consumed.protein - dailyMacros.targets.protein).toFixed(0)}ג {t('meals.over')})
                        </p>
                      )}
                      {dailyMacros.consumed.carbs > dailyMacros.targets.carbs && (
                        <p className="text-destructive">
                          {t('meals.carbs')}: {dailyMacros.consumed.carbs.toFixed(0)}ג / {dailyMacros.targets.carbs}ג 
                          (+{(dailyMacros.consumed.carbs - dailyMacros.targets.carbs).toFixed(0)}ג {t('meals.over')})
                        </p>
                      )}
                      {dailyMacros.consumed.fat > dailyMacros.targets.fat && (
                        <p className="text-destructive">
                          {t('meals.fat')}: {dailyMacros.consumed.fat.toFixed(0)}ג / {dailyMacros.targets.fat}ג 
                          (+{(dailyMacros.consumed.fat - dailyMacros.targets.fat).toFixed(0)}ג {t('meals.over')})
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
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{choice.custom_protein?.toFixed(0) || 0}ג</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-md border border-cyan-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.carbs')}</span>
                          <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{choice.custom_carbs?.toFixed(0) || 0}ג</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-md border border-purple-500/20">
                          <span className="text-xs text-muted-foreground mb-0.5">{t('meals.fat')}</span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{choice.custom_fat?.toFixed(0) || 0}ג</span>
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
              const caloriesTarget = slot.target_calories ?? null;
              const proteinTarget = slot.target_protein ?? null;
              const carbTarget = slot.target_carbs ?? null;
              const fatTarget = slot.target_fat ?? null;

              const caloriesDelta = caloriesTarget !== null ? caloriesTarget - mealTotals.calories : null;
              const proteinDelta = proteinTarget !== null ? proteinTarget - mealTotals.protein : null;
              const carbDelta = carbTarget !== null ? carbTarget - mealTotals.carbs : null;
              const fatDelta = fatTarget !== null ? fatTarget - mealTotals.fat : null;

              return (
                <AccordionItem key={slot.id} value={`meal-${slot.id}`} className="border rounded-lg">
                  <Card>
                    <AccordionTrigger className="hover:no-underline px-6 py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🍽️</span>
                          <div className="text-left">
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
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-6 pb-4">
                      {slot.notes && (
                        <p className="text-sm text-muted-foreground mb-4 italic">{slot.notes}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('meals.calories')}</p>
                          <p className="text-sm font-semibold">
                            {formatNumber(mealTotals.calories)} {t('mealCreation.unitKcal')}
                            {caloriesTarget ? ` / ${Math.round(caloriesTarget)} ${t('mealCreation.unitKcal')}` : ''}
                          </p>
                          {caloriesDelta !== null && (
                            <p className="text-xs text-muted-foreground">
                              {caloriesDelta >= 0
                                ? `${t('meals.remaining')}: ${Math.round(caloriesDelta)} ${t('mealCreation.unitKcal')}`
                                : t('mealCreation.overBudget', {
                                    amount: Math.abs(Math.round(caloriesDelta)),
                                    unit: t('mealCreation.unitKcal'),
                                  })}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('meals.protein')}</p>
                          <p className="text-sm font-semibold">
                            {formatNumber(mealTotals.protein)} {t('mealCreation.unitGrams')}
                            {proteinTarget ? ` / ${Math.round(proteinTarget)} ${t('mealCreation.unitGrams')}` : ''}
                          </p>
                          {proteinDelta !== null && (
                            <p className="text-xs text-muted-foreground">
                              {proteinDelta >= 0
                                ? `${t('meals.remaining')}: ${Math.round(proteinDelta)} ${t('mealCreation.unitGrams')}`
                                : t('mealCreation.overBudget', {
                                    amount: Math.abs(Math.round(proteinDelta)),
                                    unit: t('mealCreation.unitGrams'),
                                  })}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('meals.carbs')}</p>
                          <p className="text-sm font-semibold">
                            {formatNumber(mealTotals.carbs)} {t('mealCreation.unitGrams')}
                            {carbTarget ? ` / ${Math.round(carbTarget)} ${t('mealCreation.unitGrams')}` : ''}
                          </p>
                          {carbDelta !== null && (
                            <p className="text-xs text-muted-foreground">
                              {carbDelta >= 0
                                ? `${t('meals.remaining')}: ${Math.round(carbDelta)} ${t('mealCreation.unitGrams')}`
                                : t('mealCreation.overBudget', {
                                    amount: Math.abs(Math.round(carbDelta)),
                                    unit: t('mealCreation.unitGrams'),
                                  })}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('meals.fat')}</p>
                          <p className="text-sm font-semibold">
                            {formatNumber(mealTotals.fat)} {t('mealCreation.unitGrams')}
                            {fatTarget ? ` / ${Math.round(fatTarget)} ${t('mealCreation.unitGrams')}` : ''}
                          </p>
                          {fatDelta !== null && (
                            <p className="text-xs text-muted-foreground">
                              {fatDelta >= 0
                                ? `${t('meals.remaining')}: ${Math.round(fatDelta)} ${t('mealCreation.unitGrams')}`
                                : t('mealCreation.overBudget', {
                                    amount: Math.abs(Math.round(fatDelta)),
                                    unit: t('mealCreation.unitGrams'),
                                  })}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Tabs defaultValue={slot.macro_categories[0]?.macro_type || 'protein'} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          {slot.macro_categories.map((category) => (
                            <TabsTrigger key={category.id} value={category.macro_type}>
                              {getMacroIcon(category.macro_type)} {getMacroName(category.macro_type)}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {slot.macro_categories.map((category) => (
                          <TabsContent key={category.id} value={category.macro_type} className="mt-4 space-y-3">
                            {category.quantity_instruction && (
                              <p className="text-sm text-muted-foreground">
                                Target: <span className="font-medium">{category.quantity_instruction}</span>
                              </p>
                            )}
                            
                            {category.food_options.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No food options available for this macro
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {category.food_options.map((option) => {
                                  const isSelected = isFoodOptionSelected(slot.id, option.id);
                                  const selectedChoice = choices.find(
                                    c => c.meal_slot_id === slot.id && c.food_option_id === option.id
                                  );
                                  const recommendedGrams = parseGrams(option.serving_size);
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
                                                {selectedChoice?.quantity || `${Math.round(consumedGrams || 0)}ג`}
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
                                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{option.protein}ג</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-md border border-cyan-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.carbs')}</span>
                                              <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{option.carbs}ג</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-md border border-purple-500/20">
                                              <span className="text-xs text-muted-foreground mb-0.5">{t('meals.fat')}</span>
                                              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{option.fat}ג</span>
                                            </div>
                                          </div>
                                          
                                          {/* Serving Size and Remaining */}
                                          <div className="flex items-center justify-between text-xs">
                                            {recommendedGrams > 0 && (
                                              <span className="text-muted-foreground">
                                                {t('meals.servingSize')}: <span className="font-medium text-foreground">{formatGrams(recommendedGrams)}</span>
                                              </span>
                                            )}
                                            <span className="text-muted-foreground">
                                              {t('meals.remaining')}: <span className="font-medium text-foreground">{Math.max(0, Math.round(remainingGrams))}ג</span>
                                            </span>
                                          </div>
                                        </div>
                                        {consumedGrams > 0 && (
                                          <p className="text-xs text-muted-foreground">
                                            {t('meals.eaten')}: {Math.round(consumedGrams)}ג
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
                  <p className="text-sm text-muted-foreground mb-2">{t('meals.nutritionalInfo', 'מידע תזונתי')} ({t('meals.per', 'ל')} {selectedFood.food.serving_size || '100ג'})</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>{t('meals.calories')}: <span className="font-medium">{selectedFood.food.calories} {t('meals.kcal')}</span></div>
                    <div>{t('meals.protein')}: <span className="font-medium">{selectedFood.food.protein}ג</span></div>
                    <div>{t('meals.carbs')}: <span className="font-medium">{selectedFood.food.carbs}ג</span></div>
                    <div>{t('meals.fat')}: <span className="font-medium">{selectedFood.food.fat}ג</span></div>
                  </div>
                </div>

                {/* Remaining Allowance Info */}
                {hasFiniteLimit && (
                  <div className={`p-3 rounded-lg border ${exceedsLimit ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'}`}>
                    <p className={`text-sm font-medium ${exceedsLimit ? 'text-destructive' : 'text-primary'}`}>
                      {t('meals.remainingDailyAllowance')}: <span className="font-bold">{normalizedRemaining}g</span>
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
                placeholder={t('meals.customFoodNamePlaceholder', 'לדוגמה: נשנוש, פרוסת פיצה וכו\'')}
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
    </div>
  );
};

export default MealMenuV2;



