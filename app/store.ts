// app/store.ts
'use client';
import { create } from 'zustand';
import type { DashboardState, AnalyticsResult, AIResponse, Channel, Granularity, CollectStatus } from '@/lib/types';

interface DashboardStore extends DashboardState {
  setDateRange: (start: string, end: string) => void;
  setGranularity: (g: Granularity) => void;
  setKeywords: (kws: string[]) => void;
  setChannels: (chs: Channel[]) => void;
  setGalleries: (gs: string[]) => void;
  setAnalytics: (a: AnalyticsResult | null) => void;
  setAIResponse: (r: AIResponse | null) => void;
  setLoading: (v: boolean) => void;
  setAILoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setDemo: (v: boolean) => void;
  setCollectStatuses: (s: CollectStatus[]) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  granularity: 'monthly',
  selectedKeywords: ['한국주택금융공사', 'HF', '보금자리론', '주택연금', '전세자금보증'],
  selectedChannels: ['news', 'dc', 'blog', 'tistory', 'blind', 'instagram'],
  selectedGalleries: ['loan', 'house', 'finance'],
  analytics: null,
  aiResponse: null,
  isLoading: false,
  isAiLoading: false,
  error: null,
  isDemo: false,
  collectStatuses: [],

  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
  setGranularity: (g) => set({ granularity: g }),
  setKeywords: (kws) => set({ selectedKeywords: kws }),
  setChannels: (chs) => set({ selectedChannels: chs }),
  setGalleries: (gs) => set({ selectedGalleries: gs }),
  setAnalytics: (a) => set({ analytics: a }),
  setAIResponse: (r) => set({ aiResponse: r }),
  setLoading: (v) => set({ isLoading: v }),
  setAILoading: (v) => set({ isAiLoading: v }),
  setError: (e) => set({ error: e }),
  setDemo: (v) => set({ isDemo: v }),
  setCollectStatuses: (s) => set({ collectStatuses: s }),
}));
