import { useState, useEffect, useCallback } from 'react';
import { Retrospective } from '@/types/Retrospective';

const STORAGE_KEY = 'scrum-teens-retrospectives';

const generateId = (): string => {
  return `retro-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const loadRetros = (): Retrospective[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    console.warn('Failed to parse retrospectives from localStorage');
    return [];
  }
};

const saveRetros = (retros: Retrospective[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(retros));
  } catch (err) {
    console.error('Failed to save retrospectives to localStorage:', err);
  }
};

export const useRetrospectives = () => {
  const [retros, setRetros] = useState<Retrospective[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadRetros();
    // Sort by createdAt descending (newest first)
    stored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRetros(stored);
    setLoading(false);
  }, []);

  const createRetro = useCallback((data: {
    sprintDate: string;
    wentWell: string;
    improve: string;
    tryNext: string;
    mood: string;
  }): Retrospective => {
    const newRetro: Retrospective = {
      id: generateId(),
      sprintDate: data.sprintDate,
      wentWell: data.wentWell,
      improve: data.improve,
      tryNext: data.tryNext,
      mood: data.mood,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRetro, ...retros];
    setRetros(updated);
    saveRetros(updated);
    return newRetro;
  }, [retros]);

  const deleteRetro = useCallback((id: string): void => {
    const updated = retros.filter(r => r.id !== id);
    setRetros(updated);
    saveRetros(updated);
  }, [retros]);

  const getRetros = useCallback((): Retrospective[] => {
    return retros;
  }, [retros]);

  return {
    retros,
    loading,
    createRetro,
    deleteRetro,
    getRetros,
  };
};
