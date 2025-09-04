"use client"
import React from "react";
import ExcalidrawWrapper from "~/components/ExcalidrawWrapper.js";
import { useWhiteboardState } from "../hooks/useWhiteboardState";
import { useAIAnalysis } from "../hooks/useAIAnalysis";
import { useWhiteboardSelectors } from "../store/whiteboardStore";
import AnalyzeButton from "~/components/AnalyzeButton";

// Re-export types for backward compatibility
export type { MermaidData, ActiveTestCaseIndex } from "../types/whiteboard.ts";

const Whiteboard: React.FC = () => {
    const {
        deferredMermaidData,
        handleExcalidrawAPIReady,
    } = useWhiteboardState();

    const isProcessing = useWhiteboardSelectors.isProcessing();
    const excalidrawAPI = useWhiteboardSelectors.excalidrawAPI();
    const { analyzeFrame } = useAIAnalysis();

    return (
        <div id="excalidraw">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', position: "absolute", bottom: "10px" }}>
                <AnalyzeButton
                    onClick={analyzeFrame}
                    isProcessing={isProcessing}
                    isAPIReady={!!excalidrawAPI}
                />
            </div>
            <ExcalidrawWrapper
                mermaidDefinition={deferredMermaidData.definition}
                mermaidOutput={deferredMermaidData.output}
                onExcalidrawAPIReady={handleExcalidrawAPIReady}
                appendMode={true}
            />
        </div>
    );
};

export default Whiteboard;