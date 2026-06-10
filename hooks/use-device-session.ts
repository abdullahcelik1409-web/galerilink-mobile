import { useCallback } from 'react';
import { SessionManager } from '@/lib/session-manager';

export function useDeviceSession() {
  const registerCurrentDevice = useCallback((userId: string) => {
    return SessionManager.upsertSession(userId);
  }, []);

  const getCurrentDeviceId = useCallback(() => {
    return SessionManager.getDeviceId();
  }, []);

  const terminateCurrentDevice = useCallback(async (userId: string) => {
    const deviceId = await SessionManager.getDeviceId();
    return SessionManager.terminateSession(userId, deviceId);
  }, []);

  const isCurrentDeviceSessionActive = useCallback(async (userId: string) => {
    const deviceId = await SessionManager.getDeviceId();
    const { data, error } = await SessionManager.getActiveSessions(userId);
    if (error) throw error;
    return data?.some((session) => session.device_id === deviceId) ?? false;
  }, []);

  return {
    registerCurrentDevice,
    getCurrentDeviceId,
    terminateCurrentDevice,
    isCurrentDeviceSessionActive,
  };
}
