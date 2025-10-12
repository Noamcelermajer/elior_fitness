import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Check, Clock, Utensils, Flame, Apple, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
}

const MealMenuV2 = () => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [choices, setChoices] = useState<ClientMealChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchMealPlan();
      fetchChoices();
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

  const toggleFoodOption = async (mealSlotId: number, foodOptionId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const existingChoice = choices.find(
        c => c.meal_slot_id === mealSlotId && c.food_option_id === foodOptionId
      );

      if (existingChoice) {
        // Delete the choice
        await fetch(`${API_BASE_URL}/v2/meals/choices/${existingChoice.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setChoices(choices.filter(c => c.id !== existingChoice.id));
      } else {
        // Create new choice
        const response = await fetch(`${API_BASE_URL}/v2/meals/choices`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            food_option_id: foodOptionId,
            meal_slot_id: mealSlotId,
            date: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const newChoice = await response.json();
          setChoices([...choices, newChoice]);
        }
      }
    } catch (error) {
      console.error('Failed to toggle food option:', error);
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
        return 'חלבון (Protein)';
      case 'carb':
        return 'פחמימה (Carb)';
      case 'fat':
        return 'שומן (Fat)';
      default:
        return macroType;
    }
  };

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading meal plan...</p>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gradient">My Meal Plan</h1>
            <p className="text-muted-foreground mt-1">Track your nutrition and meals</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Utensils className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">No Active Meal Plan</p>
                <p className="text-sm text-muted-foreground">
                  Your trainer hasn't assigned a meal plan yet. Check back later!
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
                {mealPlan.description || 'Track your nutrition and meals'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Nutrition Goals */}
        <Card className="bg-gradient-to-br from-card to-secondary border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Flame className="w-5 h-5 text-primary" />
              <span>Daily Nutrition Goals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{mealPlan.total_calories || '-'}</p>
                <p className="text-sm text-muted-foreground">Calories</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{mealPlan.protein_target || '-'}g</p>
                <p className="text-sm text-muted-foreground">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{mealPlan.carb_target || '-'}g</p>
                <p className="text-sm text-muted-foreground">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{mealPlan.fat_target || '-'}g</p>
                <p className="text-sm text-muted-foreground">Fats</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-primary/10 border-primary' 
                                        : 'bg-card hover:bg-accent'
                                    }`}
                                    onClick={() => toggleFoodOption(slot.id, option.id)}
                                  >
                                    <Checkbox 
                                      checked={isSelected}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className="font-medium">
                                          {option.name_hebrew || option.name}
                                        </p>
                                        {isSelected && (
                                          <Badge className="gradient-green text-background">
                                            <Check className="w-3 h-3 mr-1" />
                                            Eaten
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {option.calories}kcal | P: {option.protein}g | C: {option.carbs}g | F: {option.fat}g
                                      </p>
                                      {option.serving_size && (
                                        <p className="text-xs text-muted-foreground">
                                          Serving: {option.serving_size}
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
      </div>
    </div>
  );
};

export default MealMenuV2;



