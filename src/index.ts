import 'dotenv/config';
import app from './app';
import { checkDbConnection } from './db';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  try {
    // Verify database connectivity before starting the server
    await checkDbConnection();

    app.listen(PORT, () => {
      console.info(`\n🚀 dTopMate API server running on port ${PORT}`);
      console.info(`   Environment : ${process.env.NODE_ENV || 'development'}`);
      console.info(`   Health check: http://localhost:${PORT}/health`);
      console.info(`   API base    : http://localhost:${PORT}/api/v1`);
      console.info(`   Payment mode: ${process.env.PAYMENT_MODE || 'mock'}`);
      // TODO [Solana]: Log Solana RPC URL and program ID when Web3 phase is enabled
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

main();
