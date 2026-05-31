import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { API_BASE_URL } from '../config/api';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Server, 
  Shield, 
  Zap,
  Play,
  RotateCcw,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Container
} from 'lucide-react';

interface SystemStatus {
  uptime: string;
  database_connections: number;
  memory_usage: number;
  cpu_usage: number;
  active_users: number;
  total_users: number;
  system_health: string;
  last_backup: string;
  version: string;
  docker_stats?: {
    containers_running: number;
    containers_total: number;
    images_total: number;
    volumes_total: number;
    docker_version: string;
    container_stats: Array<{
      name: string;
      id: string;
      status: string;
      cpu_percent: number;
      memory_usage_mb: number;
      memory_limit_mb: number;
      memory_percent: number;
    }>;
    docker_available: boolean;
    docker_info?: string;
  };
  resources?: {
    cpu_usage: number;
    cpu_count: number;
    memory_usage: number;
    memory_total_gb: number;
    memory_available_gb: number;
    disk_usage: number;
    disk_total_gb: number;
    disk_free_gb: number;
    network_sent_mb: number;
    network_recv_mb: number;
  };
  database?: {
    database_size_mb: number;
    active_connections: number;
    table_counts: Record<string, number>;
    last_backup: string;
  };
  application?: {
    version: string;
    environment: string;
    python_version: string;
    platform: string;
    hostname: string;
  };
  process_stats?: Array<{
    pid: number;
    name: string;
    cpu_percent: number;
    memory_percent: number;
  }>;
}

interface SystemLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

interface TestResult {
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  reason?: string;
}

interface TestRunResult {
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: number;
  details: TestResult[];
  raw_output: string;
  error_output: string;
}

const SystemPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [testResults, setTestResults] = useState<TestRunResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <Layout currentPage="system">
        <div className="container mx-auto p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Admin privileges required to view system information.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/system/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }),
        fetch(`${API_BASE_URL}/system/logs`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
      ]);

      if (statusRes.ok) {
        const status = await statusRes.json();
        setSystemStatus(status);
      }

      if (logsRes.ok) {
        const logs = await logsRes.json();
        setSystemLogs(logs);
      }
    } catch (error) {
      toast({
        title: t("system.toast.error"),
        description: t("system.toast.failedToLoad"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    setIsRunningTests(true);
    setTestProgress(0);
    setTestResults(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100% until tests actually finish
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch(`${API_BASE_URL}/system/run-tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      clearInterval(progressInterval);
      setTestProgress(100);

      if (response.ok) {
        const results = await response.json();
        setTestResults(results);
        toast({
          title: t("system.toast.testsCompleted"),
          description: t("system.toast.testsCompletedDesc", { passed: results.passed, failed: results.failed, skipped: results.skipped }),
          variant: results.failed > 0 ? "destructive" : "default"
        });
      } else {
        throw new Error('Failed to run tests');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setTestProgress(0);
      toast({
        title: t("system.toast.error"),
        description: t("system.toast.failedToRunTests"),
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
      // Reset progress after a delay
      setTimeout(() => setTestProgress(0), 2000);
    }
  };

  const performQuickAction = async (action: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: t("system.toast.success"),
          description: result.message
        });
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      toast({
        title: t("system.toast.error"),
        description: `${t("system.toast.actionFailed")}: ${action}`,
        variant: "destructive"
      });
    }
  };

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Layout currentPage="system">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="system">
      <div className="container mx-auto p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("system.pageTitle")}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("system.subtitle")}</p>
          </div>
          <Button onClick={loadSystemData} variant="outline" className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("system.refresh")}
          </Button>
        </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap w-full sm:w-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">{t("system.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs sm:text-sm">{t("system.tabs.logs")}</TabsTrigger>
          <TabsTrigger value="tests" className="text-xs sm:text-sm">{t("system.tabs.tests")}</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm">{t("system.tabs.actions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("system.cards.systemHealth")}</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthColor(systemStatus?.system_health || 'unknown')}`}></div>
                  <span className="text-2xl font-bold capitalize">{systemStatus?.system_health || t("system.status.unknown")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("system.labels.uptime")}: {systemStatus?.uptime || t("system.status.unknown")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("system.cards.activeUsers")}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStatus?.active_users || 0}</div>
                <p className="text-xs text-muted-foreground">{t("system.labels.ofTotalUsers", { total: systemStatus?.total_users || 0 })}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("system.cards.memoryUsage")}</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStatus?.memory_usage || 0}%</div>
                <Progress value={systemStatus?.memory_usage || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("system.cards.cpuUsage")}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStatus?.cpu_usage || 0}%</div>
                <Progress value={systemStatus?.cpu_usage || 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("system.cards.databaseStatus")}</CardTitle>
                <CardDescription>{t("system.cards.databaseDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{t("system.labels.activeConnections")}</span>
                  <span className="font-medium">{systemStatus?.database_connections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.databaseSize")}</span>
                  <span className="font-medium">{systemStatus?.database?.database_size_mb || 0} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.lastBackup")}</span>
                  <span className="font-medium">{systemStatus?.last_backup || t("system.status.never")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.totalRecords")}</span>
                  <span className="font-medium">
                    {systemStatus?.database?.table_counts 
                      ? Object.values(systemStatus.database.table_counts).reduce((a, b) => a + b, 0)
                      : 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("system.cards.systemInfo")}</CardTitle>
                <CardDescription>{t("system.cards.systemInfoDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{t("system.labels.apiVersion")}</span>
                  <span className="font-medium">{systemStatus?.application?.version || '1.2.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.environment")}</span>
                  <span className="font-medium">{systemStatus?.application?.environment || 'Production'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.platform")}</span>
                  <span className="font-medium text-xs">{systemStatus?.application?.platform?.split('-')[0] || t("system.status.unknown")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("system.labels.pythonVersion")}</span>
                  <span className="font-medium">{systemStatus?.application?.python_version || t("system.status.unknown")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Docker Stats Section */}
          {systemStatus?.docker_stats && (
            <Card>
              <CardHeader>
                <CardTitle>{t("system.cards.dockerStatus")}</CardTitle>
                <CardDescription>
                  {systemStatus.docker_stats.docker_available 
                    ? `${systemStatus.docker_stats.containers_running} running containers out of ${systemStatus.docker_stats.containers_total} total`
                    : systemStatus.docker_stats.docker_info || 'Docker is not available on this system'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemStatus.docker_stats.docker_available ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t("system.labels.containers")}</p>
                        <p className="text-2xl font-bold">{systemStatus.docker_stats.containers_running}/{systemStatus.docker_stats.containers_total}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t("system.labels.images")}</p>
                        <p className="text-2xl font-bold">{systemStatus.docker_stats.images_total}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t("system.labels.volumes")}</p>
                        <p className="text-2xl font-bold">{systemStatus.docker_stats.volumes_total}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t("system.labels.dockerVersion")}</p>
                        <p className="text-xl font-bold">{systemStatus.docker_stats.docker_version}</p>
                      </div>
                    </div>
                    
                    {systemStatus.docker_stats.container_stats.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="font-medium">{t("system.labels.runningContainers")}</h4>
                        <div className="space-y-2">
                          {systemStatus.docker_stats.container_stats.map((container) => (
                            <div key={container.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{container.name}</span>
                                <Badge variant={container.status === 'running' ? 'default' : 'secondary'}>
                                  {container.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">{t("system.labels.cpu")}: </span>
                                  <span className="font-medium">{container.cpu_percent}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t("system.labels.memory")}: </span>
                                  <span className="font-medium">
                                    {container.memory_usage_mb} MB ({container.memory_percent}%)
                                  </span>
                                </div>
                              </div>
                              <Progress value={container.memory_percent} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <Container className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">{t("system.status.dockerNotAvailable")}</p>
                      <p className="text-sm text-muted-foreground">
                        {systemStatus.docker_stats.docker_info || t("system.status.installDocker")}
                      </p>
                    </div>
                    
                    {/* Show process stats as alternative when Docker is not available */}
                    {systemStatus.process_stats && systemStatus.process_stats.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">{t("system.labels.applicationProcesses")}</h4>
                        <div className="space-y-2">
                          {systemStatus.process_stats.map((process) => (
                            <div key={process.pid} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{process.name}</span>
                                <span className="text-sm text-muted-foreground">PID: {process.pid}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">{t("system.labels.cpu")}: </span>
                                  <span className="font-medium">{process.cpu_percent}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t("system.labels.memory")}: </span>
                                  <span className="font-medium">{process.memory_percent}%</span>
                                </div>
                              </div>
                              <Progress value={Math.min(process.memory_percent, 100)} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Resources Section */}
          {systemStatus?.resources && (
            <Card>
              <CardHeader>
                <CardTitle>{t("system.cards.systemResources")}</CardTitle>
                <CardDescription>{t("system.cards.systemResourcesDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("system.labels.cpuCores")}</span>
                      <span className="font-medium">{systemStatus.resources.cpu_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("system.labels.totalMemory")}</span>
                      <span className="font-medium">{systemStatus.resources.memory_total_gb} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("system.labels.availableMemory")}</span>
                      <span className="font-medium">{systemStatus.resources.memory_available_gb} GB</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("system.labels.diskUsage")}</span>
                      <span className="font-medium">{systemStatus.resources.disk_usage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("system.labels.totalDisk")}</span>
                      <span className="font-medium">{systemStatus.resources.disk_total_gb} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("system.labels.freeDisk")}</span>
                      <span className="font-medium">{systemStatus.resources.disk_free_gb} GB</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t("system.labels.networkSent")}</span>
                    <span className="font-medium">{systemStatus.resources.network_sent_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("system.labels.networkReceived")}</span>
                    <span className="font-medium">{systemStatus.resources.network_recv_mb} MB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("system.cards.recentLogs")}</CardTitle>
              <CardDescription>{t("system.cards.recentLogsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getLogLevelColor(log.level)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.message}</span>
                        <span className="text-sm text-muted-foreground">{log.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">{log.level}</Badge>
                        <span className="text-xs text-muted-foreground">{log.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("system.cards.testSuite")}</CardTitle>
              <CardDescription>{t("system.cards.testSuiteDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={runTests} 
                  disabled={isRunningTests}
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>{isRunningTests ? t("system.buttons.runningTests") : t("system.buttons.runTests")}</span>
                </Button>
                
                {isRunningTests && (
                  <div className="flex items-center space-x-2">
                    <Progress value={testProgress} className="w-32" />
                    <span className="text-sm text-muted-foreground">{Math.round(testProgress)}%</span>
                  </div>
                )}
              </div>

              {testResults && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-2xl font-bold text-green-500">{testResults.passed}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{t("system.test.passed")}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-2xl font-bold text-red-500">{testResults.failed}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{t("system.test.failed")}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-2xl font-bold text-yellow-500">{testResults.skipped}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{t("system.test.skipped")}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="text-2xl font-bold text-blue-500">{testResults.coverage}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{t("system.test.coverage")}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">{t("system.test.testDetails")}</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {testResults.details.map((test, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-mono text-sm">{test.test}</span>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={test.status === 'passed' ? 'default' : test.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {test.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{test.duration}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("system.cards.quickActions")}</CardTitle>
              <CardDescription>{t("system.cards.quickActionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  onClick={() => performQuickAction('restart')}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <RotateCcw className="h-6 w-6" />
                  <span>{t("system.buttons.restartServices")}</span>
                </Button>
                
                <Button 
                  onClick={() => performQuickAction('backup')}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <Download className="h-6 w-6" />
                  <span>{t("system.buttons.createBackup")}</span>
                </Button>
                
                <Button 
                  onClick={() => performQuickAction('optimize-db')}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <Database className="h-6 w-6" />
                  <span>{t("system.buttons.optimizeDatabase")}</span>
                </Button>
                
                <Button 
                  onClick={() => performQuickAction('maintenance')}
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                >
                  <Settings className="h-6 w-6" />
                  <span>{t("system.buttons.toggleMaintenance")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
};

export default SystemPage; 