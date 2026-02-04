import { useEffect, useRef, useCallback, useState } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';

interface WalkthroughOptions {
  onComplete?: () => void;
  onExit?: () => void;
}

export const useTemplateWalkthrough = (options?: WalkthroughOptions) => {
  const introRef = useRef<ReturnType<typeof introJs> | null>(null);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const waitingForActionRef = useRef<string | null>(null);
  const eventListenersRef = useRef<{ element: Element; event: string; handler: EventListener }[]>([]);

  // Cleanup function
  const cleanupEventListeners = useCallback(() => {
    eventListenersRef.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    eventListenersRef.current = [];
  }, []);

  // Add event listener with tracking
  const addTrackedListener = useCallback((element: Element, event: string, handler: EventListener) => {
    element.addEventListener(event, handler);
    eventListenersRef.current.push({ element, event, handler });
  }, []);

  // Wait for user action helper
  const waitForAction = useCallback((
    selector: string,
    eventType: string,
    callback: () => void,
    timeout = 60000
  ) => {
    return new Promise<void>((resolve, reject) => {
      const element = document.querySelector(selector);
      if (!element) {
        reject(new Error(`Element not found: ${selector}`));
        return;
      }

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanupEventListeners();
          reject(new Error('Timeout waiting for user action'));
        }
      }, timeout);

      const handler = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          callback();
          resolve();
        }
      };

      addTrackedListener(element, eventType, handler);
    });
  }, [addTrackedListener, cleanupEventListeners]);

  // Start walkthrough
  const startWalkthrough = useCallback(() => {
    const intro = introJs();
    introRef.current = intro;
    setIsWalkthroughActive(true);

    // Custom CSS for intro.js
    const style = document.createElement('style');
    style.id = 'intro-custom-styles';
    style.textContent = `
      .introjs-tooltip {
        max-width: 400px;
        font-family: inherit;
      }
      .introjs-tooltiptext {
        font-size: 14px;
        line-height: 1.6;
      }
      .introjs-button {
        text-shadow: none;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 6px;
      }
      .introjs-prevbutton {
        background: hsl(var(--muted));
        color: hsl(var(--foreground));
        border: 1px solid hsl(var(--border));
      }
      .introjs-nextbutton, .introjs-donebutton {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
      }
      .introjs-skipbutton {
        color: hsl(var(--muted-foreground));
      }
      .introjs-helperLayer {
        box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 0px 5000px, rgba(52, 152, 219, 0.8) 0px 0px 0px 4px !important;
        pointer-events: none !important;
      }
      .introjs-tooltipReferenceLayer {
        pointer-events: none !important;
      }
      .introjs-fixedTooltip {
        pointer-events: auto !important;
      }
      .introjs-tooltip {
        pointer-events: auto !important;
      }
      [data-walkthrough] {
        pointer-events: auto !important;
        position: relative;
        z-index: 10000001 !important;
      }
      .introjs-showElement {
        pointer-events: auto !important;
        z-index: 10000001 !important;
      }
      .introjs-waiting {
        pointer-events: auto !important;
      }
      .introjs-tooltipbuttons .introjs-nextbutton.waiting-for-action {
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        cursor: not-allowed;
      }
      .intro-pulse-highlight {
        animation: intro-pulse 1.5s infinite;
      }
      @keyframes intro-pulse {
        0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(52, 152, 219, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
      }
    `;
    document.head.appendChild(style);

    intro.setOptions({
      showProgress: true,
      showBullets: true,
      exitOnOverlayClick: false,
      exitOnEsc: true,
      scrollToElement: true,
      scrollPadding: 100,
      disableInteraction: false,
      doneLabel: 'Finish',
      nextLabel: 'Next →',
      prevLabel: '← Back',
      skipLabel: 'Skip Tour',
      steps: [
        // Step 1: Section Library Button
        {
          element: '[data-walkthrough="section-library-btn"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">📚 Section Library</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                This is your toolbox! Click here to access all available sections like 
                <strong>Headings</strong>, <strong>Text</strong>, <strong>Paragraphs</strong>, 
                <strong>Bullet Lists</strong>, <strong>Group Names</strong>, and more.
              </p>
            </div>
          `,
          position: 'right',
        },
        // Step 2: Editor View
        {
          element: '[data-walkthrough="editor-view"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">✏️ Editor View</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                This is where all your template sections appear. You can customize content, 
                styling, and arrangement to match your exact requirements.
              </p>
            </div>
          `,
          position: 'right',
        },
        // Step 3: Preview View
        {
          element: '[data-walkthrough="preview-view"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">👁️ Preview View</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Live preview your template content in real-time. 
                <strong>What You See Is What You Get!</strong> 
                Changes made in the editor appear here instantly.
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 4: Click Section Library Button (waiting step)
        {
          element: '[data-walkthrough="section-library-btn"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">👆 Open Section Library</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Now click the <strong>Section Library</strong> button to open it.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Waiting for you to click the button...
              </p>
            </div>
          `,
          position: 'bottom',
          disableInteraction: false,
        },
        // Step 5: Sections in Library (after library opens)
        {
          element: '[data-walkthrough="section-library-content"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🧩 Available Sections</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Here are all the section types you can add to your template. 
                <strong>Drag any section</strong> from here and drop it into the Editor View on the right.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Try dragging a section to the editor...
              </p>
            </div>
          `,
          position: 'right',
          disableInteraction: false,
        },
        // Step 6: Highlight section in Editor
        {
          element: '[data-walkthrough="editor-section"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🎯 Section Controls</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Each section has control buttons. Click the <strong>first icon button</strong> 
                (Edit Variable) to customize the section content.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Click on the Edit Variable button...
              </p>
            </div>
          `,
          position: 'left',
          disableInteraction: false,
        },
        // Step 7: Text input highlight
        {
          element: '[data-walkthrough="variable-input"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">📝 Edit Content</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Type or update the text content here. Your changes will be reflected 
                immediately in the preview.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Enter or update some text...
              </p>
            </div>
          `,
          position: 'left',
          disableInteraction: false,
        },
        // Step 8: Preview updated content
        {
          element: '[data-walkthrough="preview-view"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">✨ See Your Changes</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Notice how your changes appear instantly in the preview! 
                This real-time feedback helps you design templates quickly.
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 9: Text Selection
        {
          element: '[data-walkthrough="editor-section"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🖌️ Text Styling</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                <strong>Select a portion of text</strong> in the content area to see 
                the formatting toolbar appear.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Select some text to see the toolbar...
              </p>
            </div>
          `,
          position: 'left',
          disableInteraction: false,
        },
        // Step 10: Formatting Toolbar
        {
          element: '[data-walkthrough="text-toolbar"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🎨 Formatting Toolbar</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                This toolbar appears when you select text. Use it to apply:
                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: hsl(var(--muted-foreground));">
                  <li><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u></li>
                  <li>Text colors and background colors</li>
                  <li>Font sizes</li>
                </ul>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Click any formatting option...
              </p>
            </div>
          `,
          position: 'bottom',
          disableInteraction: false,
        },
        // Step 11: Preview styled content
        {
          element: '[data-walkthrough="preview-view"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🎉 Styled Content</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Your styled content is now visible in the preview. 
                All formatting is preserved and will appear in the final template.
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 12: Save Button
        {
          element: '[data-walkthrough="save-btn"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">💾 Save Your Work</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Don't forget to save your template! Click this button to save 
                all your changes. Make sure you've entered a template name first.
              </p>
              <p style="margin: 12px 0 0 0; padding: 8px; background: hsl(var(--muted)); border-radius: 6px; font-size: 13px;">
                🎊 <strong>Congratulations!</strong> You've completed the walkthrough. 
                You're now ready to create amazing templates!
              </p>
            </div>
          `,
          position: 'left',
        },
      ],
    });

    // Track current step manually
    let currentStepIndex = 0;

    // Handle step changes for waiting behavior
    intro.onbeforechange(async function(targetElement) {
      // Step 4: Wait for Section Library click
      if (currentStepIndex === 3) {
        waitingForActionRef.current = 'library-click';
        
        // Make the button clickable
        const btn = document.querySelector('[data-walkthrough="section-library-btn"]');
        if (btn) {
          btn.classList.add('introjs-waiting');
        }
        
        // Wait for the sheet to open
        return new Promise<boolean>((resolve) => {
          const checkLibraryOpen = setInterval(() => {
            const libraryContent = document.querySelector('[data-walkthrough="section-library-content"]');
            if (libraryContent) {
              clearInterval(checkLibraryOpen);
              waitingForActionRef.current = null;
              setTimeout(() => resolve(true), 500);
            }
          }, 200);
          
          // Timeout after 60 seconds
          setTimeout(() => {
            clearInterval(checkLibraryOpen);
            resolve(true);
          }, 60000);
        });
      }
      
      // Step 5: Wait for drag and drop
      if (currentStepIndex === 4) {
        waitingForActionRef.current = 'drag-drop';
        
        return new Promise<boolean>((resolve) => {
          const initialSectionCount = document.querySelectorAll('[data-walkthrough="editor-section"]').length;
          
          const checkNewSection = setInterval(() => {
            const currentSectionCount = document.querySelectorAll('[data-walkthrough="editor-section"]').length;
            if (currentSectionCount > initialSectionCount) {
              clearInterval(checkNewSection);
              waitingForActionRef.current = null;
              setTimeout(() => resolve(true), 500);
            }
          }, 200);
          
          // Allow manual progression after 5 seconds
          setTimeout(() => {
            clearInterval(checkNewSection);
            resolve(true);
          }, 60000);
        });
      }
      
      // Increment step counter after successful navigation
      currentStepIndex++;
      return true;
    });

    intro.onafterchange(() => {
      // Track current step for logic
    });

    intro.onexit(() => {
      setIsWalkthroughActive(false);
      cleanupEventListeners();
      const customStyle = document.getElementById('intro-custom-styles');
      if (customStyle) customStyle.remove();
      options?.onExit?.();
    });

    intro.oncomplete(() => {
      setIsWalkthroughActive(false);
      cleanupEventListeners();
      const customStyle = document.getElementById('intro-custom-styles');
      if (customStyle) customStyle.remove();
      options?.onComplete?.();
    });

    intro.start();
  }, [options, cleanupEventListeners]);

  // Stop walkthrough
  const stopWalkthrough = useCallback(() => {
    if (introRef.current) {
      introRef.current.exit();
      introRef.current = null;
    }
    setIsWalkthroughActive(false);
    cleanupEventListeners();
    const customStyle = document.getElementById('intro-custom-styles');
    if (customStyle) customStyle.remove();
  }, [cleanupEventListeners]);

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (introRef.current) {
      introRef.current.goToStep(step);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWalkthrough();
    };
  }, [stopWalkthrough]);

  return {
    startWalkthrough,
    stopWalkthrough,
    goToStep,
    isWalkthroughActive,
  };
};
