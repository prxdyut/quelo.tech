/**
 * Utility functions for converting diagram data formats
 */
export interface Mindmap {
    type: "mindmap";
    description: string;
    output: {
        nodes: { id: string; label: string }[];
        connections: { from: string; to: string; label?: string }[];
    };
    example: Mindmap["output"][];
}

export const mindmap: Mindmap = {
    type: "mindmap",
    description: "Mind maps are used to show the relationships between ideas, concepts, or pieces of information in a visual, structured way.",
    output: {
        nodes: [{ id: "1", label: "Central Idea" }, { id: "2", label: "Related Idea" }, { id: "3", label: "Another Idea" }],
        connections: [{ from: "1", to: "2" }, { from: "1", to: "3" }]
    },
    example: [
        {
            nodes: [
                { id: "1", label: "Types of Governments" },
                { id: "2", label: "Democracy" },
                { id: "3", label: "Monarchy" },
                { id: "4", label: "Republic" },
                { id: "5", label: "Dictatorship" },
                { id: "6", label: "Direct Democracy" },
                { id: "7", label: "Representative Democracy" },
                { id: "8", label: "Constitutional Monarchy" },
                { id: "9", label: "Absolute Monarchy" },
                { id: "10", label: "Parliamentary Republic" },
                { id: "11", label: "Presidential Republic" },
            ],
            connections: [
                { from: "1", to: "2", label: "includes" },
                { from: "1", to: "3", label: "includes" },
                { from: "1", to: "4", label: "includes" },
                { from: "1", to: "5", label: "includes" },
                { from: "2", to: "6", label: "sub-type" },
                { from: "2", to: "7", label: "sub-type" },
                { from: "3", to: "8", label: "sub-type" },
                { from: "3", to: "9", label: "sub-type" },
                { from: "4", to: "10", label: "sub-type" },
                { from: "4", to: "11", label: "sub-type" },
            ]
        },
        {
            nodes: [
                { id: "1", label: "Photosynthesis" },
                { id: "2", label: "Light Energy" },
                { id: "3", label: "Chemical Energy" },
                { id: "4", label: "Carbon Dioxide" },
                { id: "5", label: "Water" },
                { id: "6", label: "Glucose" },
                { id: "7", label: "Oxygen" },
                { id: "8", label: "Chloroplasts" },
                { id: "9", label: "Light Reactions" },
                { id: "10", label: "Calvin Cycle" },
            ],
            connections: [
                { from: "1", to: "2", label: "requires" },
                { from: "1", to: "4", label: "uses" },
                { from: "1", to: "5", label: "uses" },
                { from: "1", to: "6", label: "produces" },
                { from: "1", to: "7", label: "produces" },
                { from: "2", to: "3", label: "converts to" },
                { from: "8", to: "9", label: "site of" },
                { from: "8", to: "10", label: "site of" },
                { from: "9", to: "3", label: "produces" },
                { from: "10", to: "6", label: "produces" },
            ]
        },
        {
            nodes: [
                { id: "1", label: "Programming Languages" },
                { id: "2", label: "Web Development" },
                { id: "3", label: "Data Science" },
                { id: "4", label: "Mobile Apps" },
                { id: "5", label: "JavaScript" },
                { id: "6", label: "Python" },
                { id: "7", label: "Java" },
                { id: "8", label: "React" },
                { id: "9", label: "Django" },
                { id: "10", label: "Flutter" },
                { id: "11", label: "Node.js" },
                { id: "12", label: "Pandas" },
            ],
            connections: [
                { from: "1", to: "2", label: "used in" },
                { from: "1", to: "3", label: "used in" },
                { from: "1", to: "4", label: "used in" },
                { from: "2", to: "5", label: "language" },
                { from: "2", to: "7", label: "language" },
                { from: "3", to: "6", label: "language" },
                { from: "4", to: "7", label: "language" },
                { from: "5", to: "8", label: "framework" },
                { from: "5", to: "11", label: "runtime" },
                { from: "6", to: "9", label: "framework" },
                { from: "6", to: "12", label: "library" },
                { from: "7", to: "10", label: "framework" },
            ]
        },
        {
            nodes: [
                { id: "1", label: "Project Management" },
                { id: "2", label: "Planning Phase" },
                { id: "3", label: "Execution Phase" },
                { id: "4", label: "Monitoring Phase" },
                { id: "5", label: "Closing Phase" },
                { id: "6", label: "Define Scope" },
                { id: "7", label: "Create Schedule" },
                { id: "8", label: "Allocate Resources" },
                { id: "9", label: "Track Progress" },
                { id: "10", label: "Risk Management" },
                { id: "11", label: "Quality Control" },
                { id: "12", label: "Document Lessons" },
            ],
            connections: [
                { from: "1", to: "2", label: "includes" },
                { from: "1", to: "3", label: "includes" },
                { from: "1", to: "4", label: "includes" },
                { from: "1", to: "5", label: "includes" },
                { from: "2", to: "6", label: "task" },
                { from: "2", to: "7", label: "task" },
                { from: "2", to: "8", label: "task" },
                { from: "3", to: "9", label: "activity" },
                { from: "3", to: "11", label: "activity" },
                { from: "4", to: "9", label: "activity" },
                { from: "4", to: "10", label: "activity" },
                { from: "5", to: "12", label: "task" },
            ]
        }
    ]
}

