import Groq from "groq-sdk";
import { AI_CONFIG } from "../constants/whiteboard";
import type { TopicAnalysis } from "~/types/whiteboard.js";
import { blobToBase64, filterThinkTags, createFallbackMermaid, processMermaidCode } from "../utils/whiteboard";

interface Diagram {
    type: string;
    description: string;
    output: Object;
    example: Object[];
}

const EXAMPLE_LATEX_FORMULA_SHEET = `\\documentclass[12pt]{article}
\\usepackage{amsmath, amssymb, geometry}
\\geometry{margin=1in}

\\title{Mathematics Formula Sheet}
\\author{Generated with \\LaTeX}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{Algebra}

\\subsection*{Quadratic Formula}
For a quadratic equation $ax^2 + bx + c = 0$:
\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

\\subsection*{Binomial Theorem}
Expansion of $(a+b)^n$:
\\[
(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k
\\]

\\subsection*{Sequences}
Arithmetic progression (nth term):
\\[
a_n = a + (n-1)d
\\]

Geometric progression (nth term):
\\[
a_n = ar^{n-1}
\\]

\\section*{Geometry}

\\subsection*{Pythagoras Theorem}
In a right-angled triangle:
\\[
a^2 + b^2 = c^2
\\]

\\subsection*{Circle}
Area:
\\[
A = \\pi r^2
\\]
Circumference:
\\[
C = 2 \\pi r
\\]

\\subsection*{Triangle}
Heron's formula:
\\[
A = \\sqrt{s(s-a)(s-b)(s-c)} \\quad \\text{where } s=\\frac{a+b+c}{2}
\\]

\\section*{Calculus}

\\subsection*{Differentiation}
Power rule:
\\[
\\frac{d}{dx}\\left( x^n \\right) = n x^{n-1}
\\]

Exponential:
\\[
\\frac{d}{dx}\\left( e^x \\right) = e^x
\\]

\\subsection*{Integration}
\\[
\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)
\\]

Fundamental theorem of calculus:
\\[
\\int_a^b f'(x) \\, dx = f(b) - f(a)
\\]

\\section*{Trigonometry}

\\subsection*{Identities}
\\[
\\sin^2 \\theta + \\cos^2 \\theta = 1
\\]

Double angle:
\\[
\\sin(2\\theta) = 2 \\sin\\theta \\cos\\theta
\\]

\\subsection*{Laws}
Law of sines:
\\[
\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}
\\]

Law of cosines:
\\[
c^2 = a^2 + b^2 - 2ab \\cos C
\\]

\\section*{Probability \\& Statistics}

\\subsection*{Probability}
\\[
P(E) = \\frac{\\text{Number of favorable outcomes}}{\\text{Total outcomes}}
\\]

Bayes' theorem:
\\[
P(A|B) = \\frac{P(B|A)P(A)}{P(B)}
\\]

\\subsection*{Statistics}
Mean:
\\[
\\mu = \\frac{1}{N} \\sum_{i=1}^{N} x_i
\\]

Variance:
\\[
\\sigma^2 = \\frac{1}{N} \\sum_{i=1}^{N} \\left(x_i - \\mu\\right)^2
\\]

\\end{document}`;

// Helper constants for prompt formatting directions
const HELPER_LATEX_ONLY = `- Return ONLY pure LaTeX/MathJax code without any tags, wrappers, or markdown formatting
- Use proper LaTeX/MathJax syntax only
- Do not include <latex> tags or any other HTML/markdown elements
- Example LaTeX:
${EXAMPLE_LATEX_FORMULA_SHEET}`;

const HELPER_MARKDOWN = `- Format in markdown with proper headings
- Do not include any LaTeX equations or Mermaid diagrams
- Use standard markdown syntax only`;

const HELPER_MERMAID_MARKDOWN = `- Format in markdown with proper headings
- Include mermaid diagrams where appropriate for visual explanation
- Mermaid code must always be enclosed within "<mermaid>" and "</mermaid>" tags
- All text in Mermaid nodes must be enclosed in quotes (e.g., A("text") instead of A(text))
- Do not include LaTeX equations`;

export class AIService {
    private groq: Groq;
    private apiKeys: readonly string[];
    private currentKeyIndex: number;

