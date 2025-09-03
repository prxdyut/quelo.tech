import { FONT_FAMILY } from "@excalidraw/excalidraw";

/**
 * Convert HTML table content to markdown table format
 */
export const convertHtmlTableToMarkdown = (htmlTableContent: string): string => {
    // Parse HTML table structure
    const rows: string[][] = [];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<(?:th|td)>([\s\S]*?)<\/(?:th|td)>/gi;

    let rowMatch;
    while ((rowMatch = rowRegex.exec(htmlTableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            let cellContent = cellMatch[1].trim();
            // Clean up HTML entities and extra whitespace
            cellContent = cellContent
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\s+/g, ' ')
                .trim();
            cells.push(cellContent);
        }
        
        if (cells.length > 0) {
            rows.push(cells);
        }
    }

    if (rows.length === 0) return '';

    // Convert to markdown format
    const markdownRows = rows.map(row => 
        '| ' + row.join(' | ') + ' |'
    );

    // Add separator row after header if we have at least 2 rows
    if (rows.length >= 2) {
        const separator = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
        markdownRows.splice(1, 0, separator);
    }

    return markdownRows.join('\n');
};

/**
 * Create visual table elements from markdown table content
 */
export const createVisualTableElements = (tableMarkdown: string, startX: number, startY: number): any[] => {
    const elements: any[] = [];
    const lines = tableMarkdown.trim().split('\n').filter(line => line.trim());

    if (lines.length < 2) return elements; // Need at least header and one data row

    // Function to clean HTML tags and entities from cell content
    const cleanCellContent = (content: string): string => {
        return content
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&lt;/g, '<')   // Convert back HTML entities to readable text
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')  // Do this last to avoid double conversion
            .trim();
    };

    // Parse table rows - handle both markdown tables and plain text tables
    let rows: string[][] = [];
    
    if (tableMarkdown.includes('|')) {
        // Markdown table format
        rows = lines.map(line => 
            line.split('|').slice(1, -1).map(cell => cleanCellContent(cell))
        );
        // Remove separator row if it exists
        if (rows.length > 1 && rows[1].every(cell => /^-+$/.test(cell))) {
            rows.splice(1, 1);
        }
    } else {
        // Plain text table - try to parse as CSV-like
        rows = lines.map(line => 
            line.split(/\s{2,}|\t|,/).filter(cell => cell.trim()).map(cell => cleanCellContent(cell))
        );
    }

    if (rows.length === 0) return elements;

    // Calculate dynamic column widths based on content with improved accuracy
    const numCols = rows[0].length;
    const colWidths: number[] = new Array(numCols).fill(0);
    
    // Function to wrap text when it exceeds maximum width
    const wrapText = (text: string, maxWidth: number, fontSize: number): string => {
        if (!text) return '';
        
        const avgCharWidth = fontSize * 0.6; // More accurate character width for better fitting
        const margin = 20; // Small margin (10px on each side)
        const availableWidth = maxWidth - margin;
        const maxCharsPerLine = Math.floor(availableWidth / avgCharWidth);
        
        // Break text based on actual box width with minimal margin
        if (text.length <= maxCharsPerLine) return text;
        
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            // Use strict line length check based on available width
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // Break very long words to fit within the box
                    if (word.length > maxCharsPerLine) {
                        lines.push(word.substring(0, maxCharsPerLine));
                        currentLine = word.substring(maxCharsPerLine);
                    } else {
                        currentLine = word;
                    }
                }
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.join('\n');
    };

    // Improved width calculation based on text length and font size
    const getTextWidth = (text: string, fontSize: number): number => {
        if (!text) return 150; // Reduced minimum width for empty cells
        
        // More accurate character width estimation based on font family and size
        // Virgil font (fontFamily: 1) has variable character widths, use conservative estimate
        const avgCharWidth = fontSize * 0.8; // Increased back for more generous width
        const textWidth = text.length * avgCharWidth;
        
        // Add generous padding (60% of text width, minimum 50px) - balanced approach
        const padding = Math.max(50, textWidth * 0.6);
        return Math.ceil(textWidth + padding);
    };

        // Calculate minimum width needed for each column
    rows.forEach((row, rowIndex) => {
        const fontSize = rowIndex === 0 ? 20 : 16; // Match the font sizes used in rendering
        
        row.forEach((cell, colIndex) => {
            if (colIndex < numCols) {
                const cellWidth = getTextWidth(cell, fontSize);
                colWidths[colIndex] = Math.max(colWidths[colIndex], cellWidth);
            }
        });
    });
    
    // Cap maximum width and ensure minimum width
    const maxColWidth = 600; // Increased to reduce need for wrapping
    const minColWidth = 150; // Reduced minimum width
    const maxTotalWidth = 1400; // Increased total width allowance
    
    // First pass: apply individual column limits
    colWidths.forEach((width, index) => {
        colWidths[index] = Math.max(minColWidth, Math.min(maxColWidth, width));
    });
    
    // Second pass: if total width exceeds limit, scale down proportionally
    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth > maxTotalWidth) {
        const scaleFactor = maxTotalWidth / totalWidth;
        colWidths.forEach((width, index) => {
            colWidths[index] = Math.max(minColWidth, Math.floor(width * scaleFactor));
        });
    }

    const baseRowHeight = 60; // Base row height for more compact table
    const padding = 10; // Reduced padding for tighter spacing

    // First pass: Calculate the maximum height needed for each row
    const rowHeights: number[] = [];
    rows.forEach((row, rowIndex) => {
        const fontSize = rowIndex === 0 ? 20 : 16;
        let maxRowHeight = baseRowHeight;
        
        row.forEach((cell, colIndex) => {
            if (colIndex >= numCols) return;
            
            const colWidth = colWidths[colIndex];
            const wrappedText = wrapText(cell || '', colWidth, fontSize);
            const lineCount = wrappedText.split('\n').length;
            const lineHeight = fontSize * 1.25;
            const contentHeight = lineCount * lineHeight + 20; // Add 20px padding
            const cellHeight = Math.max(baseRowHeight, contentHeight);
            
            maxRowHeight = Math.max(maxRowHeight, cellHeight);
        });
        
        rowHeights[rowIndex] = maxRowHeight;
    });

    // Calculate cumulative Y positions for each row
    const rowYPositions: number[] = [];
    let cumulativeY = startY;
    rows.forEach((row, rowIndex) => {
        rowYPositions[rowIndex] = cumulativeY;
        cumulativeY += rowHeights[rowIndex];
    });

    // Second pass: Create table elements with consistent row heights
    rows.forEach((row, rowIndex) => {
        let currentX = startX;
        const rowHeight = rowHeights[rowIndex];
        const y = rowYPositions[rowIndex];
        
        row.forEach((cell, colIndex) => {
            if (colIndex >= numCols) return; // Skip if more cells than expected columns
            
            const colWidth = colWidths[colIndex];
            const x = currentX;

            // Create rectangle for cell
            const rectId = `table-cell-${rowIndex}-${colIndex}-${Math.random().toString(36).substr(2, 9)}`;
            const textId = `table-text-${rowIndex}-${colIndex}-${Math.random().toString(36).substr(2, 9)}`;
            
            elements.push({
                type: 'rectangle',
                id: rectId,
                x,
                y,
                width: colWidth,
                height: rowHeight, // Use consistent row height
                angle: 0,
                strokeColor: '#1e1e1e',
                backgroundColor: rowIndex === 0 ? '#f0f0f0' : 'transparent', // Header row has light background
                fillStyle: 'solid',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 0,
                opacity: 100,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: [], // Remove text binding
                updated: Date.now(),
                link: null,
                locked: false,
            });

            // Create text element for cell content
            const fontSize = rowIndex === 0 ? 20 : 16; // More reasonable font sizes
            
            // Wrap text if it exceeds the column width
            const wrappedText = wrapText(cell || '', colWidth, fontSize);
            const lineCount = wrappedText.split('\n').length;
            
            // Calculate proper vertical centering based on wrapped text
            const textHeight = fontSize * 1.2 * lineCount; // Line height factor * number of lines
            
            elements.push({
                type: 'text',
                id: textId,
                x: x + colWidth / 2, // Center horizontally in the rectangle
                y: y + rowHeight / 2, // Center vertically in the rectangle using consistent row height
                width: colWidth - 20, // Use almost full width with small margin
                height: textHeight,
                text: wrappedText,
                fontSize,
                fontFamily: FONT_FAMILY.Virgil, // Match the reference example font family
                textAlign: 'center', // Always center text within container
                verticalAlign: 'middle', // Use middle for proper centering
                strokeColor: '#1e1e1e',
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 2, // Match the reference example stroke width
                strokeStyle: 'solid',
                roughness: 0,
                opacity: 100,
                angle: 0,
                roundness: null,
                seed: Math.floor(Math.random() * 1000000),
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                boundElements: [],
                updated: Date.now(),
                link: null,
                locked: false,
                containerId: null, // Remove container binding
                originalText: wrappedText,
                autoResize: true, // Enable autoResize for proper text fitting
                lineHeight: 1.25, // Match the reference example // Consistent line height for better alignment
            });
            
            currentX += colWidth;
        });
    });

    return elements;
};
