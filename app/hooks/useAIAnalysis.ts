import { useCallback } from "react";
import { exportToBlob } from "@excalidraw/excalidraw";
import { aiService } from "~/services/aiService";
import { EXPORT_CONFIG } from "~/constants/whiteboard.js";
import { useWhiteboardSelectors, useWhiteboardActions } from "~/store/whiteboardStore";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { extractSpecialContent } from "../utils/text";
import { convertMarkdownTreeToElements } from "../utils/markdown";

export const useAIAnalysis = () => {
    const excalidrawAPI = useWhiteboardSelectors.excalidrawAPI();
    const setIsProcessing = useWhiteboardActions.setIsProcessing();
    const setCurrentTopic = useWhiteboardActions.setCurrentTopic();
    const setEducationalText = useWhiteboardActions.setEducationalText();
    const updateMermaidDefinition = useWhiteboardActions.updateMermaidDefinition();
    const appendMermaidDefinition = useWhiteboardActions.appendMermaidDefinition();

    const processWithAI = useCallback(async (imageBlob: Blob) => {
        setIsProcessing(true);

        try {
            const topic = await aiService.analyzeImageWithContext(imageBlob);
            setCurrentTopic(topic);
            
            let definitionContent = '';
            try {
                definitionContent = await aiService.generateDefinition(topic);
            } catch (error) {
                console.error('Failed to generate definition content:', error);
            }

            let combinedEducationalText = `# ${topic.title}\n\n`;
            if (definitionContent.trim()) {
                combinedEducationalText += `\n## Definition\n\n${definitionContent}\n\n`;
            }
            
            const { tableBlocks } = extractSpecialContent(combinedEducationalText);
            setEducationalText(combinedEducationalText);
            const tree = remark().use(remarkParse).use(remarkGfm).parse(combinedEducationalText);

            if (excalidrawAPI) {
                const existingElements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();
                const viewportWidth = appState.width || 800;
                const viewportHeight = appState.height || 600;
                const centerX = (appState.scrollX || 0) + viewportWidth / 2 - 200;
                const educationalY = (appState.scrollY || 0) + 50;
                
                await convertMarkdownTreeToElements(
                    tree, 
                    centerX, 
                    educationalY, 
                    excalidrawAPI, 
                    existingElements as any[], 
                    topic, 
                    combinedEducationalText, 
                    tableBlocks
                );
                excalidrawAPI.scrollToContent(existingElements, { fitToContent: false });
            } else {
                console.error('ExcalidrawAPI not available for adding text elements');
            }

        } catch (error) {
            console.error('AI processing failed:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [setIsProcessing, setCurrentTopic, setEducationalText, excalidrawAPI]);

    const analyzeFrame = useCallback(async () => {
        if (!excalidrawAPI) {
            console.error('Cannot analyze frame: Excalidraw API not available. Please wait for the canvas to finish loading.');
            return;
        }

        try {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const files = excalidrawAPI.getFiles();

            const blob = await exportToBlob({
                elements,
                appState: {
                    ...appState,
                    exportBackground: EXPORT_CONFIG.BACKGROUND,
                    viewBackgroundColor: EXPORT_CONFIG.BACKGROUND_COLOR,
                },
                files,
                mimeType: EXPORT_CONFIG.MIME_TYPE,
                quality: EXPORT_CONFIG.QUALITY,
                exportPadding: EXPORT_CONFIG.PADDING,
            });

            // Clear the frame before processing AI response
            excalidrawAPI.updateScene({ elements: [] });

            await processWithAI(blob);

        } catch (error) {
            console.error('Frame analysis failed:', error);
        }
    }, [excalidrawAPI, processWithAI]);

    return {
        analyzeFrame,
        processWithAI,
    };
};
