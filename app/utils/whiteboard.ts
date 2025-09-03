/**
 * Converts a Blob to base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data:image/png;base64, prefix
            resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(blob);
    });
};

/**
 * Extracts Mermaid code from markdown code blocks
 */
export const processMermaidCode = (input: string): string => {
    // --- 1. Extract from ``` blocks if present ---
    const mermaidCodeMatch = input.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/);
    let code = mermaidCodeMatch ? mermaidCodeMatch[1].trim() : input.trim();

    // --- 2. Replace curly braces with square brackets ---
    code = code.replace(/\{([^}]*)\}/g, '[$1]');

    // --- 3. Normalize node labels: wrap in quotes if not already ---
    code = code.replace(/(\[[^\]"']+?\])/g, (match) => {
        const inner = match.slice(1, -1).trim();
        return `["${inner}"]`;
    });

    // --- 4. Ensure safe IDs (only letters, numbers, underscores) ---
    code = code.replace(/^([^\s\[\]]+)\[/gm, (match, id) => {
        const safeId = id.replace(/[^a-zA-Z0-9_]/g, "_");
        return `${safeId}[`;
    });

    // --- 5. Escape dangerous characters inside labels ---
    code = code.replace(/\["([^"]*)"\]/g, (match, label) => {
        const safeLabel = label
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        return `["${safeLabel}"]`;
    });

    // --- 6. Validate diagram type ---
    const validStart = /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gantt|journey)/m;
    if (!validStart.test(code)) {
        // Default to flowchart if type is missing
        code = "flowchart TD\n" + code;
    }

    // --- 7. Remove duplicate edges/nodes ---
    const seen = new Set<string>();
    code = code
        .split("\n")
        .filter((line) => {
            const trimmed = line.trim();
            if (seen.has(trimmed)) return false;
            seen.add(trimmed);
            return true;
        })
        .join("\n");

    // --- 8. Safety limits ---
    const MAX_LINES = 200;
    const MAX_CHARS = 5000;
    if (code.split("\n").length > MAX_LINES || code.length > MAX_CHARS) {
        throw new Error("Mermaid diagram too large or complex.");
    }

    return code.trim();
};




/**
 * Cleans Mermaid code by replacing problematic characters
 */
export const cleanMermaidCode = (code: string): string => {
    return code.replace(/\{/g, '[').replace(/\}/g, ']');
};

/**
 * Removes content within <think> tags from AI responses
 */
export const filterThinkTags = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

/**
 * Creates a fallback Mermaid flowchart for error cases
 */
export const createFallbackMermaid = (description: string): string => {
    const fallbackCode = `flowchart TD\n    A[${description}] --> A[${description}]`;
    return cleanMermaidCode(fallbackCode);
};
