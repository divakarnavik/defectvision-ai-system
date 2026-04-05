import React, { createContext, useContext, useState, useCallback } from 'react';
import { HistoryEntry, LearnedPattern, TrainedImageData } from '../types';

interface AppContextType {
  history: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  clearHistory: () => void;
  learnedPatterns: LearnedPattern[];
  addLearnedPatterns: (patterns: LearnedPattern[]) => void;
  clearPatterns: () => void;
  modelTrained: boolean;
  setModelTrained: (v: boolean) => void;
  modelName: string;
  setModelName: (v: string) => void;
  trainedImages: TrainedImageData[];
  addTrainedImage: (img: TrainedImageData) => void;
  clearTrainedImages: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([]);
  const [modelTrained, setModelTrained] = useState(false);
  const [modelName, setModelName] = useState('defect_model_v1');
  const [trainedImages, setTrainedImages] = useState<TrainedImageData[]>([]);

  const addHistoryEntry = useCallback((entry: Omit<HistoryEntry, 'id'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: 'h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    };
    setHistory(prev => [newEntry, ...prev].slice(0, 200));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const addLearnedPatterns = useCallback((patterns: LearnedPattern[]) => {
    setLearnedPatterns(prev => [...prev, ...patterns]);
  }, []);

  const clearPatterns = useCallback(() => {
    setLearnedPatterns([]);
    setModelTrained(false);
  }, []);

  const addTrainedImage = useCallback((img: TrainedImageData) => {
    setTrainedImages(prev => [...prev, img]);
  }, []);

  const clearTrainedImages = useCallback(() => {
    setTrainedImages([]);
  }, []);

  return (
    <AppContext.Provider value={{
      history, addHistoryEntry, clearHistory,
      learnedPatterns, addLearnedPatterns, clearPatterns,
      modelTrained, setModelTrained,
      modelName, setModelName,
      trainedImages, addTrainedImage, clearTrainedImages,
    }}>
      {children}
    </AppContext.Provider>
  );
};
