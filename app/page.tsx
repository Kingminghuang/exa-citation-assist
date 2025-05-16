"use client";

import Exasvg from "@/public/svgs/exasvg";
import Dots from "@/utils/Dots";
import { useCallback, useEffect, useRef, useState } from "react";
import callExaSearcher from "../utils/exa";

// Helper function to get cursor position in text
function getCursorPositionInText(element) {
  // Get the selection
  const selection = window.getSelection();
  if (!selection.rangeCount) return -1;
  
  // Get the range
  const range = selection.getRangeAt(0);
  
  // Create a range that spans from the start of the element to the cursor position
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  
  // The character count within the pre-caret range is the position
  return preCaretRange.toString().length;
}

// Helper function to find node and offset at a specific text position
function findNodeAndOffsetAtPosition(container, targetPosition) {
  const nodeIterator = document.createNodeIterator(
    container,
    NodeFilter.SHOW_TEXT
  );
  
  let currentPos = 0;
  let currentNode = nodeIterator.nextNode();
  
  while (currentNode) {
    const nodeLength = currentNode.nodeValue.length;
    
    if (currentPos + nodeLength >= targetPosition) {
      // Target position is within this node
      return {
        node: currentNode,
        offset: targetPosition - currentPos
      };
    }
    
    // Move to the next node
    currentPos += nodeLength;
    currentNode = nodeIterator.nextNode();
  }
  
  // If we couldn't find the position, return the last node
  return {
    node: container,
    offset: 0
  };
}

