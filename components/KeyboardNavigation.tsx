"use client";

import { useEffect } from "react";

/**
 * Global component to enable "Enter" key navigation across all standard input fields.
 * Place this in the root layout or application wrapper.
 */
export function KeyboardNavigation() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                // Find all focusable inputs on the current page
                const focusableNodes = document.querySelectorAll(
                    "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), button:not([disabled])"
                );
                
                const focusableElements = Array.from(focusableNodes) as HTMLElement[];
                const activeElement = document.activeElement as HTMLElement;
                const activeIndex = focusableElements.indexOf(activeElement);

                // If currently focused element is an input or textarea
                if (activeIndex > -1 && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
                    
                    // Allow multi-line textarea enters using shift+enter 
                    if (activeElement.tagName === "TEXTAREA" && !e.shiftKey) {
                        e.preventDefault();
                    } else if (activeElement.tagName === "TEXTAREA" && e.shiftKey) {
                        return; // proceed normally for new line
                    } else {
                        e.preventDefault();
                    }

                    // Focus next element
                    let nextIndex = activeIndex + 1;

                    // Skip the active warehouse switcher button if it's next, too annoying
                    while (nextIndex < focusableElements.length) {
                        const nextElement = focusableElements[nextIndex];
                        // If the next element is not hidden by offsetParent logic
                        if (nextElement.offsetParent !== null) {
                            nextElement.focus();
                            break;
                        }
                        nextIndex++;
                    }
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return null;
}
