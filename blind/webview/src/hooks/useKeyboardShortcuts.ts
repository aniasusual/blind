import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useKeyboardShortcuts = () => {
  const {
    togglePlayback,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
    events,
    currentEventIndex,
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Check for modifier keys (to avoid conflicts with VS Code shortcuts)
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          // Space: Play/Pause
          if (!hasModifier) {
            event.preventDefault();
            togglePlayback();
          }
          break;

        case 'n':
          // N: Next event
          if (!hasModifier && currentEventIndex < events.length - 1) {
            event.preventDefault();
            stepForward();
          }
          break;

        case 'p':
          // P: Previous event
          if (!hasModifier && currentEventIndex > -1) {
            event.preventDefault();
            stepBackward();
          }
          break;

        case 'home':
          // Home: Go to start
          if (!hasModifier) {
            event.preventDefault();
            goToStart();
          }
          break;

        case 'end':
          // End: Go to end
          if (!hasModifier && events.length > 0) {
            event.preventDefault();
            goToEnd();
          }
          break;

        case 'arrowright':
          // Right Arrow: Step forward (alternative to N)
          if (!hasModifier && currentEventIndex < events.length - 1) {
            event.preventDefault();
            stepForward();
          }
          break;

        case 'arrowleft':
          // Left Arrow: Step backward (alternative to P)
          if (!hasModifier && currentEventIndex > -1) {
            event.preventDefault();
            stepBackward();
          }
          break;

        default:
          // No action for other keys
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayback, stepForward, stepBackward, goToStart, goToEnd, events, currentEventIndex]);
};
