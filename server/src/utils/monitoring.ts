import os from 'os';
import { performance } from 'perf_hooks';
import logger from './logger';

// Sistem metrikleri
export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number;
  platform: string;
  nodeVersion: string;
  processId: number;
}

// Performans metrikleri
export interface PerformanceMetrics {
  responseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
}

// Health check sonucu
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: boolean;
    redis: boolean;
    memory: boolean;
    cpu: boolean;
  };
  metrics: SystemMetrics;
}

class MonitoringService {
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private lastResetTime: number;

  constructor() {
    this.startTime = Date.now();
    this.lastResetTime = Date.now();
  }

  // Sistem metriklerini al
  getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        usage: this.getCPUUsage(),
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100,
      },
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version,
      processId: process.pid,
    };
  }

  // CPU kullanımını hesapla
  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick * 100);
  }

  // Request sayacını artır
  incrementRequestCount(): void {
    this.requestCount++;
  }

  // Error sayacını artır
  incrementErrorCount(): void {
    this.errorCount++;
  }

  // Response time ekle
  addResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // Son 100 response time'ı tut
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  // Performans metriklerini al
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const timeWindow = (now - this.lastResetTime) / 1000; // saniye
    
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const requestsPerSecond = timeWindow > 0 ? this.requestCount / timeWindow : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      responseTime: avgResponseTime,
      requestsPerSecond,
      errorRate,
      activeConnections: this.requestCount, // Basit yaklaşım
    };
  }

  // Metrikleri sıfırla (her saat)
  resetMetrics(): void {
    const now = Date.now();
    if (now - this.lastResetTime > 3600000) { // 1 saat
      this.requestCount = 0;
      this.errorCount = 0;
      this.responseTimes = [];
      this.lastResetTime = now;
      logger.info('Performance metrics reset');
    }
  }

  // Health check yap
  async performHealthCheck(): Promise<HealthCheck> {
    const metrics = this.getSystemMetrics();
    
    // Basit health check'ler
    const checks = {
      database: true, // Gerçek uygulamada DB bağlantısı kontrol edilir
      redis: true,    // Gerçek uygulamada Redis bağlantısı kontrol edilir
      memory: metrics.memory.percentage < 90,
      cpu: metrics.cpu.usage < 90,
    };

    // Status belirle
    const allChecksPass = Object.values(checks).every(check => check);
    const someChecksFail = Object.values(checks).some(check => !check);
    
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (!allChecksPass) {
      status = someChecksFail ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks,
      metrics,
    };
  }

  // Memory leak kontrolü
  checkMemoryLeak(): boolean {
    const metrics = this.getSystemMetrics();
    const memoryUsage = process.memoryUsage();
    
    // Heap kullanımı %80'i geçerse uyarı
    const heapUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (heapUsagePercentage > 80) {
      logger.warn(`High memory usage detected: ${heapUsagePercentage.toFixed(2)}%`);
      return true;
    }
    
    return false;
  }

  // Performans uyarıları
  checkPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    const metrics = this.getPerformanceMetrics();
    const systemMetrics = this.getSystemMetrics();

    if (metrics.responseTime > 1000) {
      warnings.push(`High response time: ${metrics.responseTime.toFixed(2)}ms`);
    }

    if (metrics.errorRate > 5) {
      warnings.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
    }

    if (systemMetrics.memory.percentage > 80) {
      warnings.push(`High memory usage: ${systemMetrics.memory.percentage.toFixed(2)}%`);
    }

    if (systemMetrics.cpu.usage > 80) {
      warnings.push(`High CPU usage: ${systemMetrics.cpu.usage.toFixed(2)}%`);
    }

    return warnings;
  }

  // Monitoring raporu oluştur
  generateReport(): any {
    const systemMetrics = this.getSystemMetrics();
    const performanceMetrics = this.getPerformanceMetrics();
    const warnings = this.checkPerformanceWarnings();

    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      system: systemMetrics,
      performance: performanceMetrics,
      warnings,
      memoryLeak: this.checkMemoryLeak(),
    };
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();

// Middleware için yardımcı fonksiyonlar
export const startRequestTimer = () => {
  return performance.now();
};

export const endRequestTimer = (startTime: number) => {
  const duration = performance.now() - startTime;
  monitoringService.addResponseTime(duration);
  return duration;
};

export const logRequestMetrics = (req: any, res: any, duration: number) => {
  monitoringService.incrementRequestCount();
  
  if (res.statusCode >= 400) {
    monitoringService.incrementErrorCount();
  }

  // Her 100 request'te bir metrikleri sıfırla
  if (monitoringService.getPerformanceMetrics().requestsPerSecond > 100) {
    monitoringService.resetMetrics();
  }
};

export default monitoringService; 