    constructor() {
        console.log('AIService: Initializing with API keys');
        this.apiKeys = AI_CONFIG.GROQ_API_KEYS;
        this.currentKeyIndex = 0;
        this.groq = new Groq({
            apiKey: this.apiKeys[this.currentKeyIndex],
            dangerouslyAllowBrowser: AI_CONFIG.DANGEROUS_ALLOW_BROWSER
        });
        console.log('AIService: Initialized successfully');
    }

    private rotateApiKey(): void {
        console.log('AIService: Rotating API key due to rate limit');
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        this.groq = new Groq({
            apiKey: this.apiKeys[this.currentKeyIndex],
            dangerouslyAllowBrowser: AI_CONFIG.DANGEROUS_ALLOW_BROWSER
        });
        console.log(`Switched to API key ${this.currentKeyIndex + 1}`);
    }

    private isRateLimitError(error: any): boolean {
        return error?.status === 429 ||
            error?.message?.toLowerCase().includes('rate limit') ||
            error?.code === 'rate_limit_exceeded';
    }

    private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        const maxRetries = this.apiKeys.length;
        let attempts = 0;
        console.log('AIService: Starting operation with retry mechanism');

        while (attempts < maxRetries) {
            try {
                console.log(`AIService: Attempt ${attempts + 1}/${maxRetries}`);
                return await operation();
            } catch (error) {
                console.error('AIService: Operation failed:', error);
                if (this.isRateLimitError(error) && attempts < maxRetries - 1) {
                    console.warn(`Rate limit hit, rotating API key. Attempt ${attempts + 1}/${maxRetries}`);
                    this.rotateApiKey();
                    attempts++;
                } else {
                    console.error('AIService: All retries exhausted or non-rate-limit error');
                    throw error;
                }
            }
        }
        console.error('AIService: All API keys exhausted due to rate limits');
        throw new Error('All API keys exhausted due to rate limits');
    }

    /**
     * Generates educational text using Deepseek model
     */
    async generateEducationalText(topic: TopicAnalysis, technique: string): Promise<string> {
        console.log('AIService: Starting educational text generation for topic:', topic.title);
        try {
            const rawResponse = await this.executeWithRetry(async () => {
                console.log('AIService: Making API call for educational text');
                const chatCompletion = await this.groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: `You are an AI tutor creating educational content for students. 
                        Topic: ${topic.title}
                        Description: ${topic.description}
                        Create a comprehensive educational text that explains this topic in a student-friendly way.  

Follow these rules:  
1. The text must be divided into **5–8 sections** (depending on the complexity of the topic/concept).  
2. Sections can include **text explanations, examples, visual aids, or comparisons**.  
3. Some sections may also contain **mermaid diagrams** to visually explain processes, hierarchies, or relationships.  
    - Mermaid code must always be enclosed within "<mermaid>" and "</mermaid>".
    - All text in Mermaid nodes must be enclosed in quotes (e.g., A("text") instead of A(text)).  
    - Mermaid charts can be complex, but they must never contain syntax errors.
4. Some sections may also contain **tables** for structured comparisons or summaries.
5. Some sections may also contain **mathematical, chemical, or physical equations** in the form of Latex Equations.  
    - Equations must always be enclosed within "<latex>" and "</latex>".  
    - Equations should be written in **LaTeX/MathJax syntax only**, e.g.,  
        <latex> E = mc^2 </latex>  
        <latex> H_2O \rightarrow H^+ + OH^- </latex>  
6. All sections must be complete and provide **useful, detailed information** (no gaps or placeholders).  
7. The writing style should be **clear, engaging, and educational**, suitable for students.  
8. Everything must be **highly markdown formatted** for readability.
9. All tags (<mermaid>, <table>, <latex>) must be followed strictly as specified, without any variations or omissions.`
                        }
                    ],
                    model: AI_CONFIG.MODELS.GPTOSS,
                    temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                    max_tokens: AI_CONFIG.MAX_TOKENS.EDUCATIONAL,
                    reasoning_effort: "low",
                    stream: false,
                    tools: [{ "type": "browser_search" }],
                    stop: null
                });
                console.log("Educational Text Response:", chatCompletion.choices[0]?.message?.content);
                return chatCompletion.choices[0]?.message?.content || '{"educationalText": "No educational content generated"}';
            });
            console.log('AIService: Educational text generation successful');
            return rawResponse;
        } catch (error) {
            console.error('Educational text generation failed:', error);
            return 'Failed to generate educational content';
        }
    }

    /**
     * Validates and corrects Mermaid diagram code
     */
    async validateDiagramJSON(topic: TopicAnalysis, mermaidCode: string, diagramType: string): Promise<string> {
        console.log('AIService: Starting Mermaid code validation for type:', diagramType);
        try {
            const validatedCode = await this.executeWithRetry(async () => {
                console.log('AIService: Making API call for Mermaid validation');
                const chatCompletion = await this.groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: `You are an expert in Mermaid diagram syntax. Validate and correct the following Mermaid code for a ${diagramType} diagram.

**Mermaid Code to Validate:**
${mermaidCode}

Extra context or information about the diagram:
Topic: ${topic.title}
Description: ${topic.description}

**Instructions:**
- Check if the syntax is correct
- Ensure all connections are proper and logical
- Verify nothing important is left out
- Add improvements or missing elements if appropriate
- Return **only the corrected Mermaid code** without any explanations or extra text`
                        }
                    ],
                    model: AI_CONFIG.MODELS.LLAMA3_3,
                    temperature: AI_CONFIG.TEMPERATURE.MERMAID,
                    max_tokens: AI_CONFIG.MAX_TOKENS.MERMAID,
                    stream: false,
                    stop: null
                });

                const response = chatCompletion.choices[0]?.message?.content || mermaidCode;
                console.log("Mermaid Validation Response:", response);
                return response;
            });
            console.log('AIService: Mermaid validation successful');
            return validatedCode;
        } catch (error) {
            console.error('Mermaid validation failed:', error);
            return mermaidCode; // Return original if validation fails
        }
    }    /**
     * Determines the best suited Mermaid diagram type for the provided content
     */
    async determineBestDiagramType(topic: TopicAnalysis, educationalText: string): Promise<string> {
        console.log('AIService: Starting diagram type determination for topic:', topic.title);
        try {
            const diagramType = await this.executeWithRetry(async () => {
                console.log('AIService: Making API call for diagram type determination');
                const chatCompletion = await this.groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: `You are an expert in data visualization and educational content design. Analyze the following content and determine the most suitable Mermaid diagram type.

**Available Mermaid Diagram Types:**
1. **flowchart** - Best for: processes, workflows, decision trees, step-by-step procedures, algorithms, cause-and-effect relationships
2. **sequence** - Best for: interactions over time, communication between entities, API calls, user journeys, protocol flows
3. **classDiagram** - Best for: object-oriented concepts, entity relationships, data structures, system architecture, inheritance hierarchies
4. **mindmap** - Best for: concept mapping, brainstorming, knowledge organization, topic exploration, hierarchical information

**Content to Analyze:**
Topic: ${topic.title}
Description: ${topic.description}
Educational Text: ${educationalText}

**Instructions:**
- Analyze the content structure, relationships, and learning objectives
- Consider what would be most helpful for student understanding
- Choose the diagram type that best represents the information architecture
- If the content involves processes or steps, lean toward flowchart
- If the content involves interactions or communications, lean toward sequence
- If the content involves object relationships or system structure, lean toward classDiagram
- If the content involves concepts and their relationships, lean toward mindmap

**Important:** Only respond with one of these exact values: "flowchart", "sequence", "classDiagram", or "mindmap"

Do not include any explanation, just return the diagram type.`
                        }
                    ],
                    model: AI_CONFIG.MODELS.LLAMA3_3,
                    temperature: AI_CONFIG.TEMPERATURE.ANALYSIS,
                    max_tokens: 50,
                    stream: false,
                    stop: null
                });

                return chatCompletion.choices[0]?.message?.content?.trim() || "flowchart";
            });

            // Validate the response to ensure it's one of our supported types
            const supportedTypes = ["flowchart", "sequence", "classDiagram", "mindmap"];
            if (supportedTypes.includes(diagramType)) {
                console.log("Determined diagram type:", diagramType);
                return diagramType;
            } else {
                console.warn("Invalid diagram type returned, defaulting to flowchart:", diagramType);
                return "flowchart";
            }
        } catch (error) {
            console.error('Diagram type determination failed:', error);
            return "flowchart"; // Default fallback
        }
    }

    /**
     * Generates topics breakdown for educational content
     */
    async generateTopicsBreakdown(topic: TopicAnalysis): Promise<string[]> {
        console.log('AIService: Starting topics breakdown generation for topic:', topic.title);
        try {
            const breakdown = await this.executeWithRetry(async () => {
                console.log('AIService: Making API call for topics breakdown');
                const chatCompletion = await this.groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: `You are an educational content strategist. Analyze the following topic and determine the 2-3 most relevant categories from the list below that would be essential for students to understand this topic comprehensively.

**Topic to Analyze:**
Title: ${topic.title}
Description: ${topic.description}

**Available Categories:**
Definition, KeyConcepts, Formulas, Examples, RealLifeApplications, CrossDisciplinaryConnections, Mnemonics, References, Comparisons, Resources

**Instructions:**
- Select exactly 2-3 categories that are most relevant and essential for understanding this topic
- Consider the educational level and practical importance
- Prioritize categories that provide the most value for student learning
- Return only the category names separated by commas (no explanations)

**Example Output:** Definition, KeyConcepts, Examples`
                        }
                    ],
                    model: AI_CONFIG.MODELS.LLAMA3_3,
                    temperature: AI_CONFIG.TEMPERATURE.ANALYSIS,
                    max_tokens: 100,
                    stream: false,
                    stop: null
                });

                const response = chatCompletion.choices[0]?.message?.content || "Definition, KeyConcepts, Examples";
                return response.split(',').map(cat => cat.trim()).slice(0, 3);
            });
            console.log('AIService: Topics breakdown generation successful:', breakdown);
            return breakdown;
        } catch (error) {
            console.error('Topics breakdown generation failed:', error);
            return ["Definition", "KeyConcepts", "Examples"]; // Default fallback
        }
    }

    /**
     * Generates definition content
     */
    async generateDefinition(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Provide a clear, comprehensive definition for the topic "${topic.title}".
Context: ${topic.description}
Instructions:
- Start with a concise, precise definition
- Do in minimum words possible.
- Should be concise and clear.`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 800,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No definition generated';
        });
    }

    /**
     * Generates key concepts content
     */
    async generateKeyConcepts(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Identify and explain the key concepts related to "${topic.title}".

Context: ${topic.description}

Instructions:
- List 4-6 fundamental concepts
- Provide brief explanations for each concept
- Show how concepts relate to each other
- Use bullet points or numbered lists
${HELPER_MERMAID_MARKDOWN}
- Length: 200-400 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 1000,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No key concepts generated';
        });
    }

    /**
     * Generates formulas content
     */
    async generateFormulas(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Present key formulas and equations related to "${topic.title}".

Context: ${topic.description}

Instructions:
- Include all relevant mathematical formulas
${HELPER_LATEX_ONLY}
- Explain what each variable represents
- Provide units where applicable
- Show derivation steps for complex formulas
- Include example calculations
- Format equations clearly with explanations
- Length: 200-400 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 65536,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No formulas generated';
        });
    }

    /**
     * Generates examples content
     */
    async generateExamples(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Provide practical examples and illustrations for "${topic.title}".

Context: ${topic.description}

Instructions:
- Include 3-5 concrete, relatable examples
- Show worked solutions where applicable
- Use real-world scenarios and applications
- Include both simple and complex examples
- Provide step-by-step solutions
- Show common variations and edge cases
${HELPER_MERMAID_MARKDOWN}
- Format with clear example numbering
- Length: 300-500 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 1200,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No examples generated';
        });
    }

    /**
     * Generates real life applications content
     */
    async generateRealLifeApplications(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Explain real-world applications of "${topic.title}".

Context: ${topic.description}

Instructions:
- Identify practical applications in various industries
- Show how the concept is used in daily life
- Include specific examples from technology, science, business
- Explain the impact and benefits
- Connect theory to practical implementation
- Include current and emerging applications
${HELPER_MARKDOWN}
- Length: 250-400 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 1000,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No real life applications generated';
        });
    }

    /**
     * Generates cross disciplinary connections content
     */
    async generateCrossDisciplinaryConnections(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Explore cross-disciplinary connections for "${topic.title}".

Context: ${topic.description}

Instructions:
- Show connections to other fields and disciplines
- Explain interdisciplinary applications
- Include examples from science, technology, arts, humanities
- Show how concepts transfer between domains
- Identify shared principles and methodologies
- Include collaborative research areas
${HELPER_MARKDOWN}
- Length: 200-350 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 900,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No cross disciplinary connections generated';
        });
    }

    /**
     * Generates mnemonics content
     */
    async generateMnemonics(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Create memory aids and mnemonics for "${topic.title}".

Context: ${topic.description}

Instructions:
- Develop memorable acronyms and phrases
- Create visual memory associations
- Include rhymes and word patterns
- Show memory palace techniques
- Provide multiple mnemonic options
- Explain how each mnemonic works
${HELPER_MARKDOWN}
- Length: 150-300 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 800,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No mnemonics generated';
        });
    }

    /**
     * Generates references content
     */
    async generateReferences(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Provide references and further reading for "${topic.title}".

Context: ${topic.description}

Instructions:
- Include academic textbooks and papers
- List online resources and websites
- Include video tutorials and courses
- Suggest practice problems and exercises
- Include historical and foundational texts
- Organize by difficulty level
${HELPER_MARKDOWN}
- Length: 200-300 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 800,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No references generated';
        });
    }

    /**
     * Generates comparisons content
     */
    async generateComparisons(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Create comparisons and contrasts for "${topic.title}".

Context: ${topic.description}

Instructions:
- Compare with similar concepts or alternatives
- Show similarities and differences
- Use comparison tables where helpful
- Include pros and cons analysis
- Show when to use each option
- Include performance comparisons
${HELPER_MERMAID_MARKDOWN}
- Format with clear comparison structure
- Length: 250-400 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 1000,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No comparisons generated';
        });
    }

    /**
     * Generates resources content
     */
    async generateResources(topic: TopicAnalysis): Promise<string> {
        return this.executeWithRetry(async () => {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `Compile resources and materials for "${topic.title}".

Context: ${topic.description}

Instructions:
- Include learning materials and documentation
- List online platforms and databases
- Include multimedia resources (videos, simulations)
- Provide community and forum resources
- Include professional organizations
- Show funding and support resources
${HELPER_MARKDOWN}
- Length: 200-350 words`
                    }
                ],
                model: AI_CONFIG.MODELS.GPTOSS,
                temperature: AI_CONFIG.TEMPERATURE.EDUCATIONAL,
                max_tokens: 900,
                stream: false,
                stop: null
            });
            return chatCompletion.choices[0]?.message?.content || 'No resources generated';
        });
    }

    /**
     * Analyzes image using Llama4 model with context
     */
    async analyzeImageWithContext(imageBlob: Blob): Promise<TopicAnalysis> {
        console.log('AIService: Starting image analysis');
        try {
            console.log('AIService: Converting image to base64');
            const base64Image = await blobToBase64(imageBlob);
            console.log('AIService: Image converted to base64, length:', base64Image.length);

            const analysis = await this.executeWithRetry(async () => {
                console.log('AIService: Making API call for image analysis');
                const chatCompletion = await this.groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: `You are given an image.
If there is any text in the image, transcribe it.
Provide a very short explanation of the topic as if explaining it to a student.

Return the result strictly in the following JSON format:
{
  "title": "transcribed text here",
  "description": "short student-friendly explanation here",
  "teachingTechnique": "flowchart"
}
Only return valid JSON. Do not include anything else.`
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${base64Image}`
                                    }
                                }
                            ]
                        }
                    ],
                    model: AI_CONFIG.MODELS.LLAMA4,
                    temperature: AI_CONFIG.TEMPERATURE.ANALYSIS,
                    max_tokens: AI_CONFIG.MAX_TOKENS.ANALYSIS,
                    stream: false,
                    response_format: {
                        type: "json_object"
                    },
                    stop: null
                });

                return chatCompletion.choices[0]?.message?.content || "No analysis received";
            });

            console.log("Llama-4 Analysis:", analysis);
            console.log('AIService: Parsing analysis JSON');
            const parsedAnalysis = JSON.parse(analysis);
            console.log('AIService: Image analysis successful');
            return parsedAnalysis;
        } catch (error) {
            console.error('Image analysis failed:', error);
            throw error;
        }
    }
}

// Singleton instance
export const aiService = new AIService();
