import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { ExportPanel } from './ExportPanel';
import './Timeline.css';

export const Timeline = () => {
  const {
    events,
    currentEventIndex,
    isPlaying,
    playbackSpeed,
    setCurrentEventIndex,
    togglePlayback,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
  } = useStore();

  const totalEvents = events.length;
  const progressPercentage = totalEvents > 0
    ? ((currentEventIndex + 1) / totalEvents) * 100
    : 0;

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || currentEventIndex >= totalEvents - 1) {
      return;
    }

    const interval = setInterval(() => {
      stepForward();
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentEventIndex, totalEvents, playbackSpeed, stepForward]);

  // Stop playing when reaching the end
  useEffect(() => {
    if (isPlaying && currentEventIndex >= totalEvents - 1) {
      togglePlayback();
    }
  }, [currentEventIndex, totalEvents, isPlaying, togglePlayback]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setCurrentEventIndex(newIndex);
  }, [setCurrentEventIndex]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, [setPlaybackSpeed]);

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  if (totalEvents === 0) {
    return null;
  }

  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        {/* Navigation Controls */}
        <button
          className="timeline-btn"
          onClick={goToStart}
          title="Go to start"
          disabled={currentEventIndex <= -1}
        >
          |◄
        </button>
        <button
          className="timeline-btn"
          onClick={stepBackward}
          title="Step backward"
          disabled={currentEventIndex <= -1}
        >
          ◄
        </button>
        <button
          className="timeline-btn timeline-play-btn"
          onClick={togglePlayback}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❙❙' : '▶'}
        </button>
        <button
          className="timeline-btn"
          onClick={stepForward}
          title="Step forward"
          disabled={currentEventIndex >= totalEvents - 1}
        >
          ►
        </button>
        <button
          className="timeline-btn"
          onClick={goToEnd}
          title="Go to end"
          disabled={currentEventIndex >= totalEvents - 1}
        >
          ►|
        </button>

        {/* Event Counter */}
        <div className="timeline-counter">
          Event <span className="counter-current">{currentEventIndex + 1}</span> / {totalEvents}
        </div>

        {/* Speed Control */}
        <div className="timeline-speed">
          <span className="speed-label">Speed:</span>
          {[0.5, 1, 2, 4].map((speed) => (
            <button
              key={speed}
              className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Export Panel */}
        <ExportPanel />

        {/* Current Event Info */}
        {currentEvent && (
          <div className="timeline-event-info">
            <span className="event-type">{currentEvent.event_type}</span>
            <span className="event-separator">•</span>
            <span className="event-function">{currentEvent.function_name}()</span>
            <span className="event-separator">•</span>
            <span className="event-file">{currentEvent.file_path.split('/').pop()}</span>
            <span className="event-separator">•</span>
            <span className="event-line">Line {currentEvent.line_number}</span>
          </div>
        )}
      </div>

      {/* Progress Slider */}
      <div className="timeline-slider-container">
        <input
          type="range"
          className="timeline-slider"
          min="-1"
          max={totalEvents - 1}
          value={currentEventIndex}
          onChange={handleSliderChange}
          style={{
            background: `linear-gradient(to right, var(--vscode-button-background) 0%, var(--vscode-button-background) ${progressPercentage}%, var(--vscode-input-background) ${progressPercentage}%, var(--vscode-input-background) 100%)`
          }}
        />
        <div className="timeline-ticks">
          {Array.from({ length: Math.min(10, totalEvents) }).map((_, i) => {
            const tickIndex = Math.floor((i / 9) * (totalEvents - 1));
            return (
              <div
                key={i}
                className="timeline-tick"
                style={{ left: `${(tickIndex / (totalEvents - 1)) * 100}%` }}
              >
                <div className="tick-mark" />
                <div className="tick-label">{tickIndex + 1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};