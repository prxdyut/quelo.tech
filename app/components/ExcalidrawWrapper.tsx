import { useEffect, useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { graphToExcalidraw } from "~/utils/graphToExcalidraw";
import { DEFAULT_FONT_SIZE } from "~/utils/constants";
import type { MermaidData } from "~/types/whiteboard";

interface ExcalidrawWrapperProps {
  mermaidDefinition: MermaidData["definition"];
  mermaidOutput: MermaidData["output"];
  onExcalidrawAPIReady?: (api: ExcalidrawImperativeAPI) => void;
  appendMode?: boolean; // New prop to control append vs replace behavior
}

const ExcalidrawWrapper = ({
  mermaidDefinition,
  mermaidOutput,
  onExcalidrawAPIReady,
  appendMode = false,
}: ExcalidrawWrapperProps) => {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    if (mermaidDefinition === "" || mermaidOutput === null) {
      excalidrawAPI.resetScene();
      return;
    }

    const { elements, files } = graphToExcalidraw(mermaidOutput, {
      fontSize: DEFAULT_FONT_SIZE,
    });

    const newElements = convertToExcalidrawElements(elements);

    if (appendMode) {
      // Append new elements to existing ones
      const existingElements = excalidrawAPI.getSceneElements();
      
      // Calculate offset to position new elements to the right of existing ones
      let offsetX = 0;
      let offsetY = 0;
      
      if (existingElements.length > 0) {
        const maxX = Math.max(...existingElements.map(el => el.x + el.width));
        const maxY = Math.max(...existingElements.map(el => el.y + el.height));
        offsetX = maxX + 100; // Add some padding
        
        // If the new elements would go too far right, wrap to next row
        if (offsetX > 1200) {
          offsetX = 0;
          offsetY = maxY + 100;
        }
      }
      
      // Apply offset to new elements
      const offsetElements = newElements.map(element => ({
        ...element,
        x: element.x + offsetX,
        y: element.y + offsetY,
      }));
      
      // Combine existing and new elements
      const combinedElements = [...existingElements, ...offsetElements];
      
      excalidrawAPI.updateScene({
        elements: combinedElements,
      });
    } else {
      // Replace existing elements (original behavior)
      excalidrawAPI.updateScene({
        elements: newElements,
      });
    }

    excalidrawAPI.scrollToContent(excalidrawAPI.getSceneElements(), {
      fitToContent: true,
    });

    if (files) {
      excalidrawAPI.addFiles(Object.values(files));
    }
  }, [mermaidDefinition, mermaidOutput, appendMode]);

  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        initialData={{
          appState: {
            viewBackgroundColor: "#fafafa",
            currentItemFontFamily: 1,
          },
        }}
        excalidrawAPI={(api) => {
          setExcalidrawAPI(api);
          onExcalidrawAPIReady?.(api);
        }}
      />
    </div>
  );
};

export default ExcalidrawWrapper;
