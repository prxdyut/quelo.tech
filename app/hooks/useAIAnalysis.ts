import { useCallback } from "react";
import { exportToBlob, convertToExcalidrawElements, FONT_FAMILY } from "@excalidraw/excalidraw";
import { aiService } from "~/services/aiService";
import { EXPORT_CONFIG } from "~/constants/whiteboard.js";
import { useWhiteboardSelectors, useWhiteboardActions } from "~/store/whiteboardStore";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { extractSpecialContent } from "../utils/text";
import { convertMarkdownTreeToElements } from "../utils/markdown";

interface CategoryResult {
    category: string;
    content: string;
    type: 'markdown' | 'latex';
}
// Utility function to convert LaTeX to base64 image
const convertLatexToImage = async (latexContent: string): Promise<string> => {
    try {
        // For now, we'll use a placeholder service. In production, you'd want to use:
        // - MathJax server-side rendering
        // - LaTeX to PNG conversion service
        // - Or a local LaTeX renderer

        // Placeholder implementation - in practice you'd call a LaTeX rendering service
        const response = await fetch('https://latex.codecogs.com/png.latex?' + encodeURIComponent(latexContent));
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert LaTeX to image:', error);
        // Return a simple text-based fallback
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            canvas.width = 400;
            canvas.height = 200;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = '14px monospace';
            ctx.fillText('LaTeX Content:', 10, 30);
            ctx.fillText(latexContent.substring(0, 50) + '...', 10, 50);
            return canvas.toDataURL();
        }
        throw error;
    }
};

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
            // Step 1: Analyze image with context
            const topic = await aiService.analyzeImageWithContext(imageBlob);
            setCurrentTopic(topic);

            // Step 2: Generate topics breakdown (2-3 most relevant categories)
            const selectedCategories = await aiService.generateTopicsBreakdown(topic);
            console.log('Selected categories for topic:', selectedCategories);

            // Step 3: Generate content for each selected category in parallel
            const categoryPromises = selectedCategories.map(async (category) => {
                try {
                    let categoryContent = '';
                    let contentType: 'markdown' | 'latex' = 'markdown';

                    // Determine content type based on category
                    const latexCategories = ['Formulas', 'Identities', 'Proofs', 'Derivations'];
                    contentType = latexCategories.includes(category) ? 'latex' : 'markdown';

                    switch (category) {
                        case 'Definition':
                            categoryContent = await aiService.generateDefinition(topic);
                            break;
                        case 'KeyConcepts':
                            categoryContent = await aiService.generateKeyConcepts(topic);
                            break;
                        case 'Formulas':
                            categoryContent = await aiService.generateFormulas(topic);
                            break;
                        case 'Examples':
                            categoryContent = await aiService.generateExamples(topic);
                            break;
                        case 'RealLifeApplications':
                            categoryContent = await aiService.generateRealLifeApplications(topic);
                            break;
                        case 'CrossDisciplinaryConnections':
                            categoryContent = await aiService.generateCrossDisciplinaryConnections(topic);
                            break;
                        case 'Mnemonics':
                            categoryContent = await aiService.generateMnemonics(topic);
                            break;
                        case 'References':
                            categoryContent = await aiService.generateReferences(topic);
                            break;
                        case 'Comparisons':
                            categoryContent = await aiService.generateComparisons(topic);
                            break;
                        case 'Resources':
                            categoryContent = await aiService.generateResources(topic);
                            break;
                        default:
                            console.warn(`Unknown category: ${category}, using Examples as fallback`);
                            categoryContent = await aiService.generateExamples(topic);
                    }

                    return categoryContent && categoryContent.trim() ? {
                        category,
                        content: categoryContent,
                        type: contentType
                    } as CategoryResult : null;
                } catch (error) {
                    console.error(`Failed to generate content for category ${category}:`, error);
                    return null; // Return null on error to continue with other categories
                }
            });

            // Wait for all category content to be generated in parallel
            const categoryResults = await Promise.all(categoryPromises);
            const validCategoryResults: CategoryResult[] = categoryResults.filter((result): result is CategoryResult => result !== null);

            // Separate markdown and LaTeX content
            const markdownResults = validCategoryResults.filter(result => result.type === 'markdown');
            const latexResults = validCategoryResults.filter(result => result.type === 'latex');

            // Combine markdown content
            let combinedEducationalText = `# ${topic.title}\n\n${topic.description}\n\n`;
            combinedEducationalText += markdownResults.map(result =>
                `\n## ${result.category}\n\n${result.content}\n\n`
            ).join('');

            // Extract table content from the combined educational text
            const { cleanText, tableBlocks } = extractSpecialContent(combinedEducationalText);

            console.log('Combined educational text:', combinedEducationalText);
            console.log('Clean text after extraction:', cleanText);
            console.log('Extracted table blocks:', tableBlocks);
            console.log('LaTeX results:', latexResults);

            // Process mindmaps and remove failed sections from educational text
            let processedEducationalText = combinedEducationalText;
            const mindmapMatches = [...combinedEducationalText.matchAll(/### Mindmap\s*\n([\s\S]*?)(?=###|$)/g)];
            for (const match of mindmapMatches) {
                const mindmapText = match[1].trim();
                const fullMatch = match[0];
                if (mindmapText) {
                    try {
                        const mermaidCode = await aiService.validateDiagramJSON(topic, mindmapText, "flowchart");
                        console.log('Validated mindmap mermaid code:', mermaidCode);
                        appendMermaidDefinition(mermaidCode);
                    } catch (error) {
                        console.error('Mindmap processing failed:', error);
                        // Remove the failed mindmap section from the educational text
                        processedEducationalText = processedEducationalText.replace(fullMatch, '');
                    }
                }
            }

            // Update the educational text with processed content
            setEducationalText(processedEducationalText);

            // Convert markdown to JSON using the processed text
            const tree = remark().use(remarkParse).use(remarkGfm).parse(processedEducationalText);
            const educationalJson = JSON.stringify(tree, null, 2);
            console.log("Educational JSON:", educationalJson);

            if (excalidrawAPI) {
                // Get existing elements and viewport information
                const existingElements = excalidrawAPI.getSceneElements();
                const appState = excalidrawAPI.getAppState();
                const viewportWidth = appState.width || 800;
                const viewportHeight = appState.height || 600;
                const scrollX = appState.scrollX || 0;
                const scrollY = appState.scrollY || 0;

                // Calculate positions for educational text
                const centerX = scrollX + viewportWidth / 2 - 200; // Offset for text width
                const educationalY = scrollY + 50; // Top position for educational text

                // Process markdown content as before
                const markDownTree = await convertMarkdownTreeToElements(tree, centerX, educationalY, excalidrawAPI, existingElements as any[], topic, processedEducationalText, tableBlocks);

                // Process LaTeX content as images
                let currentY = educationalY + 800; // Position LaTeX content below markdown content

                for (const latexResult of latexResults) {
                    try {
                        const imageDataUrl = await convertLatexToImage(latexResult.content);

                        // Create a simple text element to display LaTeX category and content info
                        // For now, we'll create a text placeholder until we can properly handle image elements
                        const latexTextElement = convertToExcalidrawElements([{
                            type: "text",
                            x: centerX,
                            y: currentY,
                            width: 400,
                            height: 100,
                            text: `${latexResult.category}\n\n[LaTeX Content - Image conversion]\n\nContent: ${latexResult.content.substring(0, 100)}...`,
                            fontSize: 16,
                            fontFamily: FONT_FAMILY.Virgil,
                            textAlign: "left",
                            verticalAlign: "top",
                            strokeColor: "#000000",
                            backgroundColor: "transparent"
                        }]);

                        // Add the text element to existing elements
                        if (latexTextElement && latexTextElement.length > 0) {
                            const updatedElements = [...excalidrawAPI.getSceneElements(), ...latexTextElement];
                            excalidrawAPI.updateScene({ elements: updatedElements });
                        }

                        currentY += 150; // Move down for next LaTeX content

                    } catch (error) {
                        console.error(`Failed to process LaTeX content for ${latexResult.category}:`, error);
                    }
                }

                // Scroll to show the new elements
                excalidrawAPI.scrollToContent(existingElements, { fitToContent: false });
            } else {
                console.error('ExcalidrawAPI not available for adding text elements');
            }

        } catch (error) {
            console.error('AI processing failed:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [setIsProcessing, setCurrentTopic, setEducationalText, updateMermaidDefinition, excalidrawAPI]);

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
