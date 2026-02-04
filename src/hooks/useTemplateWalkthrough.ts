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
  const actionCompletedRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    waitingForActionRef.current = null;
    actionCompletedRef.current = false;
  }, []);

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
      }
      /* Make overlay and helper layer click-through for interactive steps */
      .introjs-interactive-mode .introjs-helperLayer,
      .introjs-interactive-mode .introjs-overlay,
      .introjs-interactive-mode .introjs-tooltipReferenceLayer {
        pointer-events: none !important;
      }
      .introjs-interactive-mode .introjs-tooltip {
        pointer-events: auto !important;
      }
      /* Highlight the interactive element */
      .introjs-interactive-element {
        position: relative !important;
        z-index: 10000002 !important;
        pointer-events: auto !important;
      }
      /* Also make editor view interactive for drag-drop - only when drag-drop mode is active */
      .introjs-drag-drop-mode [data-walkthrough="editor-view"] {
        pointer-events: auto !important;
        z-index: 10000001 !important;
      }
      /* Ensure popovers, sheets, dialogs appear ABOVE the walkthrough overlay */
      .introjs-interactive-mode [data-radix-popper-content-wrapper],
      .introjs-interactive-mode [role="dialog"],
      .introjs-interactive-mode [data-state="open"][data-side],
      .introjs-interactive-mode .fixed[data-state="open"] {
        z-index: 10000003 !important;
        pointer-events: auto !important;
      }
      /* Sheet/Drawer content - ensure it's above walkthrough */
      .introjs-interactive-mode [data-vaul-drawer],
      .introjs-interactive-mode [data-radix-dialog-content],
      .introjs-interactive-mode [data-radix-popover-content] {
        z-index: 10000003 !important;
        pointer-events: auto !important;
      }
      /* Sheet overlay should also be interactive */
      .introjs-interactive-mode [data-radix-dialog-overlay],
      .introjs-interactive-mode [data-vaul-overlay] {
        z-index: 10000002 !important;
        pointer-events: auto !important;
      }
      /* Section Library specific - ensure the sheet content is fully interactive */
      .introjs-interactive-mode [data-walkthrough="section-library-content"] {
        z-index: 10000003 !important;
        pointer-events: auto !important;
      }
      /* Variable editor popover */
      .introjs-interactive-mode [data-walkthrough="variable-input"] {
        z-index: 10000003 !important;
        pointer-events: auto !important;
      }
      /* Disabled next button styling */
      .introjs-tooltipbuttons .introjs-nextbutton.waiting-for-action {
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        cursor: not-allowed;
        opacity: 0.6;
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

    // Helper to enable interactive mode
    const enableInteractiveMode = (selector: string | string[]) => {
      document.body.classList.add('introjs-interactive-mode');
      const selectors = Array.isArray(selector) ? selector : [selector];
      selectors.forEach(sel => {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => el.classList.add('introjs-interactive-element'));
      });
    };

    // Helper to disable interactive mode
    const disableInteractiveMode = () => {
      document.body.classList.remove('introjs-interactive-mode');
      document.body.classList.remove('introjs-drag-drop-mode');
      document.querySelectorAll('.introjs-interactive-element').forEach(el => {
        el.classList.remove('introjs-interactive-element');
      });
    };

    // Helper to disable Next button
    const disableNextButton = () => {
      const nextBtn = document.querySelector('.introjs-nextbutton') as HTMLButtonElement;
      if (nextBtn) {
        nextBtn.classList.add('waiting-for-action');
        nextBtn.disabled = true;
      }
    };

    // Helper to enable Next button
    const enableNextButton = () => {
      const nextBtn = document.querySelector('.introjs-nextbutton') as HTMLButtonElement;
      if (nextBtn) {
        nextBtn.classList.remove('waiting-for-action');
        nextBtn.disabled = false;
      }
    };

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
        // Step 1 (index 0): Section Library Button intro
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
        // Step 2 (index 1): Editor View
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
        // Step 3 (index 2): Preview View
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
        // Step 4 (index 3): Click Section Library Button - WAIT for click
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
        },
        // Step 5 (index 4): Library opened - show content, WAIT for drag-drop
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
                ⏳ Drag a section to the editor...
              </p>
            </div>
          `,
          position: 'right',
        },
        // Step 6 (index 5): Highlight dropped section - NEXT enabled
        {
          element: '[data-walkthrough="editor-section"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">🎯 Your Section</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Great! Your section is now in the editor. Each section has control buttons.
                Click <strong>Next</strong> to continue.
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 7 (index 6): Point to Edit Variable button - WAIT for click
        {
          element: '[data-walkthrough="edit-variable-btn"]',
          intro: `
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">⚙️ Edit Variable</h3>
              <p style="margin: 0; color: hsl(var(--muted-foreground));">
                Click this <strong>Edit Variable</strong> button to customize the section content.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: hsl(var(--primary)); font-weight: 500;">
                ⏳ Click the button to open the editor...
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 8 (index 7): Variable input - WAIT for typing
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
                ⏳ Type something in the text box...
              </p>
            </div>
          `,
          position: 'left',
        },
        // Step 9 (index 8): Preview updated content
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
        // Step 10 (index 9): Go back to text, ask to select text - WAIT for selection
        {
          element: '[data-walkthrough="variable-input"]',
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
        },
        // Step 11 (index 10): Toolbar appeared - highlight it
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
            </div>
          `,
          position: 'bottom',
        },
        // Step 12 (index 11): Save Button
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

    // Handle after each step renders
    intro.onafterchange(function(targetElement) {
      const currentStep = intro.currentStep() ?? 0;
      cleanup();
      disableInteractiveMode();
      enableNextButton();

      // Step 4 (index 3): Wait for library button click
      if (currentStep === 3) {
        enableInteractiveMode('[data-walkthrough="section-library-btn"]');
        disableNextButton();
        waitingForActionRef.current = 'library-click';
        
        checkIntervalRef.current = setInterval(() => {
          const libraryContent = document.querySelector('[data-walkthrough="section-library-content"]');
          if (libraryContent) {
            cleanup();
            enableNextButton();
            // Auto-advance after library opens
            setTimeout(() => intro.nextStep(), 300);
          }
        }, 200);
      }
      
      // Step 5 (index 4): Library is open, wait for drag-drop
      else if (currentStep === 4) {
        enableInteractiveMode(['[data-walkthrough="section-library-content"]', '[data-walkthrough="editor-view"]']);
        // Add drag-drop mode class to enable editor-view interactivity
        document.body.classList.add('introjs-drag-drop-mode');
        disableNextButton();
        waitingForActionRef.current = 'drag-drop';
        
        const initialCount = document.querySelectorAll('[data-walkthrough="editor-section"]').length;
        checkIntervalRef.current = setInterval(() => {
          const currentCount = document.querySelectorAll('[data-walkthrough="editor-section"]').length;
          if (currentCount > initialCount) {
            cleanup();
            document.body.classList.remove('introjs-drag-drop-mode');
            enableNextButton();
            // Auto-advance after drop
            setTimeout(() => intro.nextStep(), 500);
          }
        }, 200);
      }
      
      // Step 7 (index 6): Wait for Edit Variable button click
      else if (currentStep === 6) {
        enableInteractiveMode('[data-walkthrough="edit-variable-btn"]');
        disableNextButton();
        waitingForActionRef.current = 'edit-variable-click';
        
        checkIntervalRef.current = setInterval(() => {
          const variableInput = document.querySelector('[data-walkthrough="variable-input"]');
          if (variableInput) {
            cleanup();
            enableNextButton();
            // Auto-advance after popover opens
            setTimeout(() => intro.nextStep(), 300);
          }
        }, 200);
      }
      
      // Step 8 (index 7): Wait for user to type in text box
      else if (currentStep === 7) {
        enableInteractiveMode('[data-walkthrough="variable-input"]');
        disableNextButton();
        waitingForActionRef.current = 'type-content';
        
        const variableInput = document.querySelector('[data-walkthrough="variable-input"]') as HTMLElement;
        if (variableInput) {
          const initialContent = variableInput.innerHTML || variableInput.textContent || '';
          
          checkIntervalRef.current = setInterval(() => {
            const currentContent = variableInput.innerHTML || variableInput.textContent || '';
            if (currentContent !== initialContent && currentContent.length > 0) {
              cleanup();
              enableNextButton();
            }
          }, 200);
        }
      }
      
      // Step 10 (index 9): Wait for text selection / toolbar to appear
      else if (currentStep === 9) {
        enableInteractiveMode('[data-walkthrough="variable-input"]');
        disableNextButton();
        waitingForActionRef.current = 'text-selection';
        
        checkIntervalRef.current = setInterval(() => {
          const toolbar = document.querySelector('[data-walkthrough="text-toolbar"]');
          if (toolbar) {
            cleanup();
            enableNextButton();
            // Auto-advance to show toolbar
            setTimeout(() => intro.nextStep(), 300);
          }
        }, 200);
      }
    });

    intro.onexit(() => {
      cleanup();
      disableInteractiveMode();
      setIsWalkthroughActive(false);
      const customStyle = document.getElementById('intro-custom-styles');
      if (customStyle) customStyle.remove();
      options?.onExit?.();
    });

    intro.oncomplete(() => {
      cleanup();
      disableInteractiveMode();
      setIsWalkthroughActive(false);
      const customStyle = document.getElementById('intro-custom-styles');
      if (customStyle) customStyle.remove();
      options?.onComplete?.();
    });

    intro.start();
  }, [options, cleanup]);

  // Stop walkthrough
  const stopWalkthrough = useCallback(() => {
    cleanup();
    document.body.classList.remove('introjs-interactive-mode');
    document.body.classList.remove('introjs-drag-drop-mode');
    document.querySelectorAll('.introjs-interactive-element').forEach(el => {
      el.classList.remove('introjs-interactive-element');
    });
    
    if (introRef.current) {
      introRef.current.exit();
      introRef.current = null;
    }
    setIsWalkthroughActive(false);
    const customStyle = document.getElementById('intro-custom-styles');
    if (customStyle) customStyle.remove();
  }, [cleanup]);

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
