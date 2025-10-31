/**
 * M&A Prediction Store (Zustand)
 *
 * Client-side state management for M&A predictions
 *
 * Part of T038 implementation
 */

import { create } from 'zustand';
import type { MAPrediction, MAPredictionDetail } from '@/lib/types/ma-prediction';

interface MAPredictionStore {
  // State
  currentPrediction: MAPredictionDetail | null;
  predictionHistory: MAPrediction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPrediction: (companyId: string, include?: string) => Promise<void>;
  fetchHistory: (companyId: string, limit?: number) => Promise<void>;
  clearPrediction: () => void;
  setError: (error: string | null) => void;
}

export const useMAPredictionStore = create<MAPredictionStore>((set, get) => ({
  // Initial state
  currentPrediction: null,
  predictionHistory: [],
  isLoading: false,
  error: null,

  // Fetch current prediction for a company
  fetchPrediction: async (companyId: string, include: string = 'all') => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/ma-predictions/${companyId}?include=${include}`);

      if (!response.ok) {
        if (response.status === 404) {
          const error = await response.json();
          set({
            currentPrediction: null,
            isLoading: false,
            error: error.message || 'No M&A prediction available for this company'
          });
          return;
        }

        throw new Error(`Failed to fetch prediction: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        currentPrediction: {
          ...data.prediction,
          factors: data.factors || [],
          valuation: data.valuation || undefined,
          acquirer_profiles: data.acquirer_profiles || [],
          company: data.prediction.company || { id: companyId, name: 'Unknown', company_number: '' }
        },
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching M&A prediction:', error);
      set({
        currentPrediction: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prediction'
      });
    }
  },

  // Fetch historical predictions for a company
  fetchHistory: async (companyId: string, limit: number = 10) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/ma-predictions/${companyId}/history?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();

      set({
        predictionHistory: data.predictions || [],
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching prediction history:', error);
      set({
        predictionHistory: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history'
      });
    }
  },

  // Clear current prediction
  clearPrediction: () => {
    set({
      currentPrediction: null,
      predictionHistory: [],
      error: null
    });
  },

  // Set error manually
  setError: (error: string | null) => {
    set({ error });
  }
}));
