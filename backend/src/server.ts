import express from 'express';
import http from 'http';
import cors from 'cors';
import { initKeyInfrastructure } from './crypto/keys.js';
import { initWebSocketServer } from './websocket/server.js';
import apiRouter from './routes/api.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers (JSON & URL-encoded for OAuth forms)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'Inji Interoperability Playground BFF',
    timestamp: new Date().toISOString()
  });
});

// Register API routes
app.use('/api', apiRouter);

// Initialize WebSocket server
initWebSocketServer(server);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function bootstrap() {
  try {
    console.log('Initializing Cryptographic Key Infrastructure...');
    const keys = await initKeyInfrastructure();
    console.log('✓ Cryptographic keys initialized successfully:');
    console.log(`  - Inji Certify Issuer: ${keys.injiCertifyIssuer.did} (${keys.injiCertifyIssuer.alg})`);
    console.log(`  - External OID4VCI Issuer: ${keys.externalIssuer.did.substring(0, 40)}... (${keys.externalIssuer.alg})`);
    console.log(`  - Inji Wallet Holder: ${keys.injiWalletHolder.did} (${keys.injiWalletHolder.alg})`);
    console.log(`  - Inji Verifier: ${keys.injiVerifier.did} (${keys.injiVerifier.alg})`);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${PORT} is already in use by another running process.`);
        console.error(`To resolve this on Windows, run:`);
        console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
        console.error(`Or set a different port with: PORT=4001 npm start\n`);
      } else {
        console.error('[ERROR] Server listener error:', err);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Inji Interoperability Playground Backend running on:`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`   WebSocket stream at ws://localhost:${PORT}/ws`);
      console.log(`   OpenID4VCI Metadata: http://localhost:${PORT}/api/.well-known/openid-credential-issuer`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();

export { app, server };