/**
 * Converts JSON diagram structure to Mermaid flowchart code
 */
export function convertJSONtoMermaidMindmap(diagramData: Mindmap["output"]): string {
    try {
        const { nodes, connections } = diagramData;

        if (!nodes || nodes.length === 0) {
            return 'flowchart TD\n    A[No content available]';
        }

        // Ensure no empty labels
        nodes.forEach(node => {
            if (!node.label || node.label.trim() === '') {
                node.label = 'Node';
            }
        });

        let mermaidCode = 'flowchart TB\n';

        // Add nodes
        nodes.forEach(node => {
            const label = node.label ? node.label.replace(/"/g, '\\"') : 'Node';
            mermaidCode += `    ${node.id}["${label}"]\n`;
        });

        mermaidCode += '\n';

        // Add connections
        connections.forEach(connection => {
            if (connection.from && connection.to) {
                mermaidCode += `    ${connection.from} ${connection?.label ? ` -- ${connection.label} ---` : '---'} ${connection.to}\n`;
            }
        });

        console.log("Converted Mermaid Code:", mermaidCode);
        return mermaidCode;
    } catch (error) {
        console.error('JSON to Mermaid conversion failed:', error);
        return 'flowchart TD\n    A[Conversion Error]';
    }
}

/**
 * Creates Mermaid configuration with custom spacing
 * @param spacingType - The type of spacing to use ('DEFAULT', 'LOOSE', 'TIGHT', 'EXTRA_LOOSE')
 * @param customSpacing - Optional custom spacing values
 * @returns Mermaid configuration object
 */
export const createMermaidConfig = (
    spacingType: 'DEFAULT' | 'LOOSE' | 'TIGHT' | 'EXTRA_LOOSE' = 'DEFAULT',
    customSpacing?: { nodeSpacing?: number; rankSpacing?: number }
) => {
    const SPACING_CONFIGS = {
        DEFAULT: { nodeSpacing: 50, rankSpacing: 50 },
        LOOSE: { nodeSpacing: 80, rankSpacing: 100 },
        TIGHT: { nodeSpacing: 30, rankSpacing: 40 },
        EXTRA_LOOSE: { nodeSpacing: 120, rankSpacing: 150 }
    };

    const spacing = customSpacing || SPACING_CONFIGS[spacingType];

    return {
        flowchart: {
            curve: "linear",
            nodeSpacing: spacing.nodeSpacing,
            rankSpacing: spacing.rankSpacing
        }
    };
};
