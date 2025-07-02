
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Utensils, Save } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  ingredients: string[];
  instructions?: string;
}

interface MealPlan {
  name: string;
  breakfast: Meal | null;
  lunch: Meal | null;
  dinner: Meal | null;
  snacks: Meal[];
}

const CreateMealPlanPage = () => {
  const [meals, setMeals] = useState<Meal[]>([
    {
      id: '1',
      name: 'Protein Smoothie',
      calories: 280,
      protein: '25g',
      carbs: '20g',
      fat: '8g',
      ingredients: ['Whey protein', 'Banana', 'Almond milk', 'Spinach', 'Peanut butter']
    },
    {
      id: '2',
      name: 'Grilled Chicken Salad',
      calories: 350,
      protein: '35g',
      carbs: '12g',
      fat: '18g',
      ingredients: ['Grilled chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Avocado', 'Olive oil dressing']
    }
  ]);

  const [mealPlan, setMealPlan] = useState<MealPlan>({
    name: '',
    breakfast: null,
    lunch: null,
    dinner: null,
    snacks: []
  });

  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: 0,
    protein: '',
    carbs: '',
    fat: '',
    ingredients: [''],
    instructions: ''
  });

  const form = useForm<{ name: string }>({
    defaultValues: { name: '' }
  });

  const addIngredient = () => {
    setNewMeal({
      ...newMeal,
      ingredients: [...newMeal.ingredients, '']
    });
  };

  const updateIngredient = (index: number, value: string) => {
    const updatedIngredients = [...newMeal.ingredients];
    updatedIngredients[index] = value;
    setNewMeal({ ...newMeal, ingredients: updatedIngredients });
  };

  const removeIngredient = (index: number) => {
    setNewMeal({
      ...newMeal,
      ingredients: newMeal.ingredients.filter((_, i) => i !== index)
    });
  };

  const addMeal = () => {
    if (newMeal.name && newMeal.calories > 0) {
      const meal: Meal = {
        id: Date.now().toString(),
        ...newMeal,
        ingredients: newMeal.ingredients.filter(ing => ing.trim() !== '')
      };
      setMeals([...meals, meal]);
      setNewMeal({
        name: '',
        calories: 0,
        protein: '',
        carbs: '',
        fat: '',
        ingredients: [''],
        instructions: ''
      });
    }
  };

  const assignMealToSlot = (meal: Meal, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (slot === 'snack') {
      setMealPlan({
        ...mealPlan,
        snacks: [...mealPlan.snacks, meal]
      });
    } else {
      setMealPlan({
        ...mealPlan,
        [slot]: meal
      });
    }
  };

  const removeMealFromSlot = (slot: 'breakfast' | 'lunch' | 'dinner', snackIndex?: number) => {
    if (slot === 'breakfast' || slot === 'lunch' || slot === 'dinner') {
      setMealPlan({
        ...mealPlan,
        [slot]: null
      });
    } else if (snackIndex !== undefined) {
      setMealPlan({
        ...mealPlan,
        snacks: mealPlan.snacks.filter((_, index) => index !== snackIndex)
      });
    }
  };

  const createMealPlan = (data: { name: string }) => {
    const plan = {
      ...mealPlan,
      name: data.name
    };
    console.log('Creating meal plan:', plan);
    // Here you would typically save to your backend
  };

  return (
    <Layout currentPage="meals">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center shadow-xl">
                <Utensils className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">Create Meal Plan</h1>
                <p className="text-muted-foreground mt-1">Design custom nutrition plans for your clients</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Tabs defaultValue="meals" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
              <TabsTrigger value="meals" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                Manage Meals
              </TabsTrigger>
              <TabsTrigger value="plan" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                Create Plan
              </TabsTrigger>
            </TabsList>

            {/* Meals Management Tab */}
            <TabsContent value="meals" className="space-y-6">
              {/* Add New Meal */}
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <span>Add New Meal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mealName">Meal Name</Label>
                      <Input
                        id="mealName"
                        value={newMeal.name}
                        onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                        placeholder="e.g., Protein Smoothie"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calories">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={newMeal.calories}
                        onChange={(e) => setNewMeal({...newMeal, calories: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="protein">Protein</Label>
                      <Input
                        id="protein"
                        value={newMeal.protein}
                        onChange={(e) => setNewMeal({...newMeal, protein: e.target.value})}
                        placeholder="e.g., 25g"
                      />
                    </div>
                    <div>
                      <Label htmlFor="carbs">Carbs</Label>
                      <Input
                        id="carbs"
                        value={newMeal.carbs}
                        onChange={(e) => setNewMeal({...newMeal, carbs: e.target.value})}
                        placeholder="e.g., 30g"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fat">Fat</Label>
                      <Input
                        id="fat"
                        value={newMeal.fat}
                        onChange={(e) => setNewMeal({...newMeal, fat: e.target.value})}
                        placeholder="e.g., 8g"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Ingredients</Label>
                    <div className="space-y-2 mt-2">
                      {newMeal.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            value={ingredient}
                            onChange={(e) => updateIngredient(index, e.target.value)}
                            placeholder={`Ingredient ${index + 1}`}
                          />
                          {newMeal.ingredients.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeIngredient(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addIngredient}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="instructions">Instructions (optional)</Label>
                    <Input
                      id="instructions"
                      value={newMeal.instructions}
                      onChange={(e) => setNewMeal({...newMeal, instructions: e.target.value})}
                      placeholder="Cooking or preparation instructions..."
                    />
                  </div>

                  <Button onClick={addMeal} className="gradient-orange text-background">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Meal
                  </Button>
                </CardContent>
              </Card>

              {/* Meal Library */}
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Meal Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {meals.map((meal) => (
                      <div key={meal.id} className="p-4 bg-secondary/50 rounded-xl border border-border/30">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{meal.name}</h4>
                          <Badge className="bg-primary/20 text-primary">{meal.calories} kcal</Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/20">
                            <p className="text-sm font-bold text-red-400">{meal.protein}</p>
                            <p className="text-xs text-muted-foreground">Protein</p>
                          </div>
                          <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                            <p className="text-sm font-bold text-yellow-400">{meal.carbs}</p>
                            <p className="text-xs text-muted-foreground">Carbs</p>
                          </div>
                          <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                            <p className="text-sm font-bold text-purple-400">{meal.fat}</p>
                            <p className="text-xs text-muted-foreground">Fat</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium mb-2">Ingredients:</p>
                          <div className="flex flex-wrap gap-1">
                            {meal.ingredients.map((ingredient, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {ingredient}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => assignMealToSlot(meal, 'breakfast')}
                            disabled={mealPlan.breakfast?.id === meal.id}
                          >
                            Add to Breakfast
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => assignMealToSlot(meal, 'lunch')}
                            disabled={mealPlan.lunch?.id === meal.id}
                          >
                            Add to Lunch
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => assignMealToSlot(meal, 'dinner')}
                            disabled={mealPlan.dinner?.id === meal.id}
                          >
                            Add to Dinner
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => assignMealToSlot(meal, 'snack')}
                          >
                            Add as Snack
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Meal Plan Tab */}
            <TabsContent value="plan" className="space-y-6">
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Meal Plan Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(createMealPlan)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., John's Weekly Plan" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Meal Slots */}
                      <div className="grid gap-6">
                        {/* Breakfast */}
                        <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                          <h3 className="font-semibold text-yellow-400 mb-3">Breakfast (Required)</h3>
                          {mealPlan.breakfast ? (
                            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                              <div>
                                <p className="font-medium">{mealPlan.breakfast.name}</p>
                                <p className="text-sm text-muted-foreground">{mealPlan.breakfast.calories} kcal</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMealFromSlot('breakfast')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No meal assigned</p>
                          )}
                        </div>

                        {/* Lunch */}
                        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                          <h3 className="font-semibold text-green-400 mb-3">Lunch (Required)</h3>
                          {mealPlan.lunch ? (
                            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                              <div>
                                <p className="font-medium">{mealPlan.lunch.name}</p>
                                <p className="text-sm text-muted-foreground">{mealPlan.lunch.calories} kcal</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMealFromSlot('lunch')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No meal assigned</p>
                          )}
                        </div>

                        {/* Dinner */}
                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <h3 className="font-semibold text-blue-400 mb-3">Dinner (Required)</h3>
                          {mealPlan.dinner ? (
                            <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                              <div>
                                <p className="font-medium">{mealPlan.dinner.name}</p>
                                <p className="text-sm text-muted-foreground">{mealPlan.dinner.calories} kcal</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMealFromSlot('dinner')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No meal assigned</p>
                          )}
                        </div>

                        {/* Snacks */}
                        <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                          <h3 className="font-semibold text-purple-400 mb-3">Snacks (Optional)</h3>
                          {mealPlan.snacks.length > 0 ? (
                            <div className="space-y-2">
                              {mealPlan.snacks.map((snack, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{snack.name}</p>
                                    <p className="text-sm text-muted-foreground">{snack.calories} kcal</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeMealFromSlot('breakfast', index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No snacks added</p>
                          )}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full gradient-orange text-background font-semibold transform hover:scale-105 transition-all duration-200"
                        disabled={!mealPlan.breakfast || !mealPlan.lunch || !mealPlan.dinner}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Create Meal Plan
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CreateMealPlanPage;
