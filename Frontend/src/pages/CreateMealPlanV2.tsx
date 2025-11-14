import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface FoodOption {
  name: string;
  name_hebrew: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_size: string;
}

interface MealBankItem {
  id: number;
  name: string;
  name_hebrew: string;
  macro_type: 'protein' | 'carb' | 'fat';
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_size?: string | null;
}

interface MacroCategory {
  macro_type: 'protein' | 'carb' | 'fat';
  quantity_instruction: string;
  food_options: FoodOption[];
}

interface MealSlot {
  name: string;
  time_suggestion: string;
  macro_categories: MacroCategory[];
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
}

interface MealPlanFormData {
  client_id: number;
  name: string;
  description: string;
  number_of_meals: number;
  total_calories: number | null;
  protein_target: number | null;
  carb_target: number | null;
  fat_target: number | null;
  meal_slots: MealSlot[];
}

const sanitizeServingSize = (value: string | number | null | undefined): string => {
  if (value === undefined || value === null) {
    return '';
  }

  const numericMatch = String(value).match(/[\d.,]+/);
  if (!numericMatch) {
    return '';
  }

  const normalized = numericMatch[0].replace(',', '.');
  const parsed = parseFloat(normalized);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return '';
  }

  return parsed.toString();
};

const getServingOrDefault = (
  value: string | number | null | undefined,
  fallback: string
): string => {
  const sanitized = sanitizeServingSize(value);
  return sanitized || fallback;
};

const parseNumericValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const match = value.match(/[\d.,]+/);
    if (!match) return 0;
    const normalized = match[0].replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeMacroType = (value: string): 'protein' | 'carb' | 'fat' => {
  const normalized = (value ?? '').toString().toLowerCase();
  if (normalized.includes('carb')) return 'carb';
  if (normalized.includes('fat')) return 'fat';
  return 'protein';
};

const normalizeMealBankItem = (
  item: MealBankItem & { macro_type: string }
): MealBankItem => ({
  ...item,
  macro_type: normalizeMacroType(item.macro_type),
});

