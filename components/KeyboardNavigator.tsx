"use client";

import { useEffect } from "react";

export function KeyboardNavigator() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                const target = e.target as HTMLElement;
                const nodeName = target.nodeName.toLowerCase();

                // Allow textarea to use Enter for newlines
                if (nodeName === "textarea") return;

                // Ignore if modifier keys are pressed
                if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

                // Allow buttons to be clicked with Enter
                if (nodeName === "button" || target.getAttribute("type") === "submit") return;

                // Prevent default form submission or other default Enter behaviors
                e.preventDefault();

                // Get only form-related focusable elements to avoid accidentally clicking links or sign-out buttons
                const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(
                    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
                )).filter(el => {
                    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
                });

                if (focusableElements.length === 0) return;

                const currentIndex = focusableElements.indexOf(target);
                
                if (currentIndex > -1) {
                    let nextIndex = currentIndex + 1;
                    if (nextIndex >= focusableElements.length) {
                        nextIndex = 0; // Wrap around
                    }
                    focusableElements[nextIndex].focus();
                } else {
                    focusableElements[0].focus();
                }
            }
        };

        // Use capturing phase so we can intercept before other elements might stop propagation
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, []);

    return null;
}
