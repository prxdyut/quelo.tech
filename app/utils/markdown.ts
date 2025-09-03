import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parseMermaid } from "./parseMermaid.js";
import { graphToExcalidraw } from "./graphToExcalidraw.js";
import type { TopicAnalysis } from "../types/whiteboard.ts";
import { preprocessMermaidCode } from "./mermaid.js";
import { convertHtmlTableToMarkdown, createVisualTableElements } from "./table.ts";

/**
 * Convert LaTeX to SVG image data URL using MathJax
 */
async function convertLatexToImage(latexCode: string): Promise<string> {
    try {
        // Load MathJax dynamically
        if (!(window as any).MathJax) {
            await loadMathJax();
        }

        const MathJax = (window as any).MathJax;

        // Create a temporary container for rendering
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.innerHTML = `\\[${latexCode}\\]`;
        document.body.appendChild(tempDiv);

        // Wait for MathJax to process
        await MathJax.typesetPromise([tempDiv]);

        // Get the rendered SVG
        const svgElement = tempDiv.querySelector('mjx-container svg');
        if (!svgElement) {
            document.body.removeChild(tempDiv);
            return '';
        }

        // Convert SVG to data URL
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

        // Clean up
        document.body.removeChild(tempDiv);

        return svgDataUrl;
    } catch (error) {
        console.error('Failed to convert LaTeX to image:', error);
        return '';
    }
}

/**
 * Process text content and extract LaTeX equations
 */
async function processTextWithLatex(textContent: string, startX: number, depth: number, currentY: number, excalidrawAPI: any): Promise<{ elements: any[], newY: number }> {
    const elements: any[] = [];
    let y = currentY;

    const latexRegex = /<latex>(.*?)<\/latex>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = latexRegex.exec(textContent)) !== null) {
        // Add text before LaTeX
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: textContent.slice(lastIndex, match.index)
            });
        }

        // Add LaTeX as image
        parts.push({
            type: 'latex',
            content: match[1].trim()
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < textContent.length) {
        parts.push({
            type: 'text',
            content: textContent.slice(lastIndex)
        });
    }

    // If no LaTeX found, return original text as single element
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
        if (textContent.trim()) {
            elements.push({
                type: 'text',
                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                x: startX + depth * 20,
                y: y,
                width: 400,
                height: 30,
                text: textContent,
                fontSize: 14,
                fontFamily: 1,
                textAlign: 'left',
                verticalAlign: 'top',
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'hachure',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: 1,
                link: null,
                locked: false,
            });
            y += 30;
        }
        return { elements, newY: y };
    }

    // Process parts with LaTeX
    for (const part of parts) {
        if (part.type === 'latex') {
            try {
                const imageDataUrl = await convertLatexToImage(part.content);
                
                if (imageDataUrl) {
                    const imageElement = {
                        type: 'image',
                        id: `latex-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: y,
                        width: 300,
                        height: 50,
                        fileId: `latex-file-${Math.random().toString(36).substr(2, 9)}`,
                        status: 'saved',
                        scale: [1, 1],
                        strokeColor: 'transparent',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    };

                    elements.push(imageElement);

                    // Create file data for the image
                    const fileData = {
                        id: imageElement.fileId,
                        dataURL: imageDataUrl,
                        mimeType: 'image/svg+xml',
                        created: Date.now(),
                    };

                    // Add file to Excalidraw
                    excalidrawAPI.addFiles([fileData]);

                    y += 60;
                } else {
                    // Fallback to text
                    elements.push({
                        type: 'text',
                        id: `latex-error-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: y,
                        width: 300,
                        height: 25,
                        text: `LaTeX: ${part.content}`,
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#ff6b35',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    y += 30;
                }
            } catch (error) {
                console.error('Failed to convert LaTeX to image:', error);
                elements.push({
                    type: 'text',
                    id: `latex-error-${Math.random().toString(36).substr(2, 9)}`,
                    x: startX + depth * 20,
                    y: y,
                    width: 300,
                    height: 25,
                    text: `LaTeX Error: ${part.content}`,
                    fontSize: 14,
                    fontFamily: 1,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    strokeColor: '#ff0000',
                    backgroundColor: 'transparent',
                    fillStyle: 'hachure',
                    strokeWidth: 1,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    roundness: null,
                    seed: Math.floor(Math.random() * 1000000),
                    versionNonce: Math.floor(Math.random() * 1000000),
                    isDeleted: false,
                    groupIds: [],
                    boundElements: null,
                    updated: 1,
                    link: null,
                    locked: false,
                });
                y += 30;
            }
        } else if (part.content.trim()) {
            // Regular text
            elements.push({
                type: 'text',
                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                x: startX + depth * 20,
                y: y,
                width: 400,
                height: 25,
                text: part.content,
                fontSize: 14,
                fontFamily: 1,
                textAlign: 'left',
                verticalAlign: 'top',
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'hachure',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: 1,
                link: null,
                locked: false,
            });
            y += 30;
        }
    }

    return { elements, newY: y };
}
function loadMathJax(): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((window as any).MathJax) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.onload = () => {
            // Configure MathJax
            (window as any).MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']]
                },
                svg: {
                    fontCache: 'global'
                }
            };
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Convert Markdown AST tree to Excalidraw elements with incremental updates
 */
