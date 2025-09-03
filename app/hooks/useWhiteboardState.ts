import { useCallback, useDeferredValue } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useWhiteboardSelectors, useWhiteboardActions } from "~/store/whiteboardStore";

export const useWhiteboardState = () => {
    const mermaidData = useWhiteboardSelectors.mermaidData();
    const isProcessing = useWhiteboardSelectors.isProcessing();
    const excalidrawAPI = useWhiteboardSelectors.excalidrawAPI();
    const activeTestCaseIndex = useWhiteboardSelectors.activeTestCaseIndex();
    
    const setExcalidrawAPI = useWhiteboardActions.setExcalidrawAPI();
    const updateMermaidDefinition = useWhiteboardActions.updateMermaidDefinition();
    
    const deferredMermaidData = useDeferredValue(mermaidData);

    const handleExcalidrawAPIReady = useCallback((api: ExcalidrawImperativeAPI) => {
        setExcalidrawAPI(api);
    }, [setExcalidrawAPI]);

    return {
        mermaidData,
        activeTestCaseIndex,
        isProcessing,
        deferredMermaidData,
        excalidrawAPI,
        handleOnChange: updateMermaidDefinition,
        handleExcalidrawAPIReady,
    };
};
