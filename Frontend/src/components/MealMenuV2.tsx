import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Check, Clock, Utensils, Flame, Apple, Camera, TrendingUp, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import MacroCircle from './MacroCircle';
import MealHistory from './MealHistory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
  food_option_id: number;
  meal_slot_id: number;
  date: string;
  quantity?: string;
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

const MealMenuV2 = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [choices, setChoices] = useState<ClientMealChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dailyMacros, setDailyMacros] = useState<DailyMacros | null>(null);
  const [selectedFood, setSelectedFood] = useState<{food: FoodOption, slotId: number} | null>(null);
  const [gramsInput, setGramsInput] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchMealPlan();
      fetchChoices();
      fetchDailyMacros();
    }
  }, [user]);

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
    } finally {
      setLoading(false);
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
      }
    } catch (error) {
      console.error('Failed to fetch choices:', error);
    }
  };

  const fetchDailyMacros = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const today = new Date().toISOString();
      const response = await fetch(`${API_BASE_URL}/v2/meals/daily-macros?client_id=${user?.id}&date=${today}`, {
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

  const openFoodDialog = (food: FoodOption, slotId: number) => {
    // Check if already selected
    const existingChoice = choices.find(
      c => c.meal_slot_id === slotId && c.food_option_id === food.id
    );
    
    if (existingChoice) {
      // Parse existing quantity
      const match = existingChoice.quantity?.match(/(\d+)/);
      setGramsInput(match ? match[1] : '100');
    } else {
      // Default to serving size or 100g
      const match = food.serving_size?.match(/(\d+)/);
      setGramsInput(match ? match[1] : '100');
    }
    
    setSelectedFood({ food, slotId });
  };

  const submitFoodChoice = async () => {
    if (!selectedFood || !gramsInput) return;

    try {
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
      await fetchDailyMacros();
      
      // Close dialog
      setSelectedFood(null);
      setGramsInput('');
    } catch (error) {
      console.error('Failed to submit food choice:', error);
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
      await fetchDailyMacros();
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                {showHistory ? 'Hide History' : 'Show History'}
              </Button>
              <Button 
                onClick={finishDay}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Finish Day
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
                <span>Macros</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MacroCircle
                  label="Carbohydrates"
                  consumed={dailyMacros.consumed.carbs}
                  target={dailyMacros.targets.carbs}
                  unit="g"
                  color="rgb(34, 197, 194)"
                />
                <MacroCircle
                  label="Fat"
                  consumed={dailyMacros.consumed.fat}
                  target={dailyMacros.targets.fat}
                  unit="g"
                  color="rgb(168, 85, 247)"
                />
                <MacroCircle
                  label="Protein"
                  consumed={dailyMacros.consumed.protein}
                  target={dailyMacros.targets.protein}
                  unit="g"
                  color="rgb(251, 146, 60)"
                />
              </div>
              
              {/* Calories Summary */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Daily Calories</p>
                  <p className="text-3xl font-bold text-foreground">
                    {dailyMacros.consumed.calories} <span className="text-lg text-muted-foreground">/ {dailyMacros.targets.calories}</span>
                  </p>
                  <Progress value={dailyMacros.percentages.calories} className="mt-3 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meal Slots */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Daily Meals ({mealPlan.number_of_meals})</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {mealPlan.meal_slots.map((slot) => (
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
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4">
                    {slot.notes && (
                      <p className="text-sm text-muted-foreground mb-4 italic">{slot.notes}</p>
                    )}
                    
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
                                              {selectedChoice?.quantity || '100g'}
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
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {option.calories}{t('meals.kcal')} | P: {option.protein}g | C: {option.carbs}g | F: {option.fat}g
                                      </p>
                                      {option.serving_size && (
                                        <p className="text-xs text-muted-foreground">
                                          {t('meals.servingSize')}: {option.serving_size}
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
            ))}
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
          
          {selectedFood && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Nutritional Info (per {selectedFood.food.serving_size || '100g'})</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Calories: <span className="font-medium">{selectedFood.food.calories} kcal</span></div>
                  <div>Protein: <span className="font-medium">{selectedFood.food.protein}g</span></div>
                  <div>Carbs: <span className="font-medium">{selectedFood.food.carbs}g</span></div>
                  <div>Fat: <span className="font-medium">{selectedFood.food.fat}g</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How much did you eat? (grams)</label>
                <Input
                  type="number"
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value)}
                  placeholder="Enter grams"
                  className="text-lg"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedFood(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gradient-orange text-background"
                  onClick={submitFoodChoice}
                  disabled={!gramsInput || parseFloat(gramsInput) <= 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealMenuV2;



