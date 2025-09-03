import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types.js";
import { parseMermaid } from "~/utils/parseMermaid";

export interface MermaidData {
    definition: string;
    output: Awaited<ReturnType<typeof parseMermaid>> | null;
    error: string | null;
}

export type ActiveTestCaseIndex = number | "custom" | null;

export interface TopicAnalysis {
    title: string;
    description: string;
    teachingTechnique: string;
}

export interface WhiteboardState {
    mermaidData: MermaidData;
    activeTestCaseIndex: ActiveTestCaseIndex;
    isProcessing: boolean;
    excalidrawAPIRef: React.RefObject<ExcalidrawImperativeAPI | null>;
}

export interface AIServiceConfig {
    apiKey: string;
    dangerouslyAllowBrowser: boolean;
}
