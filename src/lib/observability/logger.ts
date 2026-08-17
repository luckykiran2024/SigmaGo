import os from 'os';

export type LogLevel = 'info' | 'warn' | 'error' | 'metric';

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface SystemMetrics {
  cpu: {
    loadAvg: number[];
    cpuCount: number;
    userCpuTimeMs: number;
    systemCpuTimeMs: number;
    cpuUtilizationPercent: number;
  };
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
    arrayBuffersMb: number;
    heapUtilizationPercent: number;
    systemTotalMemMb: number;
    systemFreeMemMb: number;
    systemUsedMemMb: number;
    systemMemoryPercent: number;
  };
  process: {
    uptimeSeconds: number;
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

class ObservabilityLogger {
  private initialCpuUsage = process.cpuUsage();
  private initialTime = performance.now();

  /**
   * Retrieves comprehensive real-time CPU, Memory, OS, and Process metrics.
   */
  getSystemMetrics(): SystemMetrics {
    const elapsedMs = performance.now() - this.initialTime;
    const cpuDelta = process.cpuUsage(this.initialCpuUsage);

    // CPU calculations
    const userCpuTimeMs = Math.round(cpuDelta.user / 1000);
    const systemCpuTimeMs = Math.round(cpuDelta.system / 1000);
    const totalCpuTimeMs = userCpuTimeMs + systemCpuTimeMs;
    const cpus = os.cpus();
    const cpuCount = cpus.length || 1;
    // CPU Utilization = (total CPU work time / (elapsed time * total cores)) * 100
    const cpuUtilizationPercent = Number(
      Math.min(100, (totalCpuTimeMs / (elapsedMs * cpuCount)) * 100).toFixed(2)
    );

    // Memory calculations
    const mem = process.memoryUsage();
    const rssMb = Number((mem.rss / 1024 / 1024).toFixed(2));
    const heapTotalMb = Number((mem.heapTotal / 1024 / 1024).toFixed(2));
    const heapUsedMb = Number((mem.heapUsed / 1024 / 1024).toFixed(2));
    const externalMb = Number((mem.external / 1024 / 1024).toFixed(2));
    const arrayBuffersMb = Number(((mem.arrayBuffers || 0) / 1024 / 1024).toFixed(2));
    const heapUtilizationPercent = Number(((heapUsedMb / heapTotalMb) * 100).toFixed(2));

    const systemTotalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const systemFreeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const systemUsedMemMb = systemTotalMemMb - systemFreeMemMb;
    const systemMemoryPercent = Number(((systemUsedMemMb / systemTotalMemMb) * 100).toFixed(2));

    return {
      cpu: {
        loadAvg: os.loadavg().map(l => Number(l.toFixed(2))),
        cpuCount,
        userCpuTimeMs,
        systemCpuTimeMs,
        cpuUtilizationPercent,
      },
      memory: {
        rssMb,
        heapTotalMb,
        heapUsedMb,
        externalMb,
        arrayBuffersMb,
        heapUtilizationPercent,
        systemTotalMemMb,
        systemFreeMemMb,
        systemUsedMemMb,
        systemMemoryPercent,
      },
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logPayload = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV || 'development',
      ...context,
    };
    return JSON.stringify(logPayload);
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { rawError: error };

    console.error(
      this.formatLog('error', message, {
        ...context,
        error: errorDetails,
      })
    );
  }

  metric(metricName: string, value: number, unit: 'ms' | 'count' | 'bytes' | '%' = 'ms', context?: LogContext) {
    console.log(
      this.formatLog('metric', `[Metric] ${metricName}`, {
        ...context,
        metric: { name: metricName, value, unit },
      })
    );
  }

  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.metric(name, durationMs, 'ms', { ...context, durationMs });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`Failed during ${name}`, err, { ...context, durationMs });
      throw err;
    }
  }
}

export const logger = new ObservabilityLogger();
