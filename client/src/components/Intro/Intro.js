import React, { useState, useEffect, useRef } from 'react';
import { isMobileOrTablet } from '../../utils';
import { Button } from '../Buttons';
import './Intro.scss';

const INTRO_STEPS = [
  {
    id: 'header',
    title: 'Navigation Header',
    description: 'Access your playlists, queue, and navigate through the app from here.',
    position: 'top-center',
    highlightSelector: '.header',
  },
  {
    id: 'left-panel',
    title: 'Playlists Panel',
    description: 'Click the left toggle to open your playlists. Organize your tracks into custom collections.',
    position: 'left',
    highlightSelector: '.container__content__left',
    fallbackSelector: '.panel-toggle--left',
  },
  {
    id: 'beat-list',
    title: 'All Tracks',
    description: 'Your complete music library. Search, filter, and play tracks. Click tracks to play them.',
    position: 'center',
    highlightSelector: '.container__content__middle',
  },
  {
    id: 'add-beat',
    title: 'Add New Track',
    description: 'Upload new tracks to your library. Drag and drop files or click to browse.',
    position: 'bottom-right',
    highlightSelector: '.icon-button--addbeat',
  },
  {
    id: 'right-panel',
    title: 'Queue & History',
    description: 'Click the right toggle to open your queue and history. Manage what plays next.',
    position: 'right',
    highlightSelector: '.container__content__right',
    fallbackSelector: '.panel-toggle--right',
  },
  {
    id: 'audio-player',
    title: 'Audio Player',
    description: 'Control playback, adjust volume, shuffle, repeat, and view waveforms here.',
    position: 'bottom-center',
    highlightSelector: '.audio-player--desktop',
  },
];

const Intro = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState({});
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);

  const updateHighlight = React.useCallback(() => {
    const step = INTRO_STEPS[currentStep];
    if (!step) return;

    let element = document.querySelector(step.highlightSelector);
    
    if (!element && step.fallbackSelector) {
      element = document.querySelector(step.fallbackSelector);
    }
    
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0 && step.fallbackSelector) {
      const fallbackElement = document.querySelector(step.fallbackSelector);
      if (fallbackElement) {
        const fallbackRect = fallbackElement.getBoundingClientRect();
        setHighlightStyle({
          top: `${fallbackRect.top}px`,
          left: `${fallbackRect.left}px`,
          width: `${fallbackRect.width}px`,
          height: `${fallbackRect.height}px`,
        });
        return;
      }
    }

    setHighlightStyle({
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }, [currentStep]);

  useEffect(() => {
    if (!isVisible || currentStep >= INTRO_STEPS.length) return;

    const step = INTRO_STEPS[currentStep];
    if (!step) return;

    const tryUpdateHighlight = () => {
      const element = document.querySelector(step.highlightSelector);
      if (element) {
        updateHighlight();
      } else {
        setTimeout(tryUpdateHighlight, 100);
      }
    };

    tryUpdateHighlight();
  }, [currentStep, isVisible, updateHighlight]);

  useEffect(() => {
    if (isMobileOrTablet()) {
      return;
    }

    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    if (!hasSeenIntro) {
      setTimeout(() => {
        setIsVisible(true);
      }, 800);
    }
  }, []);

  useEffect(() => {
    if (!isVisible || currentStep >= INTRO_STEPS.length) return;

    const handleResize = () => {
      updateHighlight();
    };
    
    window.addEventListener('resize', handleResize);
    const interval = setInterval(updateHighlight, 200);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [currentStep, isVisible, updateHighlight]);

  const handleNext = () => {
    if (currentStep < INTRO_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenIntro', 'true');
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || isMobileOrTablet() || currentStep >= INTRO_STEPS.length) {
    return null;
  }

  const step = INTRO_STEPS[currentStep];
  const isLastStep = currentStep === INTRO_STEPS.length - 1;

  return (
    <div className="intro">
      <div className="intro__overlay" ref={overlayRef} />
      <div
        className="intro__highlight"
        style={highlightStyle}
      />
      <div
        ref={tooltipRef}
        className={`intro__tooltip intro__tooltip--${step.position}`}
      >
        <div className="intro__tooltip-content">
          <div className="intro__tooltip-header">
            <h3 className="intro__tooltip-title">{step.title}</h3>
            <span className="intro__tooltip-step">
              {currentStep + 1} / {INTRO_STEPS.length}
            </span>
          </div>
          <p className="intro__tooltip-description">{step.description}</p>
          <div className="intro__tooltip-actions">
            <Button
              onClick={handleSkip}
              className="intro__button intro__button--skip"
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              className="intro__button intro__button--next"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;

