/**
 * Simple text formatting function to break long text into lines
 */
export const formatTextWithLineBreaks = (text: string, maxWordsPerLine: number = 8): string => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine: string[] = [];

    for (const word of words) {
        currentLine.push(word);
        if (currentLine.length >= maxWordsPerLine) {
            lines.push(currentLine.join(' '));
            currentLine = [];
        }
    }

    if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
    }

    return lines.join('\n');
};

/**
 * Extract table content from educational text
 */
export const extractSpecialContent = (text: string) => {
    const tableRegex = /<table>([\s\S]*?)<\/table>/g;

    const tableMatches = [...text.matchAll(tableRegex)];

    // Replace the special tags with markers in the text
    let cleanText = text;
    let tableIndex = 0;

    cleanText = cleanText.replace(tableRegex, () => {
        const marker = `__TABLE_BLOCK_${tableIndex}__`;
        tableIndex++;
        return marker;
    });

    return {
        cleanText,
        tableBlocks: tableMatches.map(match => match[1].trim())
    };
};
