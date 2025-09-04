// Get API keys from environment variables
const getGroqApiKeys = (): string[] => {
    const envKeys = import.meta.env.VITE_GROQ_API_KEYS;
    if (!envKeys) {
        console.warn('No GROQ API keys found in environment variables. Please set VITE_GROQ_API_KEYS in your .env file.');
        return [];
    }
    return envKeys.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0);
};

export const AI_CONFIG = {
    GROQ_API_KEYS: getGroqApiKeys(),
    DANGEROUS_ALLOW_BROWSER: true,
    MODELS: {
        DEEPSEEK: "deepseek-r1-distill-llama-70b",
        GEMMA: "gemma2-9b-it",
        LLAMA4: "meta-llama/llama-4-scout-17b-16e-instruct",
        LLAMA3_3: "llama-3.3-70b-versatile",
        GPTOSS: "openai/gpt-oss-120b"
    },
    TEMPERATURE: {
        EDUCATIONAL: 1,
        MERMAID: 0.3,
        ANALYSIS: 0.7
    },
    MAX_TOKENS: {
        EDUCATIONAL: 65536,
        MERMAID: 1024,
        ANALYSIS: 1024
    }
} as const;

export const EXPORT_CONFIG = {
    BACKGROUND: true,
    BACKGROUND_COLOR: "#fafafa",
    MIME_TYPE: "image/png" as const,
    QUALITY: 0.92,
    PADDING: 20
} as const;

export const BUTTON_STYLES = {
    POSITION: 'fixed' as const,
    BOTTOM: '10px',
    LEFT: '50%',
    TRANSFORM: 'translateX(-50%)',
    Z_INDEX: 1000,
    PADDING: '8px 16px',
    COLORS: {
        ACTIVE: '#007ACC',
        HOVER: '#005a9e',
        DISABLED: '#666'
    },
    BORDER: 'none',
    BORDER_RADIUS: '4px',
    FONT_SIZE: '14px',
    FONT_WEIGHT: '500',
    BOX_SHADOW: '0 2px 4px rgba(0,0,0,0.1)'
} as const;

export const DIAGRAM_SPACING = {
    // Default Mermaid spacing values
    DEFAULT: {
        nodeSpacing: 50,
        rankSpacing: 50
    },
    // Increased spacing for better readability
    LOOSE: {
        nodeSpacing: 80,
        rankSpacing: 100
    },
    // Tight spacing for compact diagrams
    TIGHT: {
        nodeSpacing: 30,
        rankSpacing: 40
    },
    // Very loose spacing for large displays
    EXTRA_LOOSE: {
        nodeSpacing: 120,
        rankSpacing: 150
    }
} as const;