export default function Home() {
  const [writingState, setWritingState] = useState(`Recent advances in large language model (LLM) technology promise to redefine how we interact with language technologies and use them in the new digital era.
One common challenge faced by LLMs is "hallucination" where they may produce answers that seem correct but are actually inaccurate or misleading.
This can be particularly problematic in scientific investigations where accuracy and reliability of evidences and claims are critical.`);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentEditableRef = useRef(null);
  const [startGenerating, setStartGenerating] = useState(false);
  // Add popup-related states
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [citationResults, setCitationResults] = useState([]);
  const [citationStyle, setCitationStyle] = useState("APA"); // Options: "APA", "MLA", "Chicago"
  // Citation insertion tracking state
  const [lastCitationPoint, setLastCitationPoint] = useState({ text: "", position: -1 });
  // Drag functionality states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);
  // Track consecutive Tab key presses for showing citation popup
  const [tabCount, setTabCount] = useState(0);
  const tabTimeoutRef = useRef(null);
  // For keyboard navigation in citation results
  const [focusedCitationIndex, setFocusedCitationIndex] = useState(0);
  const citationButtonsRef = useRef([]);
  const findCitationsButtonRef = useRef(null);

  const generateText = useCallback(
    async (currentWritingState) => {
      if (isGenerating || !currentWritingState) return;

      setIsGenerating(true);
      
      // Reset focused citation index for keyboard navigation
      setFocusedCitationIndex(0);
      citationButtonsRef.current = [];
      
      try {
        console.log("@@@@ WRITING STATE @@@@");
        console.log(currentWritingState);
        
        // Call Exa search
        let exaSearchResults = await callExaSearcher(currentWritingState);
        console.log("@@@@ SEARCH RESULTS @@@@", exaSearchResults);
        
        // Store search results for display in popup
        setCitationResults(exaSearchResults);
        
      } catch (error) {
        console.error("Error in generateText:", error);
        // Show error message if needed
      } finally {
        setIsGenerating(false);
        setStartGenerating(false);
        // We no longer hide the popup here since we want to show the results
      }
    },
    [isGenerating]
  );

  const handleStartTrigger = useCallback(() => {
    generateText(writingState);
  }, [generateText, writingState]);

  // Function to handle text selection
  const handleTextSelection = useCallback(() => {
    console.log("Text selection handler running");
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentEditableRef.current) {
      console.log("No valid selection detected");
      return;
    }
    
    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) {
      console.log("Selected text is empty after trimming");
      return;
    }
    
    console.log("Selected text:", text);
    
    // Get the selected text
    setSelectedText(text);
    
    // Calculate position for popup
    const rect = range.getBoundingClientRect();
    const editorRect = contentEditableRef.current.getBoundingClientRect();
    
    // Position the popup to not shadow the selected content
    // Place it to the right of the selection if there's enough space, otherwise above
    const rightSpace = window.innerWidth - rect.right;
    if (rightSpace >= 300) { // Check if there's enough space for the popup (min-width: 300px)
      setPopupPosition({
        top: rect.top - editorRect.top, // Align with the top of selection
        left: rect.right - editorRect.left + 10 // 10px to the right of the selection
      });
    } else {
      // If not enough space to the right, position above
      setPopupPosition({
        top: rect.top - editorRect.top - 40, // 40px above the selection
        left: rect.left - editorRect.left + (rect.width / 2)
      });
    }
    
    console.log("Popup position calculated");
    
    // Only reset results if selection has changed significantly
    if (text !== selectedText) {
      console.log("Selection changed, resetting citation results");
      setCitationResults([]);
      
      // If selection has changed, also reset the last citation point
      // This ensures we start fresh with new citation positions
      setLastCitationPoint({ text: "", position: -1 });
    }
  }, [selectedText, setLastCitationPoint]);

  // Function to explicitly close the popup
  const closePopup = useCallback(() => {
    console.log("Closing popup");
    setShowPopup(false);
    
    // Reset the citation insertion tracking when popup is closed
    setLastCitationPoint({ text: "", position: -1 });
  }, [setLastCitationPoint]);
  
  // Function to hide the popup when clicking outside
  const handleClickOutside = useCallback((event) => {
    console.log("Click outside handler running", event.target);
    
    // Get the popup element
    const popupElement = document.querySelector('.popup-container');
    
    // Check if the click was outside both the editor and the popup
    const isOutsideEditor = contentEditableRef.current && !contentEditableRef.current.contains(event.target);
    const isOutsidePopup = !popupElement || !popupElement.contains(event.target);
    
    if (isOutsideEditor && isOutsidePopup) {
      console.log("Click was outside editor and popup - hiding popup");
      setShowPopup(false);
    } else {
      console.log("Click was inside editor or popup - keeping popup visible");
    }
  }, []);

  // Function to handle keyboard events (for navigation)
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setShowPopup(false);
      setTabCount(0);
      setFocusedCitationIndex(0);
      
      // Return focus to editor
      if (contentEditableRef.current) {
        contentEditableRef.current.focus();
      }
    } else if (event.key === 'Tab') {
      // Prevent default tab behavior in the editor
      event.preventDefault();
      
      // Get the current selection state
      const selection = window.getSelection();
      if (!contentEditableRef.current) return;
      
      // Increment tab count
      setTabCount(prevCount => {
        const newCount = prevCount + 1;
        
        // On second tab press
        if (newCount === 2) {
          // If there's no current selection, select the current sentence
          if (selection.isCollapsed) {
            console.log("Tab pressed twice - selecting current sentence");
            
            // Get current content
            const content = contentEditableRef.current.innerText;
            const cursorPosition = getCursorPositionInText(contentEditableRef.current);
            
            if (cursorPosition !== -1) {
              // Check if cursor is right after a sentence-ending punctuation
              const isAfterPunctuation = cursorPosition > 0 && 
                  ['.', '?', '!'].includes(content.charAt(cursorPosition - 1));
              
              // Modified approach for handling cursor position
              let startPos, endPos;
              
              if (isAfterPunctuation) {
                // If cursor is right after punctuation, find the start of this sentence (the one that just ended)
                endPos = cursorPosition;
                startPos = endPos;
                
                // Go backward to find the start of the current sentence
                while (startPos > 0) {
                  const char = content.charAt(startPos - 1);
                  if (char === '.' || char === '?' || char === '!' || char === '\n') {
                    break; // Found the previous sentence boundary
                  }
                  startPos--;
                }
              } else {
                // Normal case - find the current sentence containing the cursor
                
                // Find the start of the current sentence (search backwards)
                startPos = cursorPosition;
                while (startPos > 0) {
                  const char = content.charAt(startPos - 1);
                  if (char === '.' || char === '?' || char === '!' || char === '\n') {
                    startPos++; // Move past the punctuation mark to get start of the sentence
                    break;
                  }
                  startPos--;
                }
                
                // Find the end of the current sentence (search forward)
                endPos = cursorPosition;
                while (endPos < content.length) {
                  const char = content.charAt(endPos);
                  if (char === '.' || char === '?' || char === '!' || char === '\n') {
                    endPos++; // Include the period/question mark/exclamation mark
                    break;
                  }
                  endPos++;
                }
                
                // If we couldn't find an ending punctuation, use the end of content
                if (endPos === content.length && !['.',  '?', '!'].includes(content.charAt(endPos - 1))) {
                  endPos = content.length;
                }
              }
              
              // Make sure we have a valid range (startPos must be less than endPos)
              if (startPos >= endPos) {
                startPos = Math.max(0, endPos - 1);
              }
              
              // Create range for the sentence
              const range = document.createRange();
              
              // Find the nodes that contain start and end positions
              const { node: startNode, offset: startOffset } = findNodeAndOffsetAtPosition(contentEditableRef.current, startPos);
              const { node: endNode, offset: endOffset } = findNodeAndOffsetAtPosition(contentEditableRef.current, endPos);
              
              if (startNode && endNode) {
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                
                // Apply the selection
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Process this new selection to update state and position popup
                handleTextSelection();
              }
            }
          }
          
          // Show the popup
          setShowPopup(true);
          
          // Move focus to the first interactive element in the popup
          setTimeout(() => {
            if (citationResults.length > 0) {
              // Focus the first citation item
              setFocusedCitationIndex(0);
              if (citationButtonsRef.current[0]) {
                citationButtonsRef.current[0].focus();
              }
            } else if (findCitationsButtonRef.current) {
              // Focus the "Find citations" button
              findCitationsButtonRef.current.focus();
            }
          }, 50);
          
          // Reset tab count
          return 0;
        }
        
        // Clear previous timeout if exists
        if (tabTimeoutRef.current) {
          clearTimeout(tabTimeoutRef.current);
        }
        
        // Set timeout to reset tab count if second tab not pressed within 800ms
        tabTimeoutRef.current = setTimeout(() => {
          setTabCount(0);
        }, 800);
        
        return newCount;
      });
    } else if (showPopup && citationResults.length > 0) {
      // Handle keyboard navigation in citation list
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedCitationIndex(prevIndex => {
          const newIndex = Math.min(prevIndex + 1, citationResults.length - 1);
          // Focus the citation button at the new index
          if (citationButtonsRef.current[newIndex]) {
            citationButtonsRef.current[newIndex].focus();
          }
          return newIndex;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedCitationIndex(prevIndex => {
          const newIndex = Math.max(prevIndex - 1, 0);
          // Focus the citation button at the new index
          if (citationButtonsRef.current[newIndex]) {
            citationButtonsRef.current[newIndex].focus();
          }
          return newIndex;
        });
      }
    }
  }, [showPopup, citationResults, contentEditableRef, handleTextSelection]);

  // Function to handle context menu (right-click)
  const handleContextMenu = useCallback((event) => {
    // Only process if we're inside the editor
    if (!contentEditableRef.current?.contains(event.target)) {
      return;
    }
    
    // Prevent default context menu
    event.preventDefault();
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.log("No text selected for context menu");
      return;
    }
    
    // Process the selection
    handleTextSelection();
    
    // Show the popup immediately (unlike with Tab which requires double-press)
    setShowPopup(true);
    
    console.log("Showing citation popup from context menu");
    
    // After a brief delay, focus on the appropriate element
    setTimeout(() => {
      if (citationResults.length > 0) {
        // Focus the first citation item if available
        setFocusedCitationIndex(0);
        if (citationButtonsRef.current[0]) {
          citationButtonsRef.current[0].focus();
        }
      } else if (findCitationsButtonRef.current) {
        // Otherwise focus the "Find citations" button
        findCitationsButtonRef.current.focus();
      }
    }, 50);
  }, [handleTextSelection, citationResults]);

  // Function to format citation based on style
  const formatCitation = useCallback((citation, style) => {
    try {
      // Get citation components
      const author = citation.author || "Unknown";
      const authorLastName = author.split(',')[0].trim().split(' ').pop();
      const authorFirstName = author.includes(',') ? 
        author.split(',')[1]?.trim().split(' ')[0] : 
        author.split(' ')[0];
      const authorInitial = authorFirstName ? authorFirstName[0] : "";
      
      const title = citation.title;
      const year = citation.publishedDate ? new Date(citation.publishedDate).getFullYear() : 'n.d.';
      const url = citation.url;
      
      let citationText = "";
      
      // Format according to style
      switch(style) {
        case "APA":
          // (LastName, Year)[URL]
          citationText = ` (${authorLastName}, ${year})[${url}]`;
          break;
          
        case "MLA":
          // (LastName)[URL]
          citationText = ` (${authorLastName})[${url}]`;
          break;
          
        case "Chicago":
          // (LastName Year)[URL]
          citationText = ` (${authorLastName} ${year})[${url}]`;
          break;
          
        default:
          // Default to APA
          citationText = ` (${authorLastName}, ${year})[${url}]`;
      }
      
      return citationText;
    } catch (error) {
      console.error("Error formatting citation:", error);
      return ` (Citation)[${citation.url}]`; // Fallback
    }
  }, []);

  // Function to handle citation selection
  const handleCitationSelection = useCallback((citation) => {
    console.log("Citation selected:", citation);
    
    try {
      // Format the citation according to selected style
      const citationText = formatCitation(citation, citationStyle);
      
      console.log("Formatted citation:", citationText);
      
      const selection = window.getSelection();
      let newContent;
      let currentSelectedText = selectedText;
      
      // Check if we have a valid selection or saved insertion point
      const hasValidSelection = selection && !selection.isCollapsed && currentSelectedText;
      const hasSavedPosition = lastCitationPoint.text === currentSelectedText && lastCitationPoint.position !== -1;
      
      if (hasValidSelection || hasSavedPosition) {
        let selectedPos;
        
        if (hasValidSelection) {
          // If we have a new selection, find its position in the writing state
          selectedPos = writingState.indexOf(currentSelectedText);
          console.log("New selection detected, position:", selectedPos);
          
          // Save this position for future citations
          setLastCitationPoint({
            text: currentSelectedText,
            position: selectedPos
          });
        } else {
          // Use the last saved insertion point
          selectedPos = lastCitationPoint.position;
          currentSelectedText = lastCitationPoint.text;
          console.log("Using saved selection position:", selectedPos);
        }
        
        if (selectedPos !== -1) {
          // Find all citations after the selected text
          const textAfterSelection = writingState.slice(selectedPos + currentSelectedText.length);
          
          // Use regex to find the last citation's end position, if any
          const citationRegex = /\s*\([^)]+\)\[[^\]]+\]/g;
          let lastCitationEndPos = 0;
          let match;
          
          // Loop through all citations in the text after selection
          while ((match = citationRegex.exec(textAfterSelection)) !== null) {
            // If this citation starts immediately after selection or another citation,
            // update the last citation end position (allowing for whitespace)
            if (match.index <= 2) { // Allow for spaces between citations
              lastCitationEndPos = match.index + match[0].length;
            } else {
              // This citation is not adjacent to selection or another citation
              break;
            }
          }
          
          // Insert point is after the selected text plus any adjacent citations
          const insertPoint = selectedPos + currentSelectedText.length + lastCitationEndPos;
          
          // Insert after the last adjacent citation if one exists, or directly after selection
          newContent = writingState.slice(0, insertPoint) + 
                      citationText + 
                      writingState.slice(insertPoint);
          
          console.log("Inserting citation after existing citations at position:", insertPoint);
        } else {
          // Fallback if the exact text can't be found anymore
          newContent = writingState + citationText;
          
          // Reset the insertion tracking since we couldn't find the reference point
          setLastCitationPoint({ text: "", position: -1 });
        }
      } else {
        // No selection, append to the end
        newContent = writingState + citationText;
        
        // Reset the insertion tracking
        setLastCitationPoint({ text: "", position: -1 });
      }
      
      console.log("Setting new writing state with citation");
      setWritingState(newContent);
      
      // Keep the popup visible - removed the setShowPopup(false) line
    } catch (error) {
      console.error("Error handling citation selection:", error);
      
      // Reset the insertion tracking on error
      setLastCitationPoint({ text: "", position: -1 });
    }
  }, [writingState, selectedText, citationStyle, formatCitation, lastCitationPoint, setLastCitationPoint]);

  // Function to open link in a new tab
  const openInNewTab = useCallback((url) => {
    window.open(url, '_blank');
  }, []);
  
  // Function to handle citation style change
  const handleCitationStyleChange = useCallback((style) => {
    setCitationStyle(style);
  }, []);

  // Drag functionality handlers
  const handleDragStart = useCallback((e) => {
    if (!popupRef.current) return;
    
    // Prevent default behavior to avoid text selection during dragging
    e.preventDefault();
    
    // Get current popup position and mouse position
    const popupRect = popupRef.current.getBoundingClientRect();
    
    // Calculate the offset between mouse position and popup position
    setDragOffset({
      x: e.clientX - popupRect.left,
      y: e.clientY - popupRect.top
    });
    
    // Set dragging state to true
    setIsDragging(true);
    
    console.log("Started dragging popup");
  }, []);
  
  const handleDragMove = useCallback((e) => {
    if (!isDragging || !popupRef.current) return;
    
    // Get editor bounds to keep popup relative to editor
    const editorRect = contentEditableRef.current.getBoundingClientRect();
    
    // Calculate new position based on mouse position and original offset
    const newLeft = e.clientX - editorRect.left - dragOffset.x;
    const newTop = e.clientY - editorRect.top - dragOffset.y;
    
    // Update popup position
    setPopupPosition({
      left: newLeft,
      top: newTop
    });
    
    console.log("Dragging popup to:", { top: newTop, left: newLeft });
  }, [isDragging, dragOffset]);
  
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    // Reset dragging state
    setIsDragging(false);
    console.log("Stopped dragging popup");
  }, [isDragging]);

  // Function to trigger search from popup
  const handleGenerateFromPopup = useCallback(() => {
    console.log("Selected text:", selectedText);
    console.log("Writing state length:", writingState ? writingState.length : 0);
    
    // Use selected text if available, otherwise use the entire writing state
    const textToSearch = selectedText || writingState;
    if (textToSearch && textToSearch.trim()) {
      console.log("Searching for:", textToSearch.substring(0, 50) + "...");
      generateText(textToSearch);
    } else {
      console.error("No text to search with");
      alert("No text selected or written. Please write something or select text first.");
    }
  }, [generateText, selectedText, writingState]);

  // Function to render links in text as HTML elements
  const renderLinksInText = useCallback((text) => {
    const linkRegex = /\(([^)]+)\)\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const linkText = match[1] || "Source";
      parts.push(
        `<a contenteditable="false" href="${match[2]}" target="_blank" class="text-blue-600 hover:underline">${linkText}</a>`
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.join("");
  }, []);

  const handleInput = useCallback(
    (event) => {
      const newContent = event.currentTarget.innerHTML;
      console.log(newContent);
      setWritingState(newContent);

      // Use setTimeout to ensure DOM is updated before setting the range
      setTimeout(() => {
        const range = document.createRange();
        const selection = window.getSelection();

        // Select the contentEditable div
        range.selectNodeContents(contentEditableRef.current);

        // Collapse the range to the end
        range.collapse(false);

        // Apply the range to the selection
        selection.removeAllRanges();
        selection.addRange(range);

        // Focus on the contentEditable div
        contentEditableRef.current.focus();
      }, 0);
    },
    []
  );

  // Add event listeners for selection and clickOutside
  useEffect(() => {
    console.log("Setting up event listeners");
    
    // Use mouseup for selection instead of selectionchange for better control
    const handleMouseUp = () => {
      console.log("Mouse up detected - checking for selection");
      // Process selection but don't show popup immediately on mouse selection
      setTimeout(() => {
        handleTextSelection();
        // Don't set showPopup = true here, as we only want to show the popup on tab press
      }, 0); 
    };
    
    // Handle selection change via keyboard (arrow keys, shift+arrows)
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        handleTextSelection();
      }
    };
    
    // Drag event handlers
    const handleMouseMove = (e) => {
      handleDragMove(e);
    };
    
    const handleMouseUpForDrag = () => {
      handleDragEnd();
    };
    
    if (contentEditableRef.current) {
      contentEditableRef.current.addEventListener('mouseup', handleMouseUp);
      contentEditableRef.current.addEventListener('selectionchange', handleSelectionChange);
      contentEditableRef.current.addEventListener('contextmenu', handleContextMenu);
    }
    
    // Add mouse move and mouse up listeners for dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpForDrag);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      console.log("Cleaning up event listeners");
      if (contentEditableRef.current) {
        contentEditableRef.current.removeEventListener('mouseup', handleMouseUp);
        contentEditableRef.current.removeEventListener('selectionchange', handleSelectionChange);
        contentEditableRef.current.removeEventListener('contextmenu', handleContextMenu);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpForDrag);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleTextSelection, handleClickOutside, handleKeyDown, handleDragMove, handleDragEnd, handleContextMenu]);

  // Clean up the tab timeout when component unmounts
  useEffect(() => {
    return () => {
      if (tabTimeoutRef.current) {
        clearTimeout(tabTimeoutRef.current);
      }
    };
  }, []);

  // Reset citation buttons refs and focused index when results change
  useEffect(() => {
    // Clear previous refs
    citationButtonsRef.current = [];
    
    // Reset focused citation index when results change
    setFocusedCitationIndex(0);
    
    // Focus the first citation if available, after a brief delay to let rendering complete
    if (citationResults.length > 0 && showPopup) {
      setTimeout(() => {
        if (citationButtonsRef.current[0]) {
          citationButtonsRef.current[0].focus();
        }
      }, 50);
    }
  }, [citationResults, showPopup]);

  useEffect(() => {
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = renderLinksInText(writingState);
    }
  }, [writingState, renderLinksInText]);

  // Focus on the contentEditable div when the page loads and put cursor at the end
  useEffect(() => {
    if (contentEditableRef.current) {
      // Focus on the contentEditable div
      contentEditableRef.current.focus();
      
      // Set cursor at the end of the content
      const range = document.createRange();
      const selection = window.getSelection();
      
      range.selectNodeContents(contentEditableRef.current);
      range.collapse(false); // false means collapse to end
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log("Editor focused and cursor placed at the end");
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full border-6 max-w-4xl p-6">
        <p className="text-gray-400">DEMO</p>
        <h1 className="md:text-6xl text-4xl pb-3 font-medium">
          Get {" "}
          <span className="text-brand-default">citation </span>
          assistance
        </h1>

        <p className="text-black mb-3">
          Start writing your paragraph. Select text to see Cite options.
        </p>

        <div className="relative">
          <div
            ref={contentEditableRef}
            id="input-text"
            onInput={handleInput}
            contentEditable={isGenerating ? false : true}
            className="w-full bg-white p-2 border outline-none ring-2 ring-brand-default resize-none min-h-[200px] overflow-auto"
          />
          
          {showPopup && (
            <div
              ref={popupRef}
              className="popup-container absolute z-10 bg-white shadow-md rounded-md border border-gray-200 py-1 flex flex-col items-start"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                minWidth: '300px',
                maxWidth: '500px',
                maxHeight: '400px',
                overflow: 'auto',
                cursor: isDragging ? 'grabbing' : 'grab',
                // Ensure the popup is always visible within the viewport
                transform: 'translate(0, 0)',
                transformOrigin: 'top left'
              }}
              onClick={(e) => {
                // Prevent click from bubbling to document and triggering handleClickOutside
                e.stopPropagation();
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
            >
              {citationResults.length === 0 ? (
                <div className="px-4 py-3 w-full">
                  <div 
                    className="flex justify-between items-center mb-2 cursor-grab"
                    onMouseDown={handleDragStart}
                  >
                    <h3 className="text-sm font-semibold text-gray-700">Citation Tool</h3>
                    <button 
                      onClick={closePopup}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label="Close popup"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {!isGenerating ? (
                    <button
                      ref={findCitationsButtonRef}
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGenerateFromPopup();
                      }}
                      className="w-full text-left flex items-center px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors rounded"
                      onKeyDown={(e) => {
                        // Handle keyboard navigation
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleGenerateFromPopup();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Cite
                    </button>
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-600 flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <Dots>Searching for citations</Dots>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div 
                    className="w-full px-4 py-2 border-b border-gray-200 flex justify-between items-center cursor-grab" 
                    onMouseDown={handleDragStart}
                  >
                    <h3 className="text-sm font-semibold text-gray-700">Select citations</h3>
                    
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600 mr-2">Style:</span>
                      <select 
                        value={citationStyle}
                        onChange={(e) => handleCitationStyleChange(e.target.value)}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        <option value="APA">APA</option>
                        <option value="MLA">MLA</option>
                        <option value="Chicago">Chicago</option>
                      </select>
                      
                      <button 
                        onClick={closePopup}
                        className="ml-3 text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Close popup"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-full max-h-[350px] overflow-y-auto">
                    {citationResults.map((result, index) => (
                      <div
                        key={index}
                        className={`w-full text-left border-b border-gray-100 last:border-b-0 ${focusedCitationIndex === index ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors p-3`}
                      >
                        <div className="text-sm font-medium text-gray-800 mb-1">{result.title}</div>
                        <div className="text-xs text-gray-600 mb-1">{result.author}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(result.publishedDate).toLocaleDateString()}
                        </div>
                        {result.highlights && result.highlights.length > 0 && (
                          <div className="text-xs italic text-gray-700 bg-gray-50 p-2 rounded mb-2">
                            "{result.highlights[0]}"
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                          <button
                            ref={el => {
                              // Store ref to each citation button for keyboard navigation
                              if (citationButtonsRef.current.length <= index) {
                                citationButtonsRef.current[index] = el;
                              } else {
                                citationButtonsRef.current.splice(index, 1, el);
                              }
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCitationSelection(result);
                            }}
                            onKeyDown={(e) => {
                              // Handle Enter key for selection
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCitationSelection(result);
                              }
                            }}
                            disabled={isGenerating}
                            className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-700 rounded border border-blue-200 flex items-center"
                            tabIndex={0}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Citation
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openInNewTab(result.url);
                            }}
                            onKeyDown={(e) => {
                              // Handle Enter key for opening URL
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openInNewTab(result.url);
                              }
                            }}
                            className="text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none text-gray-700 rounded border border-gray-200 flex items-center"
                            tabIndex={0}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View in New Tab
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-between align-middle">
          <Exasvg />
          <div className="text-brand-default flex flex-col items-end">
            <h1 className="text-2xl text-bold">
              {isGenerating ? <Dots>Finding</Dots> : "Ready"}
            </h1>
            
            {/* Debug area */}
            <div className="mt-2 flex flex-col items-end">
              <div className="flex items-center mb-1">
                <span className="text-xs mr-2">Citation Style:</span>
                <select 
                  value={citationStyle}
                  onChange={(e) => handleCitationStyleChange(e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                </select>
              </div>
              <button 
                onClick={handleGenerateFromPopup}
                className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
              >
                Debug: Test Citation Function
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
