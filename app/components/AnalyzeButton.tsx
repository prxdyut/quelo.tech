import React from "react";
import { BUTTON_STYLES } from "~/constants/whiteboard";

interface AnalyzeButtonProps {
    onClick: () => void;
    isProcessing: boolean;
    isAPIReady: boolean;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ onClick, isProcessing, isAPIReady }) => {
    const isDisabled = isProcessing || !isAPIReady;
    
    const buttonStyle: React.CSSProperties = {
        position: BUTTON_STYLES.POSITION,
        bottom: BUTTON_STYLES.BOTTOM,
        left: BUTTON_STYLES.LEFT,
        transform: BUTTON_STYLES.TRANSFORM,
        zIndex: BUTTON_STYLES.Z_INDEX,
        padding: BUTTON_STYLES.PADDING,
        backgroundColor: isDisabled ? BUTTON_STYLES.COLORS.DISABLED : BUTTON_STYLES.COLORS.ACTIVE,
        color: 'white',
        border: BUTTON_STYLES.BORDER,
        borderRadius: BUTTON_STYLES.BORDER_RADIUS,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: BUTTON_STYLES.FONT_SIZE,
        fontWeight: BUTTON_STYLES.FONT_WEIGHT,
        boxShadow: BUTTON_STYLES.BOX_SHADOW
    };

    const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) {
            e.currentTarget.style.backgroundColor = BUTTON_STYLES.COLORS.HOVER;
        }
    };

    const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isDisabled) {
            e.currentTarget.style.backgroundColor = BUTTON_STYLES.COLORS.ACTIVE;
        }
    };

    const getButtonText = () => {
        if (isProcessing) {
            return 'Analyzing with AI Models...';
        }
        if (!isAPIReady) {
            return 'Loading Excalidraw...';
        }
        return 'Analyze Frame';
    };

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            style={buttonStyle}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            {getButtonText()}
        </button>
    );
};

export default AnalyzeButton;
