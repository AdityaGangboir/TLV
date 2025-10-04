import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Play, Pause, RotateCcw, Waves } from 'lucide-react';
import './WavePropagation.css';

const WavePropagation = () => {
  const [inputs, setInputs] = useState({
    R: 2,
    L: 250,
    G: 0.00001,
    C: 100,
    freq: 1,
    length: 1,
    ZL: 75,
    V0: 1,
    speed: 1
  });

  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef(null);

  // Calculate wave parameters
  const omega = 2 * Math.PI * inputs.freq * 1e9;
  
  // Simplified calculations for visualization
  const beta = Math.sqrt(omega * omega * inputs.L * 1e-9 * inputs.C * 1e-12);
  const lambda = (2 * Math.PI) / beta;
  const Zc_real = Math.sqrt(inputs.L / inputs.C * 1e3); // Simplified characteristic impedance
  
  const gammaL = (inputs.ZL - Zc_real) / (inputs.ZL + Zc_real);
  const vswr = Math.abs(gammaL) < 0.9999 ? (1 + Math.abs(gammaL)) / (1 - Math.abs(gammaL)) : 999;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setTime(t => t + 0.02 * inputs.speed);
      }, 16);
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, inputs.speed]);

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setTime(0);
  };

  // Generate wave data
  const generateWaveData = () => {
    const points = 200;
    const voltage = [];
    const current = [];
    const standing = [];
    
    for (let i = 0; i <= points; i++) {
      const z = (i / points) * inputs.length;
      
      // Forward wave
      const forwardV = inputs.V0 * Math.cos(omega * time - beta * z);
      
      // Reflected wave
      const reflectedV = inputs.V0 * gammaL * Math.cos(omega * time + beta * z);
      
      // Total voltage (standing wave)
      const totalV = forwardV + reflectedV;
      
      // Current (90 degrees out of phase)
      const forwardI = (inputs.V0 / Zc_real) * Math.cos(omega * time - beta * z - Math.PI / 2);
      const reflectedI = -(inputs.V0 / Zc_real) * gammaL * Math.cos(omega * time + beta * z - Math.PI / 2);
      const totalI = forwardI + reflectedI;
      
      voltage.push({ x: z, y: totalV });
      current.push({ x: z, y: totalI });
      standing.push({ 
        x: z, 
        yMax: inputs.V0 * (1 + Math.abs(gammaL)),
        yMin: -inputs.V0 * (1 + Math.abs(gammaL))
      });
    }
    
    return { voltage, current, standing };
  };

  const { voltage, current, standing } = generateWaveData();

  // SVG rendering
  const width = 800;
  const height = 300;
  const margin = { top: 40, right: 40, bottom: 40, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x) => margin.left + (x / inputs.length) * plotWidth;
  const scaleY = (y) => margin.top + plotHeight / 2 - (y / (inputs.V0 * 2)) * (plotHeight / 2);

  const voltagePath = voltage.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
  ).join(' ');

  const currentPath = current.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
  ).join(' ');

  return (
    <div className="wave-prop-container">
      <div className="wave-prop-wrapper">
        {/* Header */}
        <div className="wave-prop-header">
          <div className="wave-prop-icon-wrapper">
            <LineChart size={28} />
          </div>
          <div>
            <h1 className="wave-prop-title">Wave Propagation Simulator</h1>
            <p className="wave-prop-subtitle">Simulate and analyze electromagnetic wave propagation along transmission lines</p>
          </div>
        </div>

        <div className="wave-prop-content">
          {/* Control Panel */}
          <div className="wave-prop-controls">
            <div className="control-section">
              <h2 className="control-title">
                <Waves size={20} />
                Transmission Line Parameters
              </h2>
              
              <div className="control-grid">
                <div className="control-item">
                  <label>Resistance R (Ω/m)</label>
                  <input
                    type="number"
                    value={inputs.R}
                    onChange={(e) => handleInputChange('R', e.target.value)}
                    step="0.1"
                  />
                </div>
                
                <div className="control-item">
                  <label>Inductance L (nH/m)</label>
                  <input
                    type="number"
                    value={inputs.L}
                    onChange={(e) => handleInputChange('L', e.target.value)}
                    step="10"
                  />
                </div>
                
                <div className="control-item">
                  <label>Conductance G (S/m)</label>
                  <input
                    type="number"
                    value={inputs.G}
                    onChange={(e) => handleInputChange('G', e.target.value)}
                    step="0.00001"
                  />
                </div>
                
                <div className="control-item">
                  <label>Capacitance C (pF/m)</label>
                  <input
                    type="number"
                    value={inputs.C}
                    onChange={(e) => handleInputChange('C', e.target.value)}
                    step="10"
                  />
                </div>
                
                <div className="control-item">
                  <label>Frequency (GHz)</label>
                  <input
                    type="number"
                    value={inputs.freq}
                    onChange={(e) => handleInputChange('freq', e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                </div>
                
                <div className="control-item">
                  <label>Line Length (m)</label>
                  <input
                    type="number"
                    value={inputs.length}
                    onChange={(e) => handleInputChange('length', e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                </div>
                
                <div className="control-item">
                  <label>Load Impedance (Ω)</label>
                  <input
                    type="number"
                    value={inputs.ZL}
                    onChange={(e) => handleInputChange('ZL', e.target.value)}
                    step="5"
                  />
                </div>
                
                <div className="control-item">
                  <label>Source Voltage (V)</label>
                  <input
                    type="number"
                    value={inputs.V0}
                    onChange={(e) => handleInputChange('V0', e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                </div>
                
                <div className="control-item">
                  <label>Animation Speed</label>
                  <input
                    type="range"
                    value={inputs.speed}
                    onChange={(e) => handleInputChange('speed', e.target.value)}
                    min="0.1"
                    max="3"
                    step="0.1"
                  />
                  <span className="range-value">{inputs.speed.toFixed(1)}x</span>
                </div>
              </div>
            </div>

            {/* Animation Controls */}
            <div className="animation-controls">
              <button className="control-btn play" onClick={togglePlayPause}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="control-btn reset" onClick={resetAnimation}>
                <RotateCcw size={20} />
                Reset
              </button>
            </div>

            {/* Info Cards */}
            <div className="info-cards">
              <div className="info-card orange">
                <div className="info-label">Wavelength</div>
                <div className="info-value">{lambda.toFixed(4)} m</div>
              </div>
              
              <div className="info-card blue">
                <div className="info-label">Reflection Coeff.</div>
                <div className="info-value">{gammaL.toFixed(4)}</div>
              </div>
              
              <div className="info-card green">
                <div className="info-label">VSWR</div>
                <div className="info-value">{vswr < 100 ? vswr.toFixed(2) : '∞'}</div>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="wave-prop-visualization">
            <h2 className="viz-title">Wave Visualization</h2>
            
            {/* Voltage Wave */}
            <div className="chart-container">
              <h3 className="chart-title">Voltage Wave</h3>
              <svg width={width} height={height} className="wave-chart">
                {/* Grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />
                
                {/* Axes */}
                <line 
                  x1={margin.left} 
                  y1={margin.top + plotHeight / 2} 
                  x2={width - margin.right} 
                  y2={margin.top + plotHeight / 2} 
                  stroke="#333" 
                  strokeWidth="2" 
                />
                <line 
                  x1={margin.left} 
                  y1={margin.top} 
                  x2={margin.left} 
                  y2={height - margin.bottom} 
                  stroke="#333" 
                  strokeWidth="2" 
                />
                
                {/* Standing wave envelope */}
                <path
                  d={standing.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.yMax)}`
                  ).join(' ')}
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <path
                  d={standing.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.yMin)}`
                  ).join(' ')}
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                
                {/* Voltage wave */}
                <path d={voltagePath} fill="none" stroke="#ef4444" strokeWidth="3" />
                
                {/* Labels */}
                <text x={margin.left / 2} y={margin.top + plotHeight / 2} textAnchor="middle" fontSize="12" fontWeight="bold">
                  V
                </text>
                <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold">
                  Position (m)
                </text>
                
                {/* Source and Load markers */}
                <circle cx={margin.left} cy={margin.top + plotHeight / 2} r="5" fill="#3b82f6" />
                <text x={margin.left} y={margin.top - 10} textAnchor="middle" fontSize="11" fill="#3b82f6" fontWeight="bold">
                  Source
                </text>
                
                <circle cx={width - margin.right} cy={margin.top + plotHeight / 2} r="5" fill="#10b981" />
                <text x={width - margin.right} y={margin.top - 10} textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="bold">
                  Load
                </text>
              </svg>
            </div>

            {/* Current Wave */}
            <div className="chart-container">
              <h3 className="chart-title">Current Wave</h3>
              <svg width={width} height={height} className="wave-chart">
                <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />
                
                {/* Axes */}
                <line 
                  x1={margin.left} 
                  y1={margin.top + plotHeight / 2} 
                  x2={width - margin.right} 
                  y2={margin.top + plotHeight / 2} 
                  stroke="#333" 
                  strokeWidth="2" 
                />
                <line 
                  x1={margin.left} 
                  y1={margin.top} 
                  x2={margin.left} 
                  y2={height - margin.bottom} 
                  stroke="#333" 
                  strokeWidth="2" 
                />
                
                {/* Current wave */}
                <path d={currentPath} fill="none" stroke="#3b82f6" strokeWidth="3" />
                
                {/* Labels */}
                <text x={margin.left / 2} y={margin.top + plotHeight / 2} textAnchor="middle" fontSize="12" fontWeight="bold">
                  I
                </text>
                <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="12" fontWeight="bold">
                  Position (m)
                </text>
                
                {/* Source and Load markers */}
                <circle cx={margin.left} cy={margin.top + plotHeight / 2} r="5" fill="#3b82f6" />
                <circle cx={width - margin.right} cy={margin.top + plotHeight / 2} r="5" fill="#10b981" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WavePropagation;