export const convertMarkdownTreeToElements = async (
    tree: any,
    startX: number,
    startY: number,
    excalidrawAPI: any,
    existingElements: any[],
    topic?: TopicAnalysis,
    educationalText?: string,
    tableBlocks: string[] = []
): Promise<any[]> => {
    const elements: any[] = [];
    let currentY = startY;

    function getText(node: any): string {
        if (node.value) return node.value;
        if (node.children) return node.children.map(getText).join('');
        return '';
    }

    // Helper function to collect all text content from a node and its children recursively
    function collectAllText(node: any): string {
        if (node.type === 'text') return node.value || '';
        if (node.children) return node.children.map(collectAllText).join('');
        return '';
    }

    async function traverse(node: any, depth: number = 0): Promise<any[]> {
        const nodeElements: any[] = [];

        if (node.type === 'heading') {
            const fontSize = Math.max(12, 20 - node.depth * 2); // Larger for higher levels
            const text = getText(node);
            nodeElements.push({
                type: 'text',
                id: `heading-${Math.random().toString(36).substr(2, 9)}`,
                x: startX + depth * 20, // Indent based on depth
                y: currentY,
                width: 200,
                height: fontSize + 10,
                text: text,
                fontSize,
                fontFamily: 1,
                textAlign: 'left',
                verticalAlign: 'top',
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'hachure',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: 1,
                link: null,
                locked: false,
            });
            currentY += fontSize + 20; // Increased spacing for headings
        } else if (node.type === 'paragraph') {
            // Handle mixed content in paragraphs (text, inline formatting, and HTML)
            const paragraphElements: any[] = [];
            let hasSpecialContent = false;
            
            for (const child of node.children) {
                if (child.type === 'html') {
                    // Handle HTML content (like mermaid diagrams or LaTeX) separately
                    const childElements = await traverse(child, depth);
                    paragraphElements.push(...childElements);
                    hasSpecialContent = true;
                } else if (child.type === 'text') {
                    // Check if text contains LaTeX tags
                    const textContent = child.value;
                    const latexRegex = /<latex>(.*?)<\/latex>/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match;

                    while ((match = latexRegex.exec(textContent)) !== null) {
                        // Add text before LaTeX
                        if (match.index > lastIndex) {
                            parts.push({
                                type: 'text',
                                content: textContent.slice(lastIndex, match.index)
                            });
                        }

                        // Add LaTeX as image
                        parts.push({
                            type: 'latex',
                            content: match[1].trim()
                        });

                        lastIndex = match.index + match[0].length;
                    }

                    // Add remaining text
                    if (lastIndex < textContent.length) {
                        parts.push({
                            type: 'text',
                            content: textContent.slice(lastIndex)
                        });
                    }

                    // Process parts
                    for (const part of parts) {
                        if (part.type === 'latex') {
                            try {
                                const imageDataUrl = await convertLatexToImage(part.content);
                                
                                if (imageDataUrl) {
                                    const imageElement = {
                                        type: 'image',
                                        id: `latex-inline-${Math.random().toString(36).substr(2, 9)}`,
                                        x: startX + depth * 20,
                                        y: currentY,
                                        width: 200, // Smaller width for inline equations
                                        height: 40, // Smaller height for inline equations
                                        fileId: `latex-file-${Math.random().toString(36).substr(2, 9)}`,
                                        status: 'saved',
                                        scale: [1, 1],
                                        strokeColor: 'transparent',
                                        backgroundColor: 'transparent',
                                        fillStyle: 'hachure',
                                        strokeWidth: 1,
                                        strokeStyle: 'solid',
                                        roughness: 1,
                                        opacity: 100,
                                        angle: 0,
                                        roundness: null,
                                        seed: Math.floor(Math.random() * 1000000),
                                        versionNonce: Math.floor(Math.random() * 1000000),
                                        isDeleted: false,
                                        groupIds: [],
                                        boundElements: null,
                                        updated: 1,
                                        link: null,
                                        locked: false,
                                    };

                                    paragraphElements.push(imageElement);

                                    // Create file data for the image
                                    const fileData = {
                                        id: imageElement.fileId,
                                        dataURL: imageDataUrl,
                                        mimeType: 'image/svg+xml',
                                        created: Date.now(),
                                    };

                                    // Add file to Excalidraw
                                    excalidrawAPI.addFiles([fileData]);

                                    currentY += 50; // Space for inline equation
                                } else {
                                    // Fallback to text
                                    paragraphElements.push({
                                        type: 'text',
                                        id: `latex-inline-error-${Math.random().toString(36).substr(2, 9)}`,
                                        x: startX + depth * 20,
                                        y: currentY,
                                        width: 200,
                                        height: 20,
                                        text: `LaTeX: ${part.content}`,
                                        fontSize: 14,
                                        fontFamily: 1,
                                        textAlign: 'left',
                                        verticalAlign: 'top',
                                        strokeColor: '#ff6b35',
                                        backgroundColor: 'transparent',
                                        fillStyle: 'hachure',
                                        strokeWidth: 1,
                                        strokeStyle: 'solid',
                                        roughness: 1,
                                        opacity: 100,
                                        angle: 0,
                                        roundness: null,
                                        seed: Math.floor(Math.random() * 1000000),
                                        versionNonce: Math.floor(Math.random() * 1000000),
                                        isDeleted: false,
                                        groupIds: [],
                                        boundElements: null,
                                        updated: 1,
                                        link: null,
                                        locked: false,
                                    });
                                    currentY += 25;
                                }
                            } catch (error) {
                                console.error('Failed to convert inline LaTeX to image:', error);
                                paragraphElements.push({
                                    type: 'text',
                                    id: `latex-inline-error-${Math.random().toString(36).substr(2, 9)}`,
                                    x: startX + depth * 20,
                                    y: currentY,
                                    width: 200,
                                    height: 20,
                                    text: `LaTeX Error: ${part.content}`,
                                    fontSize: 14,
                                    fontFamily: 1,
                                    textAlign: 'left',
                                    verticalAlign: 'top',
                                    strokeColor: '#ff0000',
                                    backgroundColor: 'transparent',
                                    fillStyle: 'hachure',
                                    strokeWidth: 1,
                                    strokeStyle: 'solid',
                                    roughness: 1,
                                    opacity: 100,
                                    angle: 0,
                                    roundness: null,
                                    seed: Math.floor(Math.random() * 1000000),
                                    versionNonce: Math.floor(Math.random() * 1000000),
                                    isDeleted: false,
                                    groupIds: [],
                                    boundElements: null,
                                    updated: 1,
                                    link: null,
                                    locked: false,
                                });
                                currentY += 25;
                            }
                        } else if (part.content.trim()) {
                            // Regular text
                            paragraphElements.push({
                                type: 'text',
                                id: `text-${Math.random().toString(36).substr(2, 9)}`,
                                x: startX + depth * 20,
                                y: currentY,
                                width: 400,
                                height: 20,
                                text: part.content,
                                fontSize: 14,
                                fontFamily: 1,
                                textAlign: 'left',
                                verticalAlign: 'top',
                                strokeColor: '#000000',
                                backgroundColor: 'transparent',
                                fillStyle: 'hachure',
                                strokeWidth: 1,
                                strokeStyle: 'solid',
                                roughness: 1,
                                opacity: 100,
                                angle: 0,
                                roundness: null,
                                seed: Math.floor(Math.random() * 1000000),
                                versionNonce: Math.floor(Math.random() * 1000000),
                                isDeleted: false,
                                groupIds: [],
                                boundElements: null,
                                updated: 1,
                                link: null,
                                locked: false,
                            });
                            currentY += 25;
                        }
                    }

                    if (parts.length > 0) {
                        hasSpecialContent = true;
                    }
                }
            }
            
            // If we have special content like HTML or LaTeX, process children individually
            if (hasSpecialContent) {
                nodeElements.push(...paragraphElements);
            } else {
                // Pure text paragraph (including formatted text like **bold**) - create a single text element
                const fullText = collectAllText(node);
                if (fullText.trim()) {
                    nodeElements.push({
                        type: 'text',
                        id: `paragraph-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: fullText,
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 30;
                }
            }
        } else if (node.type === 'html') {
            const htmlContent = node.value;
            if (htmlContent.startsWith('<mermaid>') && htmlContent.endsWith('</mermaid>')) {
                // Handle Mermaid diagrams (existing code)
                const mermaidCode = htmlContent.slice(9, -10).trim(); // remove <mermaid> and </mermaid>
                console.log('Processing Mermaid code from HTML:', mermaidCode);
                
                // Preprocess the mermaid code to ensure proper quoting
                const processedMermaidCode = preprocessMermaidCode(mermaidCode);
                console.log('Processed Mermaid code:', processedMermaidCode);
                
                try {
                    // Parse the mermaid code without additional config first
                    const parsedGraph = await parseMermaid(processedMermaidCode);
                    console.log('Parsed graph:', parsedGraph);
                    
                    // Convert to Excalidraw elements
                    const excalidrawResult = graphToExcalidraw(parsedGraph);
                    console.log('Excalidraw result:', excalidrawResult);

                    // Position the diagram elements
                    const offsetX = startX + depth * 20;
                    const offsetY = currentY;
                    
                    if (excalidrawResult.elements && excalidrawResult.elements.length > 0) {
                        const positionedElements = excalidrawResult.elements.map((element: any) => ({
                            ...element,
                            x: (element.x || 0) + offsetX,
                            y: (element.y || 0) + offsetY,
                        }));

                        // Add the diagram elements
                        nodeElements.push(...positionedElements);
                        console.log('Added positioned elements:', positionedElements.length);

                        // Calculate the actual height of the diagram
                        let maxY = currentY;
                        positionedElements.forEach((element: any) => {
                            const elementBottom = (element.y || 0) + (element.height || 20);
                            if (elementBottom > maxY) {
                                maxY = elementBottom;
                            }
                        });

                        // Update currentY based on actual diagram height with some padding
                        currentY = maxY + 50;
                    } else {
                        console.warn('No elements generated from mermaid diagram');
                        // Show a placeholder if no elements were generated
                        nodeElements.push({
                            type: 'text',
                            id: `mermaid-empty-${Math.random().toString(36).substr(2, 9)}`,
                            x: startX + depth * 20,
                            y: currentY,
                            width: 400,
                            height: 30,
                            text: 'Mermaid diagram (no elements generated)',
                            fontSize: 16,
                            fontFamily: 1,
                            textAlign: 'left',
                            verticalAlign: 'top',
                            strokeColor: '#007acc',
                            backgroundColor: 'transparent',
                            fillStyle: 'hachure',
                            strokeWidth: 1,
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: 100,
                            angle: 0,
                            roundness: null,
                            seed: Math.floor(Math.random() * 1000000),
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            groupIds: [],
                            boundElements: null,
                            updated: 1,
                            link: null,
                            locked: false,
                        });
                        currentY += 50;
                    }
                } catch (error) {
                    console.error('Failed to parse mermaid code:', error);
                    console.error('Mermaid code that failed:', processedMermaidCode);
                    // Fallback to placeholder text if parsing fails
                    nodeElements.push({
                        type: 'text',
                        id: `mermaid-error-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: `Error rendering mermaid: ${error instanceof Error ? error.message : String(error)}`,
                        fontSize: 16,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#ff0000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 50;
                }
            } else if (htmlContent.startsWith('<latex>') && htmlContent.endsWith('</latex>')) {
                // Handle LaTeX equations - convert to images
                const latexCode = htmlContent.slice(7, -8).trim(); // remove <latex> and </latex>
                console.log('Processing LaTeX code:', latexCode);

                try {
                    const imageDataUrl = await convertLatexToImage(latexCode);
                    
                    if (imageDataUrl) {
                        // Create image element for LaTeX
                        const imageElement = {
                            type: 'image',
                            id: `latex-${Math.random().toString(36).substr(2, 9)}`,
                            x: startX + depth * 20,
                            y: currentY,
                            width: 400, // Default width, will be adjusted based on content
                            height: 60, // Default height for equations
                            fileId: `latex-file-${Math.random().toString(36).substr(2, 9)}`,
                            status: 'saved',
                            scale: [1, 1],
                            strokeColor: 'transparent',
                            backgroundColor: 'transparent',
                            fillStyle: 'hachure',
                            strokeWidth: 1,
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: 100,
                            angle: 0,
                            roundness: null,
                            seed: Math.floor(Math.random() * 1000000),
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            groupIds: [],
                            boundElements: null,
                            updated: 1,
                            link: null,
                            locked: false,
                        };

                        nodeElements.push(imageElement);

                        // Create file data for the image
                        const fileData = {
                            id: imageElement.fileId,
                            dataURL: imageDataUrl,
                            mimeType: 'image/svg+xml',
                            created: Date.now(),
                        };

                        // Add file to Excalidraw
                        excalidrawAPI.addFiles([fileData]);

                        currentY += 80; // Space for the equation image
                        console.log('Added LaTeX image element');
                    } else {
                        // Fallback to text if image conversion fails
                        nodeElements.push({
                            type: 'text',
                            id: `latex-error-${Math.random().toString(36).substr(2, 9)}`,
                            x: startX + depth * 20,
                            y: currentY,
                            width: 400,
                            height: 30,
                            text: `LaTeX: ${latexCode}`,
                            fontSize: 16,
                            fontFamily: 1,
                            textAlign: 'left',
                            verticalAlign: 'top',
                            strokeColor: '#ff6b35',
                            backgroundColor: 'transparent',
                            fillStyle: 'hachure',
                            strokeWidth: 1,
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: 100,
                            angle: 0,
                            roundness: null,
                            seed: Math.floor(Math.random() * 1000000),
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            groupIds: [],
                            boundElements: null,
                            updated: 1,
                            link: null,
                            locked: false,
                        });
                        currentY += 50;
                    }
                } catch (error) {
                    console.error('Failed to convert LaTeX to image:', error);
                    // Fallback to text
                    nodeElements.push({
                        type: 'text',
                        id: `latex-error-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: `LaTeX Error: ${latexCode}`,
                        fontSize: 16,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#ff0000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 50;
                }
            } else if (htmlContent.includes('<table>') && htmlContent.includes('</table>')) {
                // Handle Mermaid diagrams (existing code)
                const mermaidCode = htmlContent.slice(9, -10).trim(); // remove <mermaid> and </mermaid>
                console.log('Processing Mermaid code from HTML:', mermaidCode);
                
                // Preprocess the mermaid code to ensure proper quoting
                const processedMermaidCode = preprocessMermaidCode(mermaidCode);
                console.log('Processed Mermaid code:', processedMermaidCode);
                
                try {
                    // Parse the mermaid code without additional config first
                    const parsedGraph = await parseMermaid(processedMermaidCode);
                    console.log('Parsed graph:', parsedGraph);
                    
                    // Convert to Excalidraw elements
                    const excalidrawResult = graphToExcalidraw(parsedGraph);
                    console.log('Excalidraw result:', excalidrawResult);

                    // Position the diagram elements
                    const offsetX = startX + depth * 20;
                    const offsetY = currentY;
                    
                    if (excalidrawResult.elements && excalidrawResult.elements.length > 0) {
                        const positionedElements = excalidrawResult.elements.map((element: any) => ({
                            ...element,
                            x: (element.x || 0) + offsetX,
                            y: (element.y || 0) + offsetY,
                        }));

                        // Add the diagram elements
                        nodeElements.push(...positionedElements);
                        console.log('Added positioned elements:', positionedElements.length);

                        // Calculate the actual height of the diagram
                        let maxY = currentY;
                        positionedElements.forEach((element: any) => {
                            const elementBottom = (element.y || 0) + (element.height || 20);
                            if (elementBottom > maxY) {
                                maxY = elementBottom;
                            }
                        });

                        // Update currentY based on actual diagram height with some padding
                        currentY = maxY + 50;
                    } else {
                        console.warn('No elements generated from mermaid diagram');
                        // Show a placeholder if no elements were generated
                        nodeElements.push({
                            type: 'text',
                            id: `mermaid-empty-${Math.random().toString(36).substr(2, 9)}`,
                            x: startX + depth * 20,
                            y: currentY,
                            width: 400,
                            height: 30,
                            text: 'Mermaid diagram (no elements generated)',
                            fontSize: 16,
                            fontFamily: 1,
                            textAlign: 'left',
                            verticalAlign: 'top',
                            strokeColor: '#007acc',
                            backgroundColor: 'transparent',
                            fillStyle: 'hachure',
                            strokeWidth: 1,
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: 100,
                            angle: 0,
                            roundness: null,
                            seed: Math.floor(Math.random() * 1000000),
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            groupIds: [],
                            boundElements: null,
                            updated: 1,
                            link: null,
                            locked: false,
                        });
                        currentY += 50;
                    }
                } catch (error) {
                    console.error('Failed to parse mermaid code:', error);
                    console.error('Mermaid code that failed:', processedMermaidCode);
                    // Fallback to placeholder text if parsing fails
                    nodeElements.push({
                        type: 'text',
                        id: `mermaid-error-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: `Error rendering mermaid: ${error instanceof Error ? error.message : String(error)}`,
                        fontSize: 16,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#ff0000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 50;
                }
            } else if (htmlContent.includes('<table>') && htmlContent.includes('</table>')) {
                // Handle HTML tables
                console.log('Processing HTML table from HTML node:', htmlContent);
                const tableMarkdown = convertHtmlTableToMarkdown(htmlContent);
                
                if (tableMarkdown.trim()) {
                    const tableElements = createVisualTableElements(tableMarkdown, startX + depth * 20, currentY);
                    nodeElements.push(...tableElements);
                    
                    // Calculate table height and width
                    const textElements = tableElements.filter(el => el.type === 'text');
                    const rectangleElements = tableElements.filter(el => el.type === 'rectangle');
                    
                    if (textElements.length > 0 && rectangleElements.length > 0) {
                        // Find the maximum Y position to determine table height
                        const maxY = Math.max(...rectangleElements.map(el => el.y + el.height));
                        const minY = Math.min(...rectangleElements.map(el => el.y));
                        const tableHeight = maxY - minY;
                        
                        currentY += tableHeight + 30;
                    } else {
                        currentY += 200; // Fallback height for 3 rows * 65px + spacing
                    }
                } else {
                    // Fallback if table conversion failed
                    nodeElements.push({
                        type: 'text',
                        id: `html-table-error-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: 'Error: Could not parse HTML table',
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#ff0000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 50;
                }
            } else {
                // Handle other HTML content as plain text
                const cleanText = htmlContent.replace(/<[^>]*>/g, '').trim();
                if (cleanText) {
                    nodeElements.push({
                        type: 'text',
                        id: `html-text-${Math.random().toString(36).substr(2, 9)}`,
                        x: startX + depth * 20,
                        y: currentY,
                        width: 400,
                        height: 30,
                        text: cleanText,
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'hachure',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        roundness: null,
                        seed: Math.floor(Math.random() * 1000000),
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: 1,
                        link: null,
                        locked: false,
                    });
                    currentY += 30;
                }
            }
        } else if (node.type === 'table') {
            // Handle regular markdown tables by creating visual tables
            const tableRows: string[][] = node.children.map((row: any) =>
                row.children.map((cell: any) => getText(cell))
            );

            const tableMarkdown = tableRows.map((row: string[]) => '| ' + row.join(' | ') + ' |').join('\n');
            const tableElements = createVisualTableElements(tableMarkdown, startX + depth * 20, currentY);
            nodeElements.push(...tableElements);
            
            // Calculate table height and width
            const textElements = tableElements.filter(el => el.type === 'text');
            const rectangleElements = tableElements.filter(el => el.type === 'rectangle');
            
            if (textElements.length > 0 && rectangleElements.length > 0) {
                // Find the maximum Y position to determine table height
                const maxY = Math.max(...rectangleElements.map(el => el.y + el.height));
                const minY = Math.min(...rectangleElements.map(el => el.y));
                const tableHeight = maxY - minY;
                
                currentY += tableHeight + 30;
            } else {
                currentY += 200; // Fallback height for 3 rows * 65px + spacing
            }
        } else if (node.type === 'thematicBreak') {
            // Handle horizontal rules (---)
            nodeElements.push({
                type: 'line',
                id: `line-${Math.random().toString(36).substr(2, 9)}`,
                x: startX + depth * 20,
                y: currentY + 10,
                width: 300,
                height: 0,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'hachure',
                strokeWidth: 2,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                roundness: { type: 3 },
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: 1,
                link: null,
                locked: false,
                points: [[0, 0], [300, 0]],
                lastCommittedPoint: null,
                startBinding: null,
                endBinding: null,
                startArrowhead: null,
                endArrowhead: null,
            });
            currentY += 30;
        } else if (node.type === 'list') {
            // For lists, just traverse children
        } else if (node.type === 'listItem') {
            const text = getText(node);
            const bullet = node.parent && node.parent.ordered ? `${node.parent.start || 1}. ` : '- ';
            nodeElements.push({
                type: 'text',
                id: `listitem-${Math.random().toString(36).substr(2, 9)}`,
                x: startX + depth * 20,
                y: currentY,
                width: 350,
                height: 30,
                text: bullet + text,
                fontSize: 14,
                fontFamily: 1,
                textAlign: 'left',
                verticalAlign: 'top',
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'hachure',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 1,
                opacity: 100,
                angle: 0,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: 1,
                link: null,
                locked: false,
            });
            currentY += 30; // Increased spacing for list items
        } else if (node.type === 'text') {
            // Handle standalone text nodes if any
            const text = node.value;
            console.log('Processing text node:', text);
            
            // Check if this text node contains table markers
            const tableMatch = text.match(/TABLE_BLOCK_(\d+)/);
            
            if (tableMatch) {
                // Handle table block
                const blockIndex = parseInt(tableMatch[1]);
                if (blockIndex < tableBlocks.length) {
                    const htmlTableContent = tableBlocks[blockIndex];
                    const tableMarkdown = convertHtmlTableToMarkdown(htmlTableContent);
                    
                    if (tableMarkdown.trim()) {
                        const tableElements = createVisualTableElements(tableMarkdown, startX + depth * 20, currentY);
                        nodeElements.push(...tableElements);
                        
                        // Calculate table height and width
                        const textElements = tableElements.filter(el => el.type === 'text');
                        const rectangleElements = tableElements.filter(el => el.type === 'rectangle');
                        
                        if (textElements.length > 0 && rectangleElements.length > 0) {
                            // Find the maximum Y position to determine table height
                            const maxY = Math.max(...rectangleElements.map(el => el.y + el.height));
                            const minY = Math.min(...rectangleElements.map(el => el.y));
                            const tableHeight = maxY - minY;
                            
                            currentY += tableHeight + 30;
                        } else {
                            currentY += 200; // Fallback height for 3 rows * 65px + spacing
                        }
                    } else {
                        // Fallback if table conversion failed
                        nodeElements.push({
                            type: 'text',
                            id: `table-error-${Math.random().toString(36).substr(2, 9)}`,
                            x: startX + depth * 20,
                            y: currentY,
                            width: 400,
                            height: 30,
                            text: 'Error: Could not parse HTML table',
                            fontSize: 14,
                            fontFamily: 1,
                            textAlign: 'left',
                            verticalAlign: 'top',
                            strokeColor: '#ff0000',
                            backgroundColor: 'transparent',
                            fillStyle: 'hachure',
                            strokeWidth: 1,
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: 100,
                            angle: 0,
                            roundness: null,
                            seed: Math.floor(Math.random() * 1000000),
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            groupIds: [],
                            boundElements: null,
                            updated: 1,
                            link: null,
                            locked: false,
                        });
                        currentY += 50;
                    }
                }
            } else {
                // Regular text node
                nodeElements.push({
                    type: 'text',
                    id: `text-${Math.random().toString(36).substr(2, 9)}`,
                    x: startX + depth * 20,
                    y: currentY,
                    width: 300,
                    height: 30,
                    text: node.value,
                    fontSize: 14,
                    fontFamily: 1,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'hachure',
                    strokeWidth: 1,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    roundness: null,
                    seed: Math.floor(Math.random() * 1000000),
                    versionNonce: Math.floor(Math.random() * 1000000),
                    isDeleted: false,
                    groupIds: [],
                    boundElements: null,
                    updated: 1,
                    link: null,
                    locked: false,
                });
                currentY += 30; // Increased spacing for text nodes
            }
        }

        // Add children traversal for nested structures
        if (node.children && !['heading', 'paragraph', 'listItem', 'text', 'table', 'thematicBreak', 'html'].includes(node.type)) {
            for (const child of node.children) {
                const childElements = await traverse(child, depth + 1);
                nodeElements.push(...childElements);
            }
        }

        return nodeElements;
    }

    // Process top-level children incrementally
    let accumulatedElements = [...existingElements];
    
    for (const child of tree.children) {
        const childElements = await traverse(child, 0);
        elements.push(...childElements);

        // Convert to proper Excalidraw elements and update the scene
        const excalidrawElements = convertToExcalidrawElements(childElements);
        accumulatedElements = [...accumulatedElements, ...excalidrawElements];
        excalidrawAPI.updateScene({ elements: accumulatedElements });

        // Wait 1 second before adding the next section
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return elements;
};
