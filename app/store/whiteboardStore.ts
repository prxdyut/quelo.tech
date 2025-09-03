import { create } from 'zustand';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { parseMermaid } from '~/utils/parseMermaid';
import type { MermaidData, ActiveTestCaseIndex, TopicAnalysis } from "~/types/whiteboard.ts";

interface WhiteboardState {
  // Mermaid data
  mermaidData: MermaidData;
  activeTestCaseIndex: ActiveTestCaseIndex;
  
  // Processing state
  isProcessing: boolean;
  appendMode: boolean; // Track whether we're appending or replacing
  
  // Excalidraw API reference
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  
  // AI analysis state
  currentTopic: TopicAnalysis | null;
  educationalText: string;
  definition: string;
  examples: string[];
  
  // Actions
  setMermaidData: (data: MermaidData) => void;
  setActiveTestCaseIndex: (index: ActiveTestCaseIndex) => void;
  setIsProcessing: (processing: boolean) => void;
  setAppendMode: (appendMode: boolean) => void;
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
  setCurrentTopic: (topic: TopicAnalysis | null) => void;
  setEducationalText: (text: string) => void;
  setDefinition: (definition: string) => void;
  setExamples: (examples: string[]) => void;
  
  // Complex actions
  updateMermaidDefinition: (definition: string, activeTestCaseIndex: ActiveTestCaseIndex) => Promise<void>;
  appendMermaidDefinition: (definition: string) => Promise<void>;
  resetState: () => void;
}

const initialState = {
  mermaidData: {
    definition: "",
    error: null,
    output: null,
  } as MermaidData,
  activeTestCaseIndex: null as ActiveTestCaseIndex,
  isProcessing: false,
  appendMode: true, // Default to append mode as requested
  excalidrawAPI: null as ExcalidrawImperativeAPI | null,
  currentTopic: null as TopicAnalysis | null,
  educationalText: "",
  definition: "",
  examples: [] as string[],
};

export const useWhiteboardStore = create<WhiteboardState>((set: (partial: Partial<WhiteboardState>) => void) => ({
  ...initialState,
  
  // Simple setters
  setMermaidData: (data: MermaidData) => set({ mermaidData: data }),
  
  setActiveTestCaseIndex: (index: ActiveTestCaseIndex) => set({ activeTestCaseIndex: index }),
  
  setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),
  
  setAppendMode: (appendMode: boolean) => set({ appendMode }),
  
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => set({ excalidrawAPI: api }),
  
  setCurrentTopic: (topic: TopicAnalysis | null) => set({ currentTopic: topic }),
  
  setEducationalText: (text: string) => set({ educationalText: text }),
  
  setDefinition: (definition: string) => set({ definition }),
  
  setExamples: (examples: string[]) => set({ examples }),
  
  // Complex actions
  updateMermaidDefinition: async (definition: string, activeTestCaseIndex: ActiveTestCaseIndex) => {
    try {
      set({ activeTestCaseIndex });
      
      const mermaid = await parseMermaid(definition);
      
      set({
        mermaidData: {
          definition,
          output: mermaid,
          error: null,
        }
      });
      
    } catch (error) {
      set({
        mermaidData: {
          definition,
          output: null,
          error: String(error),
        }
      });
    }
  },

  appendMermaidDefinition: async (definition: string) => {
    try {
      
      const newMermaid = await parseMermaid(definition);
      
      // Get current state to append to existing content
      const currentState = useWhiteboardStore.getState();
      const currentDefinition = currentState.mermaidData.definition;
      
      // Combine definitions with separator
      const combinedDefinition = currentDefinition 
        ? `${currentDefinition}\n\n--- New Analysis ---\n\n${definition}`
        : definition;
      
      set({
        mermaidData: {
          definition: combinedDefinition,
          output: newMermaid,
          error: null,
        }
      });
      
    } catch (error) {
      set({
        mermaidData: {
          definition,
          output: null,
          error: String(error),
        }
      });
    }
  },
  
  resetState: () => set(initialState),
}));

// Selectors for better performance and readability
export const useWhiteboardSelectors = {
  mermaidData: () => useWhiteboardStore((state: WhiteboardState) => state.mermaidData),
  isProcessing: () => useWhiteboardStore((state: WhiteboardState) => state.isProcessing),
  appendMode: () => useWhiteboardStore((state: WhiteboardState) => state.appendMode),
  excalidrawAPI: () => useWhiteboardStore((state: WhiteboardState) => state.excalidrawAPI),
  currentTopic: () => useWhiteboardStore((state: WhiteboardState) => state.currentTopic),
  educationalText: () => useWhiteboardStore((state: WhiteboardState) => state.educationalText),
  definition: () => useWhiteboardStore((state: WhiteboardState) => state.definition),
  examples: () => useWhiteboardStore((state: WhiteboardState) => state.examples),
  activeTestCaseIndex: () => useWhiteboardStore((state: WhiteboardState) => state.activeTestCaseIndex),
};

// Actions selectors
export const useWhiteboardActions = {
  setMermaidData: () => useWhiteboardStore((state: WhiteboardState) => state.setMermaidData),
  setIsProcessing: () => useWhiteboardStore((state: WhiteboardState) => state.setIsProcessing),
  setAppendMode: () => useWhiteboardStore((state: WhiteboardState) => state.setAppendMode),
  setExcalidrawAPI: () => useWhiteboardStore((state: WhiteboardState) => state.setExcalidrawAPI),
  setCurrentTopic: () => useWhiteboardStore((state: WhiteboardState) => state.setCurrentTopic),
  setEducationalText: () => useWhiteboardStore((state: WhiteboardState) => state.setEducationalText),
  setDefinition: () => useWhiteboardStore((state: WhiteboardState) => state.setDefinition),
  setExamples: () => useWhiteboardStore((state: WhiteboardState) => state.setExamples),
  updateMermaidDefinition: () => useWhiteboardStore((state: WhiteboardState) => state.updateMermaidDefinition),
  appendMermaidDefinition: () => useWhiteboardStore((state: WhiteboardState) => state.appendMermaidDefinition),
  resetState: () => useWhiteboardStore((state: WhiteboardState) => state.resetState),
};
