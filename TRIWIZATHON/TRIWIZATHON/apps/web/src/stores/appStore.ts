import { create } from 'zustand';
import type { PlanResponse } from '../lib/api';

type AppState = {
  datasetId: string | null;
  planId: string | null;
  scenarioId: string | null;
  baselinePlan: PlanResponse | null;
  disruptedPlan: PlanResponse | null;
  recoveredPlan: PlanResponse | null;
  setDatasetId: (id: string | null) => void;
  setPlanId: (id: string | null) => void;
  setScenarioId: (id: string | null) => void;
  setBaselinePlan: (p: PlanResponse | null) => void;
  setDisruptedPlan: (p: PlanResponse | null) => void;
  setRecoveredPlan: (p: PlanResponse | null) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  datasetId: null,
  planId: null,
  scenarioId: null,
  baselinePlan: null,
  disruptedPlan: null,
  recoveredPlan: null,
  setDatasetId: (datasetId) => set({ datasetId }),
  setPlanId: (planId) => set({ planId }),
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setBaselinePlan: (baselinePlan) => set({ baselinePlan }),
  setDisruptedPlan: (disruptedPlan) => set({ disruptedPlan }),
  setRecoveredPlan: (recoveredPlan) => set({ recoveredPlan }),
  reset: () =>
    set({
      datasetId: null,
      planId: null,
      scenarioId: null,
      baselinePlan: null,
      disruptedPlan: null,
      recoveredPlan: null,
    }),
}));
