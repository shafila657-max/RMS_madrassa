import React from 'react';

/**
 * Responsive, seamless SVG Wave Section Divider
 * @param {string} fill - Color matching the adjacent section's background
 * @param {boolean} flip - Flips the wave upside down if true
 * @param {string} heightClass - Height scaling classes for mobile/desktop
 */
const WaveDivider = ({
  fill = '#022c22',
  flip = false,
  heightClass = 'h-10 sm:h-16 lg:h-20',
  className = '',
}) => {
  return (
    <div
      className={`w-full overflow-hidden leading-none pointer-events-none select-none ${
        flip ? 'rotate-180' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={`w-full block ${heightClass}`}
      >
        <path
          d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,21.3C1200,21,1320,43,1380,53.3L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,480,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"
          fill={fill}
        />
      </svg>
    </div>
  );
};

export default WaveDivider;
