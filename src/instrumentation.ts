/**
 * Next.js 16 Instrumentation Hook
 *
 * Initializes vendor-neutral OpenTelemetry SDK in Node.js runtime when enabled.
 * Telemetry Failure Rule: Telemetry failure must never affect business request handling.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.OTEL_SDK_DISABLED === 'true') {
      return;
    }

    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-proto');
      const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-proto');
      const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
      const { resourceFromAttributes } = await import('@opentelemetry/resources');

      const serviceName = process.env.OTEL_SERVICE_NAME || 'sigmago-web';
      const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

      const sdk = new NodeSDK({
        resource: resourceFromAttributes({
          'service.name': serviceName,
          'deployment.environment': process.env.NODE_ENV || 'production',
          'service.version': '0.1.0',
        }),
        traceExporter: new OTLPTraceExporter({
          url: `${otlpEndpoint}/v1/traces`,
        }),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${otlpEndpoint}/v1/metrics`,
          }),
          exportIntervalMillis: 15000,
        }),
      });

      sdk.start();

      process.on('SIGTERM', () => {
        sdk
          .shutdown()
          .catch((err) => console.warn('[OTel] Error shutting down OpenTelemetry SDK:', err));
      });
    } catch (err: any) {
      // Non-blocking: Telemetry failure must never prevent web app from booting
      console.warn('[OTel] OpenTelemetry initialization warning/skipped:', err.message);
    }
  }
}
