import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  status: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, status }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {status === 'CONNECTED' ? (
        <>
          {/* Animated bars */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 bg-amber-500 rounded-full transition-all duration-150 ease-in-out ${
                isActive ? 'animate-pulse' : 'h-2 opacity-50'
              }`}
              style={{
                height: isActive ? `${Math.random() * 24 + 16}px` : '4px',
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </>
      ) : (
        <div className="text-stone-400 text-sm font-medium">
            {status === 'CONNECTING' ? 'Connecting...' : 'Ready to Start'}
        </div>
      )}
    </div>
  );
};

export default Visualizer;
