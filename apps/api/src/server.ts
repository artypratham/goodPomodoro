import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import statsRoutes from './routes/statsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import { httpsOnly } from './middleware/httpsOnly';
import { originCheck } from './middleware/originCheck';
import { env, assertRequiredEnv } from './config/env';

assertRequiredEnv();

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: env.corsOrigin.split(',').map((value) => value.trim()),
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use(httpsOnly);
app.use(originCheck);

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API running on port ${env.port}`);
});
