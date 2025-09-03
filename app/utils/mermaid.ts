/**
 * Preprocess mermaid code to ensure proper quoting of node labels
 */
export const preprocessMermaidCode = (mermaidCode: string): string => {
    // First, replace <br> tags with newlines
    let processed = mermaidCode.replace(/<br\s*\/?>/gi, '\n');
    
    // Function to escape quotes and special characters inside content
    const escapeContent = (content: string): string => {
        // Escape existing quotes and HTML by replacing them with HTML entities
        // Order matters: & first to avoid double escaping, then < > for HTML tags, then quotes
        return content
            .replace(/&/g, '&amp;')   // Replace ampersands first to avoid double escaping
            .replace(/</g, '&lt;')    // Replace less than signs (HTML tags)
            .replace(/>/g, '&gt;')    // Replace greater than signs (HTML tags)
            .replace(/"/g, '&quot;')  // Replace double quotes with HTML entity
            .replace(/'/g, '&#39;')   // Replace single quotes with HTML entity
            .trim();
    };
    
    // Function to check if content is already properly quoted
    const isAlreadyQuoted = (content: string): boolean => {
        const trimmed = content.trim();
        return (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
               (trimmed.startsWith("'") && trimmed.endsWith("'"));
    };
    
    // Function to check if a position is inside an already quoted string in the entire line
    const isInsideQuotes = (text: string, position: number): boolean => {
        let insideQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < position; i++) {
            const char = text[i];
            if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
                if (!insideQuotes) {
                    insideQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    insideQuotes = false;
                    quoteChar = '';
                }
            }
        }
        return insideQuotes;
    };
    
    // Process line by line to handle mermaid syntax better
    const lines = processed.split('\n');
    const processedLines = lines.map(line => {
        let processedLine = line;
        
        // Handle square brackets [text] -> ["escaped_text"] only if not already quoted
        processedLine = processedLine.replace(/\[([^\]]+)\]/g, (match, content, offset) => {
            // Skip if this bracket is inside quotes
            if (isInsideQuotes(processedLine, offset)) {
                return match;
            }
            
            // Skip if already properly quoted
            if (isAlreadyQuoted(content)) {
                return match;
            }
            
            // Escape content and add quotes
            const escapedContent = escapeContent(content);
            return `["${escapedContent}"]`;
        });
        
        // Handle parentheses (text) -> ("escaped_text") only if not already quoted
        // Be more careful with parentheses as they can be part of valid mermaid syntax
        processedLine = processedLine.replace(/\(([^)]+)\)/g, (match, content, offset) => {
            // Skip if this parenthesis is inside quotes
            if (isInsideQuotes(processedLine, offset)) {
                return match;
            }
            
            // Skip if already properly quoted
            if (isAlreadyQuoted(content)) {
                return match;
            }
            
            // Skip if this looks like a function call or mermaid syntax (contains only word characters, numbers, spaces, and basic punctuation)
            if (/^[\w\s\-_.,]+$/.test(content) && !content.includes('"') && !content.includes("'")) {
                // For simple content without quotes, we can safely quote it
                const escapedContent = escapeContent(content);
                return `("${escapedContent}")`;
            }
            
            // For complex content, leave it as is to avoid breaking mermaid syntax
            return match;
        });
        
        // Handle curly braces {text} -> {"escaped_text"} only if not already quoted
        processedLine = processedLine.replace(/\{([^}]+)\}/g, (match, content, offset) => {
            // Skip if this brace is inside quotes
            if (isInsideQuotes(processedLine, offset)) {
                return match;
            }
            
            // Skip if already properly quoted
            if (isAlreadyQuoted(content)) {
                return match;
            }
            
            // Escape content and add quotes
            const escapedContent = escapeContent(content);
            return `{"${escapedContent}"}`;
        });
        
        // Handle edge labels that might contain problematic characters
        // Pattern: |"text with quotes"| or |text with quotes|
        processedLine = processedLine.replace(/\|([^|]+)\|/g, (match, content, offset) => {
            // Skip if this is inside quotes
            if (isInsideQuotes(processedLine, offset)) {
                return match;
            }
            
            // Skip if already properly quoted
            if (isAlreadyQuoted(content)) {
                return match;
            }
            
            // Escape content and add quotes
            const escapedContent = escapeContent(content);
            return `|"${escapedContent}"|`;
        });
        
        return processedLine;
    });
    
    return processedLines.join('\n');
};
