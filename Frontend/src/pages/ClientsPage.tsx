import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Mail, Phone, Calendar, Target, Plus, User, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ClientWeightProgress from '../components/ClientWeightProgress';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Client {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ClientsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [creating, setCreating] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch clients from backend
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show clients (role === 'CLIENT')
        const clientUsers = data.filter((user: any) => user.role === 'CLIENT');
        setClients(clientUsers);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect non-trainers away from trainer-only pages
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        navigate('/', { replace: true });
      }
      // Admin can access (for monitoring purposes)
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && (user.role === 'TRAINER' || user.role === 'ADMIN')) {
      fetchClients();
    }
  }, [user]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/register/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...createForm,
          role: 'client'
        }),
      });

      if (response.ok) {
        alert('Client created successfully!');
        setIsCreateDialogOpen(false);
        setCreateForm({ username: '', email: '', password: '', full_name: '' });
        // Refresh the clients list
        fetchClients();
      } else {
        const errorData = await response.json();
        console.error('Client creation error:', errorData);
        
        // Handle different error response formats
        let errorMessage = 'Unknown error';
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          // Handle array of validation errors
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail[0];
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'object') {
          // Try to extract meaningful error from object
          const errorKeys = Object.keys(errorData);
          if (errorKeys.length > 0) {
            const firstError = errorData[errorKeys[0]];
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0];
            } else if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          }
        }
        
        alert(`Failed to create client: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('An error occurred while creating the client');
    } finally {
      setCreating(false);
    }
  };

  const handleViewProgress = async (client: Client) => {
    setSelectedClient(client);
    setProgressModalOpen(true);
    setProgressLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/progress/?client_id=${client.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProgressEntries(data);
      } else {
        setProgressEntries([]);
      }
    } catch {
      setProgressEntries([]);
    } finally {
      setProgressLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout currentPage="clients">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading clients...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="clients">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">Client Management</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your clients and their fitness journeys
                </p>
              </div>
              <div className="flex space-x-3">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gradient-orange hover:gradient-orange-dark text-background font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Create a new client account. Fill in the details below.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateClient} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={createForm.username}
                          onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                          placeholder="Enter username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                          placeholder="Enter email"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={createForm.full_name}
                          onChange={(e) => setCreateForm({...createForm, full_name: e.target.value})}
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                          placeholder="Enter password (min 8 characters)"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 gradient-orange text-background"
                          disabled={creating}
                        >
                          {creating ? 'Creating...' : 'Create Client'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          {/* Search and Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                {filteredClients.length} {filteredClients.length === 1 ? 'Client' : 'Clients'}
              </Badge>
            </div>
          </div>

          {/* Clients List */}
          {filteredClients.length === 0 ? (
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'No clients found' : 'No clients yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Start by adding your first client to begin managing their fitness journey'
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gradient-orange text-background"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Client
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {client.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">{client.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">@{client.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{client.last_login ? formatDate(client.last_login) : 'Never'}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(client.created_at)}</span>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewProgress(client)}>View Progress</Button>
                      <Button size="sm" onClick={() => navigate(`/client/${client.id}`)}>View Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Weight Progress - {selectedClient?.full_name}</DialogTitle>
          </DialogHeader>
          {progressLoading ? (
            <div className="p-8 text-center">{t('common.loading')}</div>
          ) : (
            <ClientWeightProgress
              clientId={selectedClient?.id?.toString() || ''}
              progressEntries={progressEntries}
              onProgressUpdate={() => handleViewProgress(selectedClient!)}
              isTrainer={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ClientsPage; 