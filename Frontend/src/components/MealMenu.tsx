
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Check, Clock, Utensils, Flame, Apple, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MealMenu = () => {
  const { user } = useAuth();
  const isTrainer = user?.role === 'TRAINER';

  const trainerMeals = [
    {
      id: 1,
      name: "Grilled Chicken Salad",
      calories: 350,
      protein: "35g",
      carbs: "12g",
      fat: "18g",
      time: "Lunch",
      consumed: false,
      clientName: "Sarah Johnson",
      ingredients: ["Grilled chicken breast", "Mixed greens", "Cherry tomatoes", "Avocado", "Olive oil dressing"]
    },
    {
      id: 2,
      name: "Protein Smoothie",
      calories: 280,
      protein: "25g",
      carbs: "20g",
      fat: "8g",
      time: "Breakfast",
      consumed: true,
      clientName: "Mike Chen",
      ingredients: ["Whey protein", "Banana", "Almond milk", "Spinach", "Peanut butter"]
    },
    {
      id: 3,
      name: "Quinoa Power Bowl",
      calories: 420,
      protein: "18g",
      carbs: "65g",
      fat: "12g",
      time: "Dinner",
      consumed: false,
      clientName: "Emma Wilson",
      ingredients: ["Quinoa", "Roasted vegetables", "Black beans", "Feta cheese", "Tahini dressing"]
    },
    {
      id: 4,
      name: "Greek Yogurt Parfait",
      calories: 245,
      protein: "20g",
      carbs: "28g",
      fat: "6g",
      time: "Snack",
      consumed: true,
      clientName: "David Rodriguez",
      ingredients: ["Greek yogurt", "Mixed berries", "Granola", "Honey", "Chia seeds"]
    }
  ];

  const clientMeals = [
    {
      id: 1,
      name: "Protein Smoothie",
      calories: 280,
      protein: "25g",
      carbs: "20g",
      fat: "8g",
      time: "Breakfast",
      consumed: true,
      ingredients: ["Whey protein", "Banana", "Almond milk", "Spinach", "Peanut butter"]
    },
    {
      id: 2,
      name: "Grilled Chicken Salad",
      calories: 350,
      protein: "35g",
      carbs: "12g",
      fat: "18g",
      time: "Lunch",
      consumed: false,
      ingredients: ["Grilled chicken breast", "Mixed greens", "Cherry tomatoes", "Avocado", "Olive oil dressing"]
    },
    {
      id: 3,
      name: "Quinoa Power Bowl",
      calories: 420,
      protein: "18g",
      carbs: "65g",
      fat: "12g",
      time: "Dinner",
      consumed: false,
      ingredients: ["Quinoa", "Roasted vegetables", "Black beans", "Feta cheese", "Tahini dressing"]
    }
  ];

  const [meals, setMeals] = useState(isTrainer ? trainerMeals : clientMeals);

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const consumedCalories = meals.filter(meal => meal.consumed).reduce((sum, meal) => sum + meal.calories, 0);
  const progressPercentage = (consumedCalories / totalCalories) * 100;

  const toggleMealConsumption = (mealId: number) => {
    setMeals(meals.map(meal => 
      meal.id === mealId ? { ...meal, consumed: !meal.consumed } : meal
    ));
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                {isTrainer ? 'Client Meal Plans' : 'My Meal Plan'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isTrainer ? 'Manage nutrition for all clients' : 'Track nutrition and calorie intake'}
              </p>
            </div>
            <Button className="gradient-orange hover:gradient-orange-dark text-background font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              {isTrainer ? 'Create Meal Plan' : 'Add Meal'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Calorie Progress */}
        <Card className="bg-gradient-to-br from-card to-secondary border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Flame className="w-5 h-5 text-primary" />
              <span>{isTrainer ? 'Overall Nutrition Stats' : 'Daily Calorie Progress'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-2xl lg:text-3xl font-bold text-foreground">
                  {consumedCalories} / {totalCalories} kcal
                </span>
                <Badge variant={progressPercentage >= 80 ? "default" : "secondary"} className={progressPercentage >= 80 ? "gradient-orange text-background" : ""}>
                  {Math.round(progressPercentage)}% Complete
                </Badge>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-secondary" 
              />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-secondary/50">
                  <p className="text-xl lg:text-2xl font-bold text-primary">{consumedCalories}</p>
                  <p className="text-sm text-muted-foreground">Consumed</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50">
                  <p className="text-xl lg:text-2xl font-bold text-blue-500">{totalCalories - consumedCalories}</p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50">
                  <p className="text-xl lg:text-2xl font-bold text-green-500">{totalCalories}</p>
                  <p className="text-sm text-muted-foreground">Target</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal Cards */}
        <div className="space-y-4">
          {meals.map((meal) => (
            <Card key={meal.id} className={`transition-all duration-300 hover:scale-[1.02] ${
              meal.consumed 
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
                : 'bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80'
            }`}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <Apple className="w-5 h-5 text-primary" />
                        <h3 className={`text-lg lg:text-xl font-semibold ${meal.consumed ? 'text-green-400' : 'text-foreground'}`}>
                          {meal.name}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {meal.time}
                        </Badge>
                        {isTrainer && 'clientName' in meal && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {(meal as any).clientName}
                          </Badge>
                        )}
                        {meal.consumed && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Check className="w-3 h-3 mr-1" />
                            Consumed
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <p className="text-lg lg:text-xl font-bold text-primary">{meal.calories}</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                      </div>
                      <div className="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-base lg:text-lg font-bold text-red-400">{meal.protein}</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <p className="text-base lg:text-lg font-bold text-yellow-400">{meal.carbs}</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="text-center p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <p className="text-base lg:text-lg font-bold text-purple-400">{meal.fat}</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Ingredients:</h4>
                      <div className="flex flex-wrap gap-2">
                        {meal.ingredients.map((ingredient, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-secondary/50">
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => toggleMealConsumption(meal.id)}
                    variant={meal.consumed ? "default" : "outline"}
                    className={`lg:ml-4 ${meal.consumed ? 
                      "bg-green-600 hover:bg-green-700 text-white" : 
                      "hover:gradient-orange hover:text-background border-border/50"
                    }`}
                  >
                    {meal.consumed ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Consumed
                      </>
                    ) : (
                      "Mark as Eaten"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MealMenu;