const CreateMealPlanV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const existingMealPlan: any = location.state?.mealPlan;
  const client: any = location.state?.client;
  const initialClientId = client?.id ?? existingMealPlan?.client_id ?? 0;

  const [isEditing, setIsEditing] = useState<boolean>(Boolean(existingMealPlan));

  const [formData, setFormData] = useState<MealPlanFormData>({
    client_id: initialClientId,
    name: '',
    description: '',
    number_of_meals: 0,
    total_calories: null,
    protein_target: null,
    carb_target: null,
    fat_target: null,
    meal_slots: [],
  });

  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMealBank, setShowMealBank] = useState(false);
  const [currentMealIndex, setCurrentMealIndex] = useState<number | null>(null);
  const [currentMacroIndex, setCurrentMacroIndex] = useState<number | null>(null);
  const [mealBankItems, setMealBankItems] = useState<MealBankItem[]>([]);
  const [mealBankSearch, setMealBankSearch] = useState('');
  const [mealBankFilter, setMealBankFilter] = useState<'protein' | 'carb' | 'fat' | 'all'>('all');
  const [selectedMealBankItem, setSelectedMealBankItem] = useState<MealBankItem | null>(null);
  const [recommendedQuantity, setRecommendedQuantity] = useState('100');
  const [showAddFoodDialog, setShowAddFoodDialog] = useState(false);
  const [newFoodItem, setNewFoodItem] = useState({
    name: '',
    name_hebrew: '',
    macro_type: 'protein' as 'protein' | 'carb' | 'fat',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    is_public: false
  });
  const [addingFood, setAddingFood] = useState(false);

  const toNumber = (value: number | null | undefined): number =>
    typeof value === 'number' && !Number.isNaN(value) ? value : 0;

  const mealTargetSums = useMemo(
    () =>
      formData.meal_slots.reduce(
        (acc, slot) => ({
          calories: acc.calories + toNumber(slot.target_calories),
          protein: acc.protein + toNumber(slot.target_protein),
          carbs: acc.carbs + toNumber(slot.target_carbs),
          fat: acc.fat + toNumber(slot.target_fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [formData.meal_slots]
  );

  const mealPlanNutritionTotals = useMemo(
    () =>
      formData.meal_slots.reduce(
        (slotTotals, slot) => {
          slot.macro_categories.forEach((category) => {
            const recommendedCandidates = category.food_options
              .map((option) => parseNumericValue(option.serving_size ?? category.quantity_instruction))
              .filter((value) => value > 0);

            const fallbackQuantity = parseNumericValue(category.quantity_instruction);
            const recommendedGrams =
              recommendedCandidates.length > 0
                ? Math.max(...recommendedCandidates)
                : fallbackQuantity;

            if (!recommendedGrams || !Number.isFinite(recommendedGrams)) {
              return;
            }

            const categoryTotals = category.food_options.reduce(
              (macroTotals, option) => {
                const baseServing = parseNumericValue(option.serving_size) || 100;
                if (!baseServing || !Number.isFinite(baseServing)) {
                  return macroTotals;
                }

                const caloriesPerGram = toNumber(option.calories) / baseServing;
                const proteinPerGram = toNumber(option.protein) / baseServing;
                const carbsPerGram = toNumber(option.carbs) / baseServing;
                const fatPerGram = toNumber(option.fat) / baseServing;

                return {
                  calories: Math.max(macroTotals.calories, caloriesPerGram * recommendedGrams),
                  protein: Math.max(macroTotals.protein, proteinPerGram * recommendedGrams),
                  carbs: Math.max(macroTotals.carbs, carbsPerGram * recommendedGrams),
                  fat: Math.max(macroTotals.fat, fatPerGram * recommendedGrams),
                };
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            slotTotals.calories += categoryTotals.calories;
            slotTotals.protein += categoryTotals.protein;
            slotTotals.carbs += categoryTotals.carbs;
            slotTotals.fat += categoryTotals.fat;
          });

          return slotTotals;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [formData.meal_slots]
  );

  const renderBudgetRow = (
    label: string,
    mealTotal: number,
    planValue: number | null,
    unitLabel: string
  ): JSX.Element => {
    const roundedTotal = Math.round(mealTotal);

    if (!planValue || planValue <= 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {label}: {roundedTotal} {unitLabel}
        </p>
      );
    }

    const diff = mealTotal - planValue;
    const roundedDiff = Math.abs(Math.round(diff));

    if (diff > 0) {
      return (
        <p className="text-sm text-destructive">
          {label}: {roundedTotal} {unitLabel} — {t('mealCreation.overBudget', { amount: roundedDiff, unit: unitLabel })}
        </p>
      );
    }

    if (diff < 0) {
      return (
        <p className="text-sm text-amber-500">
          {label}: {roundedTotal} {unitLabel} — {t('mealCreation.underBudget', { amount: roundedDiff, unit: unitLabel })}
        </p>
      );
    }

    return (
      <p className="text-sm text-emerald-500">
        {label}: {roundedTotal} {unitLabel} — {t('mealCreation.onBudget')}
      </p>
    );
  };

  const renderCalculatedRow = (
    label: string,
    mealTotal: number,
    planValue: number | null,
    unitLabel: string
  ): JSX.Element => {
    if (!planValue || planValue <= 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {label}: {Math.round(mealTotal)} {unitLabel} — {t('mealCreation.setTargetsHint')}
        </p>
      );
    }

    return renderBudgetRow(label, mealTotal, planValue, unitLabel);
  };

  useEffect(() => {
    if (existingMealPlan) {
      const toMacroType = (value: any): 'protein' | 'carb' | 'fat' => {
        const normalized = (value ?? '').toString().toLowerCase();
        if (normalized === 'protein' || normalized === 'carb' || normalized === 'fat') {
          return normalized;
        }
        return 'protein';
      };

      const normalizedSlots = (existingMealPlan.meal_slots || []).map((slot: any) => ({
        name: slot.name || '',
        time_suggestion: slot.time_suggestion || '',
        target_calories: slot.target_calories ?? null,
        target_protein: slot.target_protein ?? null,
        target_carbs: slot.target_carbs ?? null,
        target_fat: slot.target_fat ?? null,
        macro_categories: (slot.macro_categories || []).map((macro: any) => ({
          macro_type: toMacroType(
            typeof macro.macro_type === 'string' ? macro.macro_type : macro.macro_type?.value
          ),
          quantity_instruction: macro.quantity_instruction || '',
          food_options: (macro.food_options || []).map((food: any) => ({
            name: food.name || food.name_hebrew || '',
            name_hebrew: food.name_hebrew || '',
            calories: food.calories ?? null,
            protein: food.protein ?? null,
            carbs: food.carbs ?? null,
            fat: food.fat ?? null,
            serving_size: sanitizeServingSize(food.serving_size),
          })),
        })),
      }));

      setFormData({
        client_id: existingMealPlan.client_id,
        name: existingMealPlan.name || existingMealPlan.title || '',
        description: existingMealPlan.description || '',
        number_of_meals:
          existingMealPlan.number_of_meals ?? normalizedSlots.length,
        total_calories: existingMealPlan.total_calories ?? null,
        protein_target: existingMealPlan.protein_target ?? null,
        carb_target: existingMealPlan.carb_target ?? null,
        fat_target: existingMealPlan.fat_target ?? null,
        meal_slots: normalizedSlots,
      });

      setIsEditing(true);
    }
  }, [existingMealPlan]);

  // Role-based access control
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Fetch clients if not passed via state
  useEffect(() => {
    if (!client && user?.role === 'TRAINER') {
      fetchClients();
    }
  }, [client, user]);

  // Fetch meal bank items when dialog opens
  useEffect(() => {
    if (showMealBank) {
      fetchMealBankItems();
    }
  }, [showMealBank, mealBankFilter]);

  const fetchMealBankItems = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const macroTypeParam = mealBankFilter !== 'all' ? `&macro_type=${mealBankFilter}` : '';
      const response = await fetch(`${API_BASE_URL}/v2/meals/meal-bank?include_public=true${macroTypeParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedItems = (data as Array<MealBankItem & { macro_type: string }>).map(
          (item) => normalizeMealBankItem(item)
        );
        setMealBankItems(normalizedItems);
      }
    } catch (error) {
      console.error('Failed to fetch meal bank items:', error);
    }
  };

  const openMealBank = (mealIndex: number, macroIndex: number) => {
    setCurrentMealIndex(mealIndex);
    setCurrentMacroIndex(macroIndex);
    // Set filter to match the macro type of the current category
    const macroType = formData.meal_slots[mealIndex].macro_categories[macroIndex].macro_type;
    setMealBankFilter(macroType);
    setMealBankSearch('');
    setSelectedMealBankItem(null);
    setRecommendedQuantity('100');
    // Set default macro type for new food item
    setNewFoodItem({
      name: '',
      name_hebrew: '',
      macro_type: macroType,
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      is_public: false
    });
    setShowMealBank(true);
  };

  const selectMealBankItem = (item: MealBankItem) => {
    const normalizedItem = normalizeMealBankItem(item as MealBankItem & { macro_type: string });
    setSelectedMealBankItem(normalizedItem);
    setRecommendedQuantity(getServingOrDefault(item.serving_size, '100'));
  };

  const confirmMealBankSelection = () => {
    if (!selectedMealBankItem || currentMealIndex === null || currentMacroIndex === null) return;
    
    const newSlots = [...formData.meal_slots];
    newSlots[currentMealIndex].macro_categories[currentMacroIndex].food_options.push({
      name: selectedMealBankItem.name || selectedMealBankItem.name_hebrew,
      name_hebrew: selectedMealBankItem.name_hebrew,
      calories: selectedMealBankItem.calories,
      protein: selectedMealBankItem.protein,
      carbs: selectedMealBankItem.carbs,
      fat: selectedMealBankItem.fat,
      serving_size: sanitizeServingSize(recommendedQuantity) || '',
    });
    setFormData({ ...formData, meal_slots: newSlots });
    setShowMealBank(false);
    setSelectedMealBankItem(null);
  };

  const handleAddFoodToBank = async () => {
    const trimmedName = newFoodItem.name.trim();
    const trimmedHebrewName = newFoodItem.name_hebrew.trim();

    if (!trimmedName && !trimmedHebrewName) {
      alert(t('foodBank.nameRequired'));
      return;
    }

    setAddingFood(true);
    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        name: trimmedName || trimmedHebrewName,
        name_hebrew: trimmedHebrewName || undefined,
        macro_type: newFoodItem.macro_type,
        calories: newFoodItem.calories ? parseInt(newFoodItem.calories) : null,
        protein: newFoodItem.protein ? parseFloat(newFoodItem.protein) : null,
        carbs: newFoodItem.carbs ? parseFloat(newFoodItem.carbs) : null,
        fat: newFoodItem.fat ? parseFloat(newFoodItem.fat) : null,
        is_public: newFoodItem.is_public
      };

      const response = await fetch(`${API_BASE_URL}/v2/meals/meal-bank`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const createdItem = await response.json();
        const normalizedCreatedItem = normalizeMealBankItem(
          createdItem as MealBankItem & { macro_type: string }
        );
        // Refresh meal bank items
        await fetchMealBankItems();
        // Auto-select the newly created item
        setSelectedMealBankItem(normalizedCreatedItem);
        // Set macro filter to match the new item
        setMealBankFilter(normalizedCreatedItem.macro_type);
        // Reset form
        setNewFoodItem({
          name: '',
          name_hebrew: '',
          macro_type: currentMacroIndex !== null && formData.meal_slots[currentMealIndex || 0] 
            ? formData.meal_slots[currentMealIndex || 0].macro_categories[currentMacroIndex].macro_type
            : 'protein',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          is_public: false
        });
        setShowAddFoodDialog(false);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to add food item');
      }
    } catch (error) {
      console.error('Error adding food to bank:', error);
      alert('Failed to add food item');
    } finally {
      setAddingFood(false);
    }
  };

  const resetAddFoodForm = () => {
    setNewFoodItem({
      name: '',
      name_hebrew: '',
      macro_type: currentMacroIndex !== null && formData.meal_slots[currentMealIndex || 0] 
        ? formData.meal_slots[currentMealIndex || 0].macro_categories[currentMacroIndex].macro_type
        : 'protein',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      is_public: false
    });
  };

  // Filter meal bank items based on search and macro type
  const filteredMealBankItems = mealBankItems.filter(item => {
    const normalizedEnglish = item.name?.toLowerCase() ?? '';
    const normalizedHebrew = item.name_hebrew?.toLowerCase() ?? '';
    const searchTermLower = mealBankSearch.toLowerCase();

    const matchesSearch = !mealBankSearch || 
      normalizedEnglish.includes(searchTermLower) ||
      normalizedHebrew.includes(searchTermLower);
    const matchesMacro = mealBankFilter === 'all' || item.macro_type === mealBankFilter;
    return matchesSearch && matchesMacro;
  });

  // Manually add a new meal slot
  const addMealSlot = () => {
    const newSlot: MealSlot = {
      name: `Meal ${formData.meal_slots.length + 1}`,
      time_suggestion: '',
      target_calories: null,
      target_protein: null,
      target_carbs: null,
      target_fat: null,
      macro_categories: [
        { macro_type: 'protein', quantity_instruction: '', food_options: [] },
        { macro_type: 'carb', quantity_instruction: '', food_options: [] },
        { macro_type: 'fat', quantity_instruction: '', food_options: [] },
      ],
    };
    setFormData(prev => ({
      ...prev,
      number_of_meals: prev.number_of_meals + 1,
      meal_slots: [...prev.meal_slots, newSlot],
    }));
  };

  // Remove a meal slot
  const removeMealSlot = (mealIndex: number) => {
    const newSlots = [...formData.meal_slots];
    newSlots.splice(mealIndex, 1);
    setFormData(prev => ({
      ...prev,
      number_of_meals: prev.number_of_meals - 1,
      meal_slots: newSlots,
    }));
  };

  const fetchClients = async () => {
    try {
         const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      const fallbackError = isEditing ? t('mealCreation.errorUpdating') : t('mealCreation.errorCreating');
      const response = await fetch(`${API_BASE_URL}/v2/meals/plans/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || fallbackError);
      }

      // Success! Navigate back
      navigate('/trainer-dashboard');
    } catch (error: any) {
      console.error(isEditing ? 'Failed to update meal plan:' : 'Failed to create meal plan:', error);
      const fallbackError = isEditing ? t('mealCreation.errorUpdating') : t('mealCreation.errorCreating');
      setError(error.message || fallbackError);
    } finally {
      setLoading(false);
    }
  };

  const addFoodOption = (mealIndex: number, macroIndex: number) => {
    const newSlots = [...formData.meal_slots];
    newSlots[mealIndex].macro_categories[macroIndex].food_options.push({
      name: '',
      name_hebrew: '',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      serving_size: '',
    });
    setFormData({ ...formData, meal_slots: newSlots });
  };

  const updateFoodOption = (mealIndex: number, macroIndex: number, foodIndex: number, field: keyof FoodOption, value: any) => {
    const newSlots = [...formData.meal_slots];
    newSlots[mealIndex].macro_categories[macroIndex].food_options[foodIndex][field] = value;
    setFormData({ ...formData, meal_slots: newSlots });
  };

  const removeFoodOption = (mealIndex: number, macroIndex: number, foodIndex: number) => {
    const newSlots = [...formData.meal_slots];
    newSlots[mealIndex].macro_categories[macroIndex].food_options.splice(foodIndex, 1);
    setFormData({ ...formData, meal_slots: newSlots });
  };

  const updateMealSlot = (mealIndex: number, field: keyof MealSlot, value: any) => {
    const newSlots = [...formData.meal_slots];
    newSlots[mealIndex][field] = value;
    setFormData({ ...formData, meal_slots: newSlots });
  };

  const updateMacroCategory = (mealIndex: number, macroIndex: number, field: string, value: any) => {
    const newSlots = [...formData.meal_slots];
    newSlots[mealIndex].macro_categories[macroIndex][field] = value;
    setFormData({ ...formData, meal_slots: newSlots });
  };

  const getMacroIcon = (type: string) => {
    switch (type) {
      case 'protein': return '🍗';
      case 'carb': return '🍞';
      case 'fat': return '🥑';
      default: return '🍴';
    }
  };

  const getMacroLabel = (type: string) => {
    switch (type) {
      case 'protein': return 'חלבון (Protein)';
      case 'carb': return 'פחמימה (Carb)';
      case 'fat': return 'שומן (Fat)';
      default: return type;
    }
  };

  const isFormValid = () => {
    return (
      formData.client_id > 0 &&
      formData.name.trim() !== '' &&
      formData.number_of_meals >= 1 &&
      formData.meal_slots.length >= 1 &&
      formData.meal_slots.every(slot => slot.name.trim() !== '')
    );
  };

  const pageTitle = isEditing ? t('mealCreation.updateMealPlan') : t('mealCreation.title');
  const pageSubtitle = t('mealCreation.subtitle');
  const primaryButtonLabel = isEditing ? t('mealCreation.updateMealPlan') : t('mealCreation.createMealPlan');
  const primaryButtonLoadingLabel = isEditing ? t('mealCreation.updating') : t('mealCreation.creating');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('mealCreation.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('mealCreation.planTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Selection */}
          {!client && (
            <div>
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
              >
                <option value={0}>Select client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          {client && (
            <div className="p-4 bg-muted rounded-md">
              <Label>Client</Label>
              <p className="font-semibold">{client.full_name}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0 w-full">
              <Label htmlFor="name">{t('mealCreation.planTitleRequired')}</Label>
              <Input
                id="name"
                placeholder={t('mealCreation.planTitlePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full max-w-full"
                dir="auto"
              />
            </div>

            <div>
              <Label>{t('mealCreation.meals')}</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={formData.number_of_meals}
                  readOnly
                  className="bg-muted"
                />
                <span className="text-sm text-muted-foreground">{t('meals.meals')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('meals.addMeal')}</p>
            </div>
          </div>

          <div className="min-w-0 w-full">
            <Label htmlFor="description">{t('mealCreation.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('mealCreation.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full max-w-full"
              dir="auto"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="total_calories">{t('mealCreation.targetCalories')}</Label>
              <Input
                id="total_calories"
                type="number"
                placeholder="2000"
                value={formData.total_calories || ''}
                onChange={(e) => setFormData({ ...formData, total_calories: parseInt(e.target.value) || null })}
              />
            </div>
            <div>
              <Label htmlFor="protein_target">{t('mealCreation.proteinTarget')}</Label>
              <Input
                id="protein_target"
                type="number"
                placeholder="180"
                value={formData.protein_target || ''}
                onChange={(e) => setFormData({ ...formData, protein_target: parseInt(e.target.value) || null })}
              />
            </div>
            <div>
              <Label htmlFor="carb_target">{t('mealCreation.carbTarget')}</Label>
              <Input
                id="carb_target"
                type="number"
                placeholder="150"
                value={formData.carb_target || ''}
                onChange={(e) => setFormData({ ...formData, carb_target: parseInt(e.target.value) || null })}
              />
            </div>
            <div>
              <Label htmlFor="fat_target">{t('mealCreation.fatTarget')}</Label>
              <Input
                id="fat_target"
                type="number"
                placeholder="50"
                value={formData.fat_target || ''}
                onChange={(e) => setFormData({ ...formData, fat_target: parseInt(e.target.value) || null })}
              />
            </div>
          </div>

          {Object.values(mealPlanNutritionTotals).some((value) => value > 0) && (
            <div className="mt-4 space-y-1 rounded-md bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('mealCreation.calculatedMacrosHeader')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('mealCreation.calculatedMacrosDescription')}
              </p>
              {renderCalculatedRow(
                t('mealCreation.targetCalories'),
                mealPlanNutritionTotals.calories,
                formData.total_calories,
                t('mealCreation.unitKcal')
              )}
              {renderCalculatedRow(
                t('mealCreation.proteinTarget'),
                mealPlanNutritionTotals.protein,
                formData.protein_target,
                t('mealCreation.unitGrams')
              )}
              {renderCalculatedRow(
                t('mealCreation.carbTarget'),
                mealPlanNutritionTotals.carbs,
                formData.carb_target,
                t('mealCreation.unitGrams')
              )}
              {renderCalculatedRow(
                t('mealCreation.fatTarget'),
                mealPlanNutritionTotals.fat,
                formData.fat_target,
                t('mealCreation.unitGrams')
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal Slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('meals.meals')} ({formData.number_of_meals})</CardTitle>
            <Button
              onClick={addMealSlot}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('mealCreation.addMeal')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {formData.meal_slots.map((slot, mealIndex) => (
              <AccordionItem key={mealIndex} value={`meal-${mealIndex}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <span className="font-semibold truncate">{slot.name || `${t('meals.mealName')} ${mealIndex + 1}`}</span>
                      {slot.time_suggestion && (
                        <Badge variant="outline" className="flex-shrink-0">{slot.time_suggestion}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        ({slot.macro_categories.reduce((sum, m) => sum + m.food_options.length, 0)} {t('mealCreation.foodOptions')})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMealSlot(mealIndex);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Meal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="min-w-0 w-full">
                        <Label htmlFor={`meal-name-${mealIndex}`}>{t('mealCreation.mealName')}</Label>
                        <Input
                          id={`meal-name-${mealIndex}`}
                          placeholder={t('mealCreation.mealNamePlaceholder')}
                          value={slot.name}
                          onChange={(e) => updateMealSlot(mealIndex, 'name', e.target.value)}
                          className="w-full max-w-full"
                          dir="auto"
                        />
                      </div>
                      <div className="min-w-0 w-full">
                        <Label htmlFor={`meal-time-${mealIndex}`}>{t('dates.time')}</Label>
                        <Input
                          id={`meal-time-${mealIndex}`}
                          type="time"
                          value={slot.time_suggestion}
                          onChange={(e) => updateMealSlot(mealIndex, 'time_suggestion', e.target.value)}
                          className="w-full max-w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>{t('mealCreation.mealCaloriesTarget')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={slot.target_calories ?? ''}
                          onChange={(e) =>
                            updateMealSlot(
                              mealIndex,
                              'target_calories',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          placeholder="e.g., 500"
                        />
                      </div>
                      <div>
                        <Label>{t('mealCreation.mealProteinTarget')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={slot.target_protein ?? ''}
                          onChange={(e) =>
                            updateMealSlot(
                              mealIndex,
                              'target_protein',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          placeholder="e.g., 40"
                        />
                      </div>
                      <div>
                        <Label>{t('mealCreation.mealCarbTarget')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={slot.target_carbs ?? ''}
                          onChange={(e) =>
                            updateMealSlot(
                              mealIndex,
                              'target_carbs',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          placeholder="e.g., 50"
                        />
                      </div>
                      <div>
                        <Label>{t('mealCreation.mealFatTarget')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={slot.target_fat ?? ''}
                          onChange={(e) =>
                            updateMealSlot(
                              mealIndex,
                              'target_fat',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          placeholder="e.g., 15"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* 3 Macro Tabs */}
                    <Tabs defaultValue="protein" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        {slot.macro_categories.map((macro, macroIndex) => (
                          <TabsTrigger key={macro.macro_type} value={macro.macro_type}>
                            {getMacroIcon(macro.macro_type)} {getMacroLabel(macro.macro_type)}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {slot.macro_categories.map((macro, macroIndex) => (
                        <TabsContent key={macro.macro_type} value={macro.macro_type} className="space-y-4">
                          {/* Macro Instructions */}
                          <div className="min-w-0 w-full">
                            <Label htmlFor={`quantity-${mealIndex}-${macroIndex}`}>{t('forms.enterValue')}</Label>
                            <Input
                              id={`quantity-${mealIndex}-${macroIndex}`}
                              placeholder="e.g., 150g, 2 pieces, 1 serving"
                              value={macro.quantity_instruction}
                              onChange={(e) => updateMacroCategory(mealIndex, macroIndex, 'quantity_instruction', e.target.value)}
                              className="w-full max-w-full"
                              dir="auto"
                            />
                          </div>

                          {/* Food Options */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Label>{t('mealCreation.foodOptions')} ({macro.food_options.length})</Label>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openMealBank(mealIndex, macroIndex)}
                              >
                                <Search className="h-4 w-4 mr-2" />
                                Add from Meal Bank
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {macro.food_options.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded">
                                  {t('mealCreation.addFoodOption')}
                                </p>
                              )}

                              {macro.food_options.map((food, foodIndex) => (
                                <Card key={foodIndex} className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                          {macro.macro_type === 'protein' && '🍗'}
                                          {macro.macro_type === 'carb' && '🍞'}
                                          {macro.macro_type === 'fat' && '🥑'}
                                        </div>
                                        <div>
                                          <div className="font-semibold">{food.name_hebrew || food.name}</div>
                                          {food.name_hebrew && food.name && (
                                            <div className="text-sm text-muted-foreground" dir="rtl">
                                              {food.name_hebrew}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2 text-sm">
                                        <div className="text-center p-2 bg-secondary/50 rounded">
                                          <div className="font-medium">{food.calories || 0}</div>
                                          <div className="text-xs text-muted-foreground">kcal</div>
                                        </div>
                                        <div className="text-center p-2 bg-secondary/50 rounded">
                                          <div className="font-medium">{food.protein || 0}</div>
                                          <div className="text-xs text-muted-foreground">protein</div>
                                        </div>
                                        <div className="text-center p-2 bg-secondary/50 rounded">
                                          <div className="font-medium">{food.carbs || 0}</div>
                                          <div className="text-xs text-muted-foreground">carbs</div>
                                        </div>
                                        <div className="text-center p-2 bg-secondary/50 rounded">
                                          <div className="font-medium">{food.fat || 0}</div>
                                          <div className="text-xs text-muted-foreground">fat</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-3 min-w-0 w-full">
                                      <div className="min-w-0 w-full">
                    <Label>Recommended Quantity (g)</Label>
                                        <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g., 150"
                                          value={food.serving_size}
                                          onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'serving_size', e.target.value)}
                                          className="w-full max-w-full"
                                          dir="auto"
                                        />
                                      </div>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeFoodOption(mealIndex, macroIndex, foodIndex)}
                                        className="w-full"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {formData.meal_slots.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{t('meals.addMeal')}</p>
              <Button onClick={addMealSlot} variant="outline" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                {t('meals.addMeal')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid() || loading}
          className="gradient-green"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? primaryButtonLoadingLabel : primaryButtonLabel}
        </Button>
      </div>

      {/* Meal Bank Dialog */}
      <Dialog open={showMealBank} onOpenChange={setShowMealBank}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meal Bank - Select Food Options</DialogTitle>
            <DialogDescription>
              Choose from the meal bank to add common food items to your meal plan
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for food items..."
                  value={mealBankSearch}
                  onChange={(e) => setMealBankSearch(e.target.value)}
                  className="pl-10 w-full max-w-full"
                  dir="auto"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={mealBankFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMealBankFilter('all')}
              >
                All
              </Button>
              <Button
                variant={mealBankFilter === 'protein' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMealBankFilter('protein')}
              >
                🍗 Protein
              </Button>
              <Button
                variant={mealBankFilter === 'carb' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMealBankFilter('carb')}
              >
                🍞 Carb
              </Button>
              <Button
                variant={mealBankFilter === 'fat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMealBankFilter('fat')}
              >
                🥑 Fat
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddFoodDialog(true)}
                className="gradient-green"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Food
              </Button>
            </div>
          </div>

          {/* Meal Bank Items List */}
          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
            {filteredMealBankItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No meal bank items found. Try a different search or filter.
              </div>
            ) : (
              filteredMealBankItems.map((item) => (
                <Card
                  key={item.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    selectedMealBankItem?.id === item.id ? 'border-primary border-2' : ''
                  }`}
                  onClick={() => selectMealBankItem(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {item.macro_type === 'protein' && '🍗'}
                        {item.macro_type === 'carb' && '🍞'}
                        {item.macro_type === 'fat' && '🥑'}
                      </div>
                      <div>
                        <div className="font-semibold">{item.name_hebrew || item.name}</div>
                        {item.name_hebrew && item.name && (
                          <div className="text-sm text-muted-foreground" dir="rtl">
                            {item.name_hebrew}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {item.calories !== null && item.calories !== undefined ? `${item.calories} kcal` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.protein !== null && `${item.protein}g P`} /{' '}
                          {item.carbs !== null && `${item.carbs}g C`} /{' '}
                          {item.fat !== null && `${item.fat}g F`}
                        </div>
                      </div>
                      {selectedMealBankItem?.id === item.id ? (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground" />
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Selected Item with Quantity Input */}
          {selectedMealBankItem && (
            <div className="mt-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-lg">{selectedMealBankItem.name_hebrew || selectedMealBankItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMealBankItem.calories} kcal per 100g
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0 w-full">
                <Label htmlFor="recommended-quantity">Recommended Quantity (g)</Label>
                  <Input
                    id="recommended-quantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 150"
                    value={recommendedQuantity}
                    onChange={(e) => setRecommendedQuantity(e.target.value)}
                    className="w-full max-w-full"
                    dir="auto"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={confirmMealBankSelection}
                    className="w-full"
                    disabled={!recommendedQuantity.trim()}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Add to Meal Plan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Food to Bank Dialog */}
      <Dialog open={showAddFoodDialog} onOpenChange={(open) => {
        setShowAddFoodDialog(open);
        if (!open) resetAddFoodForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Food to Meal Bank</DialogTitle>
            <DialogDescription>
              Add a new food item to your meal bank for future use
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-food-macro-type">Macro Type *</Label>
              <select
                id="new-food-macro-type"
                value={newFoodItem.macro_type}
                onChange={(e) => setNewFoodItem({ ...newFoodItem, macro_type: e.target.value as 'protein' | 'carb' | 'fat' })}
                className="w-full px-3 py-2 border rounded-md min-w-0"
                required
              >
                <option value="protein">🍗 Protein</option>
                <option value="carb">🍞 Carb</option>
                <option value="fat">🥑 Fat</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-food-name">Food Name</Label>
              <Input
                id="new-food-name"
                placeholder="e.g., Chicken Breast"
                value={newFoodItem.name}
                onChange={(e) => setNewFoodItem({ ...newFoodItem, name: e.target.value })}
                className="w-full max-w-full"
                dir="auto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-food-name-hebrew">Food Name (Hebrew) *</Label>
              <Input
                id="new-food-name-hebrew"
                placeholder="למשל, חזה עוף"
                value={newFoodItem.name_hebrew}
                onChange={(e) => setNewFoodItem({ ...newFoodItem, name_hebrew: e.target.value })}
                className="w-full max-w-full"
                dir="rtl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="new-food-calories">Calories (per 100g)</Label>
                <Input
                  id="new-food-calories"
                  type="number"
                  placeholder="165"
                  value={newFoodItem.calories}
                  onChange={(e) => setNewFoodItem({ ...newFoodItem, calories: e.target.value })}
                  className="w-full max-w-full"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="new-food-protein">Protein (g per 100g)</Label>
                <Input
                  id="new-food-protein"
                  type="number"
                  step="0.1"
                  placeholder="31"
                  value={newFoodItem.protein}
                  onChange={(e) => setNewFoodItem({ ...newFoodItem, protein: e.target.value })}
                  className="w-full max-w-full"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="new-food-carbs">Carbs (g per 100g)</Label>
                <Input
                  id="new-food-carbs"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={newFoodItem.carbs}
                  onChange={(e) => setNewFoodItem({ ...newFoodItem, carbs: e.target.value })}
                  className="w-full max-w-full"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="new-food-fat">Fat (g per 100g)</Label>
                <Input
                  id="new-food-fat"
                  type="number"
                  step="0.1"
                  placeholder="3.6"
                  value={newFoodItem.fat}
                  onChange={(e) => setNewFoodItem({ ...newFoodItem, fat: e.target.value })}
                  className="w-full max-w-full"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-food-public"
                checked={newFoodItem.is_public}
                onChange={(e) => setNewFoodItem({ ...newFoodItem, is_public: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="new-food-public">Make this food item public (visible to all trainers)</Label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddFoodDialog(false);
                  resetAddFoodForm();
                }}
                disabled={addingFood}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFoodToBank}
                className="flex-1 gradient-green"
                disabled={!(newFoodItem.name.trim() || newFoodItem.name_hebrew.trim()) || addingFood}
              >
                {addingFood ? 'Adding...' : 'Add to Meal Bank'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateMealPlanV2;

