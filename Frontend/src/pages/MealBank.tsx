import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Utensils, Plus, Search, Edit, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface MealBankItem {
  id: number;
  name: string;
  name_hebrew: string;
  macro_type: 'protein' | 'carb' | 'fat';
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_by: number;
  created_at: string;
}

const normalizeMacroType = (value: string): 'protein' | 'carb' | 'fat' => {
  const normalized = (value ?? '').toString().toLowerCase();
  if (normalized.includes('carb')) return 'carb';
  if (normalized.includes('fat')) return 'fat';
  return 'protein';
};

const macroTypes = [
  { value: 'protein', label: 'Protein', icon: '🍗' },
  { value: 'carb', label: 'Carb', icon: '🍞' },
  { value: 'fat', label: 'Fat', icon: '🥑' }
];

const MealBank = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [items, setItems] = useState<MealBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMacroType, setSelectedMacroType] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealBankItem | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  
  const [itemForm, setItemForm] = useState({
    name: '',
    name_hebrew: '',
    macro_type: 'protein' as 'protein' | 'carb' | 'fat',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/v2/meals/meal-bank?include_public=true`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        const normalizedItems = (data as Array<MealBankItem & { macro_type: string }>).map(
          (item) => ({
            ...item,
            macro_type: normalizeMacroType(item.macro_type),
          })
        );
        setItems(normalizedItems);
      }
    } catch (error) {
      console.error('Error fetching meal bank items:', error);
      toast({
        title: t('common.error'),
        description: t('foodBank.errorLoad'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredItems = items.filter(item => {
    const normalizedEnglish = item.name?.toLowerCase() ?? '';
    const normalizedHebrew = item.name_hebrew?.toLowerCase() ?? '';

    const matchesSearch =
      !normalizedSearch ||
      normalizedEnglish.includes(normalizedSearch) ||
      normalizedHebrew.includes(normalizedSearch);

    const matchesMacro =
      selectedMacroType === 'all' || item.macro_type === selectedMacroType;

    return matchesSearch && matchesMacro;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.macro_type]) {
      acc[item.macro_type] = [];
    }
    acc[item.macro_type].push(item);
    return acc;
  }, {} as Record<string, MealBankItem[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const trimmedName = itemForm.name.trim();
      const trimmedHebrewName = itemForm.name_hebrew.trim();

      if (!trimmedName && !trimmedHebrewName) {
        toast({
          title: t('common.error'),
          description: t('foodBank.nameRequired'),
          variant: "destructive"
        });
        return;
      }

      const token = localStorage.getItem('access_token');
      const url = editingItem 
        ? `${API_BASE_URL}/v2/meals/meal-bank/${editingItem.id}`
        : `${API_BASE_URL}/v2/meals/meal-bank`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const payload = {
        name: trimmedName || trimmedHebrewName,
        name_hebrew: trimmedHebrewName || undefined,
        macro_type: itemForm.macro_type,
        calories: itemForm.calories ? parseInt(itemForm.calories) : null,
        protein: itemForm.protein ? parseFloat(itemForm.protein) : null,
        carbs: itemForm.carbs ? parseFloat(itemForm.carbs) : null,
        fat: itemForm.fat ? parseFloat(itemForm.fat) : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({
          title: t('common.success'),
          description: editingItem ? t('foodBank.successUpdated') : t('foodBank.successCreated'),
          variant: "default"
        });
        setCreateDialogOpen(false);
        setEditingItem(null);
        resetForm();
        fetchItems();
      } else {
        const errorData = await response.json();
        toast({
          title: t('common.error'),
          description: errorData.detail || t('foodBank.errorCreate'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving meal bank item:', error);
      toast({
        title: t('common.error'),
        description: t('foodBank.errorCreate'),
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm(t('foodBank.deleteConfirm'))) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/meals/meal-bank/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('foodBank.successDeleted')
        });
        fetchItems();
      } else {
        toast({
          title: t('common.error'),
          description: t('foodBank.errorDelete'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting meal bank item:', error);
      toast({
        title: t('common.error'),
        description: t('foodBank.errorDelete'),
        variant: "destructive"
      });
    }
  };

  const startEdit = (item: MealBankItem) => {
    const normalizedItem = {
      ...item,
      macro_type: normalizeMacroType(item.macro_type),
    };
    setEditingItem(normalizedItem as MealBankItem);
    setItemForm({
      name: normalizedItem.name || '',
      name_hebrew: normalizedItem.name_hebrew || normalizedItem.name || '',
      macro_type: normalizedItem.macro_type,
      calories: normalizedItem.calories?.toString() || '',
      protein: normalizedItem.protein?.toString() || '',
      carbs: normalizedItem.carbs?.toString() || '',
      fat: normalizedItem.fat?.toString() || ''
    });
    setCreateDialogOpen(true);
  };

  const resetForm = () => {
    setItemForm({
      name: '',
      name_hebrew: '',
      macro_type: 'protein',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    });
    setActiveTab('details');
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditingItem(null);
    resetForm();
  };

  if (loading) {
    return (
      <Layout currentPage="meal-bank">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">{t('foodBank.loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="meal-bank">
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            handleCloseDialog();
          }
        }}
      >
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('foodBank.title')}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t('foodBank.subtitle')}</p>
            </div>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  resetForm();
                  setCreateDialogOpen(true);
                }}
                className="gradient-green w-full sm:w-auto px-4 py-2 text-sm sm:text-base whitespace-nowrap"
              >
                <Plus className="w-4 h-4 me-2 flex-shrink-0" />
                <span className="truncate">{t('foodBank.addFoodItem')}</span>
              </Button>
            </DialogTrigger>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 mb-6 mt-2">
                <div className="flex-1 relative min-w-0 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('foodBank.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full max-w-full"
                    dir="auto"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  <Button
                    variant={selectedMacroType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMacroType('all')}
                    className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                  >
                    {t('foodBank.allMacros')}
                  </Button>
                  {macroTypes.map((macro) => (
                    <Button
                      key={macro.value}
                      variant={selectedMacroType === macro.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMacroType(macro.value)}
                      className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex items-center justify-center"
                    >
                      <span>{macro.icon}</span>
                      <span className="hidden sm:inline ms-1">{t(`foodBank.${macro.value}`)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items by Macro Type */}
          <Tabs defaultValue="protein" className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1 p-1 h-auto">
              {macroTypes.map((macro) => (
                <TabsTrigger 
                  key={macro.value} 
                  value={macro.value} 
                  className="px-1 sm:px-3 py-1.5 text-xs sm:text-sm flex items-center justify-center h-full min-h-[2rem]"
                >
                  <span className="text-base sm:text-lg flex items-center">{macro.icon}</span>
                  <span className="hidden sm:inline ms-1 flex items-center">{t(`foodBank.${macro.value}`)}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {macroTypes.map((macro) => (
              <TabsContent key={macro.value} value={macro.value} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedItems[macro.value] && groupedItems[macro.value].length > 0 ? (
                    groupedItems[macro.value].map((item) => (
                      <Card key={item.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.name || item.name_hebrew}</h3>
                            {(item.name_hebrew || (!item.name && item.name_hebrew)) && (
                              <p className="text-sm text-muted-foreground" dir="rtl">
                                {item.name_hebrew}
                              </p>
                            )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(item)}
                                disabled={item.created_by !== user?.id}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                disabled={item.created_by !== user?.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('foodBank.calories')}:</span>
                              <span className="font-medium ml-1">{item.calories || t('weightProgress.na')}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('foodBank.protein')}:</span>
                              <span className="font-medium ml-1">{item.protein || t('weightProgress.na')}{t('foodBank.g')}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('foodBank.carbs')}:</span>
                              <span className="font-medium ml-1">{item.carbs || t('weightProgress.na')}{t('foodBank.g')}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('foodBank.fat')}:</span>
                              <span className="font-medium ml-1">{item.fat || t('weightProgress.na')}{t('foodBank.g')}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      {t('foodBank.noItems')}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t('foodBank.editFoodItem') : t('foodBank.addNewFoodItem')}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? t('foodBank.editDescription') : t('foodBank.createDescription')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="details">{t('common.details')}</TabsTrigger>
                  <TabsTrigger value="nutrition">{t('common.nutrition')}</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="macro_type">{t('foodBank.macroType')} *</Label>
                    <select
                      id="macro_type"
                      value={itemForm.macro_type}
                      onChange={(e) => setItemForm({ ...itemForm, macro_type: e.target.value as 'protein' | 'carb' | 'fat' })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    >
                      {macroTypes.map((macro) => (
                        <option key={macro.value} value={macro.value}>
                          {macro.icon} {t(`foodBank.${macro.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 min-w-0 w-full">
                    <Label htmlFor="name">{t('foodBank.foodName')}</Label>
                    <Input
                      id="name"
                      placeholder={t('foodBank.foodNamePlaceholder')}
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      className="w-full max-w-full"
                      dir="auto"
                    />
                  </div>

                  <div className="space-y-2 min-w-0 w-full">
                    <Label htmlFor="name_hebrew">{t('foodBank.foodNameHebrew')} *</Label>
                    <Input
                      id="name_hebrew"
                      placeholder={t('foodBank.foodNameHebrewPlaceholder')}
                      value={itemForm.name_hebrew}
                      onChange={(e) => setItemForm({ ...itemForm, name_hebrew: e.target.value })}
                      className="w-full max-w-full"
                      dir="rtl"
                      required
                    />
                  </div>
                </TabsContent>

                <TabsContent value="nutrition" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="calories">{t('foodBank.calories')} ({t('foodBank.per100g')})</Label>
                      <Input
                        id="calories"
                        type="number"
                        placeholder="165"
                        value={itemForm.calories}
                        onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })}
                        className="w-full max-w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="protein">{t('foodBank.protein')} ({t('foodBank.per100g')})</Label>
                      <Input
                        id="protein"
                        type="number"
                        step="0.1"
                        placeholder="31"
                        value={itemForm.protein}
                        onChange={(e) => setItemForm({ ...itemForm, protein: e.target.value })}
                        className="w-full max-w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="carbs">{t('foodBank.carbs')} ({t('foodBank.per100g')})</Label>
                      <Input
                        id="carbs"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={itemForm.carbs}
                        onChange={(e) => setItemForm({ ...itemForm, carbs: e.target.value })}
                        className="w-full max-w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="fat">{t('foodBank.fat')} ({t('foodBank.per100g')})</Label>
                      <Input
                        id="fat"
                        type="number"
                        step="0.1"
                        placeholder="3.6"
                        value={itemForm.fat}
                        onChange={(e) => setItemForm({ ...itemForm, fat: e.target.value })}
                        className="w-full max-w-full"
                      />
                    </div>
                  </div>
                </TabsContent>

              </Tabs>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  {t('foodBank.cancel')}
                </Button>
                <Button type="submit" className="flex-1 gradient-green">
                  {editingItem ? t('foodBank.updateFoodItem') : t('foodBank.createFoodItem')}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MealBank;

