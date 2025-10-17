import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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

interface MacroCategory {
  macro_type: 'protein' | 'carb' | 'fat';
  quantity_instruction: string;
  food_options: FoodOption[];
}

interface MealSlot {
  name: string;
  time_suggestion: string;
  macro_categories: MacroCategory[];
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

const CreateMealPlanV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const client = location.state?.client;

  const [formData, setFormData] = useState<MealPlanFormData>({
    client_id: client?.id || 0,
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

  // Manually add a new meal slot
  const addMealSlot = () => {
    const newSlot: MealSlot = {
      name: `Meal ${formData.meal_slots.length + 1}`,
      time_suggestion: '',
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
        throw new Error(errorData.detail || 'Failed to create meal plan');
      }

      // Success! Navigate back
      navigate('/trainer-dashboard');
    } catch (error: any) {
      console.error('Failed to create meal plan:', error);
      setError(error.message || 'Failed to create meal plan');
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
            <h1 className="text-3xl font-bold">{t('mealCreation.title')}</h1>
            <p className="text-muted-foreground">{t('mealCreation.subtitle')}</p>
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
            <div>
              <Label htmlFor="name">{t('mealCreation.planTitleRequired')}</Label>
              <Input
                id="name"
                placeholder={t('mealCreation.planTitlePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div>
            <Label htmlFor="description">{t('mealCreation.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('mealCreation.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">{slot.name || `${t('meals.mealName')} ${mealIndex + 1}`}</span>
                      {slot.time_suggestion && (
                        <Badge variant="outline">{slot.time_suggestion}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        ({slot.macro_categories.reduce((sum, m) => sum + m.food_options.length, 0)} {t('mealCreation.foodOptions')})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                      <div>
                        <Label htmlFor={`meal-name-${mealIndex}`}>{t('mealCreation.mealName')}</Label>
                        <Input
                          id={`meal-name-${mealIndex}`}
                          placeholder={t('mealCreation.mealNamePlaceholder')}
                          value={slot.name}
                          onChange={(e) => updateMealSlot(mealIndex, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`meal-time-${mealIndex}`}>{t('dates.time')}</Label>
                        <Input
                          id={`meal-time-${mealIndex}`}
                          type="time"
                          value={slot.time_suggestion}
                          onChange={(e) => updateMealSlot(mealIndex, 'time_suggestion', e.target.value)}
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
                          <div>
                            <Label htmlFor={`quantity-${mealIndex}-${macroIndex}`}>{t('forms.enterValue')}</Label>
                            <Input
                              id={`quantity-${mealIndex}-${macroIndex}`}
                              placeholder="e.g., 150g, 2 pieces, 1 serving"
                              value={macro.quantity_instruction}
                              onChange={(e) => updateMacroCategory(mealIndex, macroIndex, 'quantity_instruction', e.target.value)}
                            />
                          </div>

                          {/* Food Options */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Label>{t('mealCreation.foodOptions')} ({macro.food_options.length})</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addFoodOption(mealIndex, macroIndex)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {t('mealCreation.addFoodOption')}
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
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label>{t('mealCreation.optionName')}</Label>
                                      <Input
                                        placeholder="e.g., Chicken Breast"
                                        value={food.name}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'name', e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <Label>{t('mealCreation.optionName')}</Label>
                                      <Input
                                        placeholder="e.g., חזה עוף"
                                        value={food.name_hebrew}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'name_hebrew', e.target.value)}
                                        dir="rtl"
                                      />
                                    </div>

                                    <div>
                                      <Label>{t('meals.servingSize')}</Label>
                                      <Input
                                        placeholder="e.g., 100g, 1 piece"
                                        value={food.serving_size}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'serving_size', e.target.value)}
                                      />
                                    </div>

                                    <div>
                                      <Label>{t('meals.calories')}</Label>
                                      <Input
                                        type="number"
                                        placeholder="165"
                                        value={food.calories || ''}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'calories', parseInt(e.target.value) || null)}
                                      />
                                    </div>

                                    <div>
                                      <Label>{t('meals.protein')}</Label>
                                      <Input
                                        type="number"
                                        placeholder="31"
                                        value={food.protein || ''}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'protein', parseFloat(e.target.value) || null)}
                                      />
                                    </div>

                                    <div>
                                      <Label>{t('meals.carbs')}</Label>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        value={food.carbs || ''}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'carbs', parseFloat(e.target.value) || null)}
                                      />
                                    </div>

                                    <div>
                                      <Label>{t('meals.fats')}</Label>
                                      <Input
                                        type="number"
                                        placeholder="3.6"
                                        value={food.fat || ''}
                                        onChange={(e) => updateFoodOption(mealIndex, macroIndex, foodIndex, 'fat', parseFloat(e.target.value) || null)}
                                      />
                                    </div>

                                    <div className="flex items-end">
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeFoodOption(mealIndex, macroIndex, foodIndex)}
                                        className="w-full"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('mealCreation.removeOption')}
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
          {loading ? t('mealCreation.creating') : t('mealCreation.createMealPlan')}
        </Button>
      </div>
    </div>
  );
};

export default CreateMealPlanV2;

