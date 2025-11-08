/**
 * Hypothesis Zustand Store
 * Client-side state management for Hypothesis Tracker feature
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HypothesisStatus, HypothesisType } from '../data-room/types';

export type HypothesisFilter = {
  status?: HypothesisStatus;
  hypothesis_type?: HypothesisType;
  confidence_min?: number;
  confidence_max?: number;
  tags?: string[];
  search?: string;
};

export type AnalysisProgress = {
  total_documents: number;
  processed_documents: number;
  evidence_found: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
};

interface HypothesisState {
  // Current hypothesis
  currentHypothesisId: string | null;
  setCurrentHypothesis: (id: string | null) => void;

  // Filters
  hypothesisFilters: HypothesisFilter;
  setHypothesisFilters: (filters: HypothesisFilter) => void;
  clearHypothesisFilters: () => void;

  // Selected evidence (for batch actions)
  selectedEvidence: string[];
  toggleEvidenceSelection: (id: string) => void;
  selectAllEvidence: (ids: string[]) => void;
  clearEvidenceSelection: () => void;

  // Analysis progress tracking
  analysisProgress: Record<string, AnalysisProgress>;
  updateAnalysisProgress: (hypothesisId: string, progress: AnalysisProgress) => void;
  clearAnalysisProgress: (hypothesisId: string) => void;

  // View state
  evidenceView: 'list' | 'grid';
  setEvidenceView: (view: 'list' | 'grid') => void;

  // Editor state
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  editingHypothesisId: string | null;
  setEditingHypothesisId: (id: string | null) => void;

  // Metrics editor
  metricsEditorOpen: boolean;
  setMetricsEditorOpen: (open: boolean) => void;

  // Validation dialog
  validationDialogOpen: boolean;
  setValidationDialogOpen: (open: boolean) => void;
}

export const useHypothesisStore = create<HypothesisState>()(
  persist(
    (set) => ({
      // Current hypothesis
      currentHypothesisId: null,
      setCurrentHypothesis: (id) => set({ currentHypothesisId: id }),

      // Filters
      hypothesisFilters: {},
      setHypothesisFilters: (filters) =>
        set((state) => ({
          hypothesisFilters: { ...state.hypothesisFilters, ...filters },
        })),
      clearHypothesisFilters: () => set({ hypothesisFilters: {} }),

      // Selected evidence
      selectedEvidence: [],
      toggleEvidenceSelection: (id) =>
        set((state) => ({
          selectedEvidence: state.selectedEvidence.includes(id)
            ? state.selectedEvidence.filter((evidenceId) => evidenceId !== id)
            : [...state.selectedEvidence, id],
        })),
      selectAllEvidence: (ids) => set({ selectedEvidence: ids }),
      clearEvidenceSelection: () => set({ selectedEvidence: [] }),

      // Analysis progress (not persisted)
      analysisProgress: {},
      updateAnalysisProgress: (hypothesisId, progress) =>
        set((state) => ({
          analysisProgress: {
            ...state.analysisProgress,
            [hypothesisId]: progress,
          },
        })),
      clearAnalysisProgress: (hypothesisId) =>
        set((state) => {
          const { [hypothesisId]: _, ...rest } = state.analysisProgress;
          return { analysisProgress: rest };
        }),

      // View state
      evidenceView: 'list',
      setEvidenceView: (view) => set({ evidenceView: view }),

      // Editor state
      editorOpen: false,
      setEditorOpen: (open) => set({ editorOpen: open }),
      editingHypothesisId: null,
      setEditingHypothesisId: (id) => set({ editingHypothesisId: id }),

      // Metrics editor
      metricsEditorOpen: false,
      setMetricsEditorOpen: (open) => set({ metricsEditorOpen: open }),

      // Validation dialog
      validationDialogOpen: false,
      setValidationDialogOpen: (open) => set({ validationDialogOpen: open }),
    }),
    {
      name: 'hypothesis-storage',
      // Only persist user preferences, not temporary state
      partialize: (state) => ({
        hypothesisFilters: state.hypothesisFilters,
        evidenceView: state.evidenceView,
      }),
    }
  )
);

// Selectors for common use cases
export const useCurrentHypothesis = () =>
  useHypothesisStore((state) => state.currentHypothesisId);

export const useHypothesisFilters = () =>
  useHypothesisStore((state) => state.hypothesisFilters);

export const useSelectedEvidence = () =>
  useHypothesisStore((state) => state.selectedEvidence);

export const useAnalysisProgress = (hypothesisId: string) =>
  useHypothesisStore((state) => state.analysisProgress[hypothesisId]);

export const useHasActiveAnalysis = () => {
  const analysisProgress = useHypothesisStore((state) => state.analysisProgress);
  return Object.values(analysisProgress).some((progress) => progress.status === 'running');
};
