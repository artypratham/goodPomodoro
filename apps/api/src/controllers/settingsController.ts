import type { Request, Response } from 'express';
import { getSettings, updateSettings } from '../services/settingsService';

export async function getUserSettings(req: Request, res: Response) {
  const userId = req.auth?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const settings = await getSettings(userId);
  if (!settings) {
    res.status(404).json({ error: 'Settings not found' });
    return;
  }

  res.status(200).json(settings);
}

export async function updateUserSettings(req: Request, res: Response) {
  const userId = req.auth?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const settings = await updateSettings(userId, req.body);
    res.status(200).json(settings);
  } catch (error) {
    res.status(400).json({ error: 'Invalid settings' });
  }
}
