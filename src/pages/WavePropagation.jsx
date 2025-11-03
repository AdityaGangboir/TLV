import React, { useState, useEffect, useRef } from "react";
import { LineChart, Play, Pause, RotateCcw, Waves, HelpCircle, Eye, EyeOff, Info, BookOpen } from "lucide-react";
import './WavePropagation.css';

const WavePropagation = () => {
  const [inputs, setInputs] = useState({
    R: 2,
    L: 10,
    G: 0.1,
    C: 1000,
    freq: 1,
    length: 1,
    ZL: 75,
    V0: 1,
    speed: 1,
  });

  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showForward, setShowForward] = useState(true);
  const [showReflected, setShowReflected] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [hoverPoint, setHoverPoint] = useState(null);
  const animationRef = useRef(null);

  // Calculate wave parameters
  const omega = 2 * Math.PI * inputs.freq * 1e9;
  const beta = Math.sqrt(omega * omega * inputs.L * 1e-9 * inputs.C * 1e-12);
  const lambda = (2 * Math.PI) / beta;
  const Zc_real = Math.sqrt((inputs.L / inputs.C) * 1e3);
  
  const gammaL_complex = (inputs.ZL - Zc_real) / (inputs.ZL + Zc_real);
  const gammaMag = Math.abs(gammaL_complex);
  const gammaPhase = (Math.atan2(0, gammaL_complex) * 180) / Math.PI;
  
  const vswr = gammaMag < 0.9999 ? (1 + gammaMag) / (1 - gammaMag) : 999;
  
  const P_incident = (inputs.V0 * inputs.V0) / (2 * Zc_real);
  const P_reflected = P_incident * gammaMag * gammaMag;
  const P_transmitted = P_incident - P_reflected;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setTime((t) => t + 0.02 * inputs.speed);
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
    setInputs((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const togglePlayPause = () => setIsPlaying(!isPlaying);
  const resetAnimation = () => setTime(0);

  const loadPreset = (preset) => {
    const presets = {
      matched: { ...inputs, ZL: Zc_real },
      short: { ...inputs, ZL: 0.01 },
      open: { ...inputs, ZL: 10000 },
      mismatch25: { ...inputs, ZL: 25 },
      mismatch100: { ...inputs, ZL: 100 },
    };
    setInputs(presets[preset]);
  };

  // Generate wave data
  const generateWaveData = () => {
    const points = 200;
    const voltage = [];
    const current = [];
    const forwardV = [];
    const reflectedV = [];
    const standing = [];

    for (let i = 0; i <= points; i++) {
      const z = (i / points) * inputs.length;

      const fwdV = inputs.V0 * Math.cos(omega * time - beta * z);
      const refV = inputs.V0 * gammaMag * Math.cos(omega * time + beta * z + gammaPhase * Math.PI / 180);
      const totalV = fwdV + refV;

      const fwdI = (inputs.V0 / Zc_real) * Math.cos(omega * time - beta * z - Math.PI / 2);
      const refI = -(inputs.V0 / Zc_real) * gammaMag * Math.cos(omega * time + beta * z - Math.PI / 2 + gammaPhase * Math.PI / 180);
      const totalI = fwdI + refI;

      voltage.push({ x: z, y: totalV });
      current.push({ x: z, y: totalI });
      forwardV.push({ x: z, y: fwdV });
      reflectedV.push({ x: z, y: refV });
      standing.push({
        x: z,
        yMax: inputs.V0 * (1 + gammaMag),
        yMin: -inputs.V0 * (1 + gammaMag),
      });
    }

    return { voltage, current, forwardV, reflectedV, standing };
  };

  const { voltage, current, forwardV, reflectedV, standing } = generateWaveData();

  // SVG rendering parameters
  const width = 900;
  const height = 320;
  const margin = { top: 50, right: 50, bottom: 50, left: 70 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x) => margin.left + (x / inputs.length) * plotWidth;
  const scaleY = (y) => margin.top + plotHeight / 2 - (y / (inputs.V0 * 2.5)) * (plotHeight / 2);

  const createPath = (data) =>
    data.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`).join(" ");

  const voltagePath = createPath(voltage);
  const currentPath = createPath(current);
  const forwardPath = createPath(forwardV);
  const reflectedPath = createPath(reflectedV);

  // Handle mouse hover
  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = ((x - margin.left) / plotWidth) * inputs.length;
    
    if (position >= 0 && position <= inputs.length) {
      const idx = Math.round((position / inputs.length) * 200);
      if (idx >= 0 && idx < voltage.length) {
        setHoverPoint({
          position: position,
          voltage: voltage[idx].y,
          current: current[idx].y,
          forward: forwardV[idx].y,
          reflected: reflectedV[idx].y,
          x: scaleX(position),
        });
      }
    }
  };

  const handleMouseLeave = () => setHoverPoint(null);

  return (
    <div className="container">
      <div className="wrapper">
        {/* Header */}
        <div className="header">
          <div className="header-icon-wrapper">
            <LineChart size={28} />
          </div>
          <div>
            <h1 className="header-title">Wave Propagation Simulator</h1>
            <p className="header-subtitle">
              Visualize electromagnetic wave propagation on transmission lines with forward, reflected, and standing waves
            </p>
          </div>
          <button 
            className="help-button"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="help-panel">
            <h3>Quick Guide</h3>
            <p><strong>What you're seeing:</strong> Forward waves travel from source to load. When the load impedance (Z<sub>L</sub>) doesn't match the characteristic impedance (Z<sub>0</sub>), reflected waves bounce back. These combine to form standing waves.</p>
            <p><strong>Key concepts:</strong></p>
            <ul className="help-list">
              <li><strong>VSWR = 1:</strong> Perfect match, no reflections</li>
              <li><strong>VSWR &gt; 1:</strong> Impedance mismatch, energy reflects back</li>
              <li><strong>Nodes:</strong> Points of minimum amplitude (destructive interference)</li>
              <li><strong>Antinodes:</strong> Points of maximum amplitude (constructive interference)</li>
            </ul>
            <p><strong>Try the presets below to see common scenarios!</strong></p>
          </div>
        )}

        <div className="content">
          {/* Controls Section */}
          <div className="controls">
            {/* Presets */}
            <div className="section">
              <h2 className="section-title">
                <BookOpen size={18} />
                Quick Presets
              </h2>
              <div className="preset-grid">
                <button className="preset-btn" onClick={() => loadPreset('matched')}>
                  Matched Load
                </button>
                <button className="preset-btn" onClick={() => loadPreset('short')}>
                  Short Circuit
                </button>
                <button className="preset-btn" onClick={() => loadPreset('open')}>
                  Open Circuit
                </button>
                <button className="preset-btn" onClick={() => loadPreset('mismatch25')}>
                  25Ω Load
                </button>
              </div>
            </div>

            {/* Parameters */}
            <div className="section">
              <h2 className="section-title">
                <Waves size={18} />
                Line Parameters
              </h2>
              <div className="control-grid">
                <div className="control-item">
                  <label className="label">Resistance R (Ω/m)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.R}
                    onChange={(e) => handleInputChange("R", e.target.value)}
                    step="0.1"
                  />
                </div>
                <div className="control-item">
                  <label className="label">Inductance L (nH/m)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.L}
                    onChange={(e) => handleInputChange("L", e.target.value)}
                    step="10"
                  />
                  <span className="si-unit">{(inputs.L * 1e-9).toExponential(2)} H/m</span>
                </div>
                <div className="control-item">
                  <label className="label">Conductance G (S/m)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.G}
                    onChange={(e) => handleInputChange("G", e.target.value)}
                    step="0.00001"
                  />
                </div>
                <div className="control-item">
                  <label className="label">Capacitance C (pF/m)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.C}
                    onChange={(e) => handleInputChange("C", e.target.value)}
                    step="10"
                  />
                  <span className="si-unit">{(inputs.C * 1e-12).toExponential(2)} F/m</span>
                </div>
                <div className="control-item">
                  <label className="label">Frequency (GHz)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.freq}
                    onChange={(e) => handleInputChange("freq", e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                  <span className="si-unit">{(inputs.freq * 1e9).toExponential(2)} Hz</span>
                </div>
                <div className="control-item">
                  <label className="label">Line Length (m)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.length}
                    onChange={(e) => handleInputChange("length", e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                </div>
                <div className="control-item">
                  <label className="label">Load Impedance Z<sub>L</sub> (Ω)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.ZL}
                    onChange={(e) => handleInputChange("ZL", e.target.value)}
                    step="5"
                  />
                </div>
                <div className="control-item">
                  <label className="label">Source Voltage V<sub>0</sub> (V)</label>
                  <input
                    className="input"
                    type="number"
                    value={inputs.V0}
                    onChange={(e) => handleInputChange("V0", e.target.value)}
                    step="0.1"
                    min="0.1"
                  />
                </div>
                <div className="control-item">
                  <label className="label">Animation Speed</label>
                  <input
                    className="range-input"
                    type="range"
                    value={inputs.speed}
                    onChange={(e) => handleInputChange("speed", e.target.value)}
                    min="0.1"
                    max="3"
                    step="0.1"
                  />
                  <span className="range-value">{inputs.speed.toFixed(1)}×</span>
                </div>
              </div>
            </div>

            {/* Animation Controls */}
            <div className="anim-controls">
              <button className="control-btn play-btn" onClick={togglePlayPause}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button className="control-btn reset-btn" onClick={resetAnimation}>
                <RotateCcw size={18} />
                Reset
              </button>
            </div>

            {/* Calculated Values */}
            <div className="section">
              <h2 className="section-title">
                <Info size={18} />
                Calculated Values
              </h2>
              <div className="info-grid">
                <div className="info-card" style={{ borderTopColor: '#f97316' }}>
                  <div className="info-label">Wavelength λ</div>
                  <div className="info-value">{lambda.toFixed(4)} m</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#3b82f6' }}>
                  <div className="info-label">Phase Constant β</div>
                  <div className="info-value">{beta.toFixed(2)} rad/m</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#10b981' }}>
                  <div className="info-label">Char. Impedance Z₀</div>
                  <div className="info-value">{Zc_real.toFixed(2)} Ω</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#f59e0b' }}>
                  <div className="info-label">Reflection |Γ|</div>
                  <div className="info-value">{gammaMag.toFixed(4)}</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#8b5cf6' }}>
                  <div className="info-label">Γ Phase</div>
                  <div className="info-value">{gammaPhase.toFixed(1)}°</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#ec4899' }}>
                  <div className="info-label">VSWR</div>
                  <div className="info-value">{vswr < 100 ? vswr.toFixed(2) : "∞"}</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#06b6d4' }}>
                  <div className="info-label">Incident Power</div>
                  <div className="info-value">{P_incident.toFixed(4)} W</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#ef4444' }}>
                  <div className="info-label">Reflected Power</div>
                  <div className="info-value">{P_reflected.toFixed(4)} W</div>
                </div>
                <div className="info-card" style={{ borderTopColor: '#22c55e' }}>
                  <div className="info-label">Transmitted Power</div>
                  <div className="info-value">{P_transmitted.toFixed(4)} W</div>
                </div>
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="section">
              <h2 className="section-title">Display Options</h2>
              <div className="toggle-grid">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showForward}
                    onChange={(e) => setShowForward(e.target.checked)}
                    className="checkbox"
                  />
                  Forward Wave
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showReflected}
                    onChange={(e) => setShowReflected(e.target.checked)}
                    className="checkbox"
                  />
                  Reflected Wave
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showEnvelope}
                    onChange={(e) => setShowEnvelope(e.target.checked)}
                    className="checkbox"
                  />
                  Standing Wave Envelope
                </label>
              </div>
            </div>

            {/* Math Panel Toggle */}
            <button 
              className="math-toggle"
              onClick={() => setShowMath(!showMath)}
            >
              {showMath ? 'Hide' : 'Show'} Equations
            </button>
          </div>

          {/* Visualization Section */}
          <div className="visualization">
            {showMath && (
              <div className="math-panel">
                <h3 className="math-title">Key Equations</h3>
                <div className="equation">
                  <strong>Forward Wave:</strong> V<sub>fwd</sub>(z,t) = V₀ cos(ωt - βz)
                </div>
                <div className="equation">
                  <strong>Reflection Coefficient:</strong> Γ = (Z<sub>L</sub> - Z₀) / (Z<sub>L</sub> + Z₀)
                </div>
                <div className="equation">
                  <strong>VSWR:</strong> VSWR = (1 + |Γ|) / (1 - |Γ|)
                </div>
                <div className="equation">
                  <strong>Phase Constant:</strong> β = ω√(LC)
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="legend">
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: '#ef4444' }}></div>
                <span>Total Voltage</span>
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: '#3b82f6' }}></div>
                <span>Total Current</span>
              </div>
              {showForward && (
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#10b981', opacity: 0.6 }}></div>
                  <span>Forward Wave</span>
                </div>
              )}
              {showReflected && (
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#f59e0b', opacity: 0.6 }}></div>
                  <span>Reflected Wave</span>
                </div>
              )}
              {showEnvelope && (
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#fca5a5', borderStyle: 'dashed' }}></div>
                  <span>Envelope</span>
                </div>
              )}
            </div>

            {/* Voltage Chart */}
            <div className="chart-container">
              <h3 className="chart-title">Voltage Wave</h3>
              <svg 
                width={width} 
                height={height} 
                className="chart"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />
                
                {/* Axes */}
                <line x1={margin.left} y1={margin.top + plotHeight / 2} x2={width - margin.right} y2={margin.top + plotHeight / 2} stroke="#333" strokeWidth="2" />
                <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#333" strokeWidth="2" />
                
                {/* X-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const x = scaleX(frac * inputs.length);
                  const lambdaFrac = (frac * inputs.length) / lambda;
                  return (
                    <g key={`x-${frac}`}>
                      <line x1={x} y1={margin.top + plotHeight / 2 - 5} x2={x} y2={margin.top + plotHeight / 2 + 5} stroke="#333" strokeWidth="2" />
                      <text x={x} y={height - margin.bottom + 20} textAnchor="middle" fontSize="11" fill="#666">
                        {lambdaFrac.toFixed(2)}λ
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis ticks and labels */}
                {[-2, -1, 0, 1, 2].map((val) => {
                  const scaledVal = val * inputs.V0;
                  const y = scaleY(scaledVal);
                  return (
                    <g key={`y-${val}`}>
                      <line x1={margin.left - 5} y1={y} x2={margin.left + 5} y2={y} stroke="#333" strokeWidth="2" />
                      <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
                        {scaledVal.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Envelope */}
                {showEnvelope && (
                  <>
                    <path d={createPath(standing.map(p => ({x: p.x, y: p.yMax})))} fill="none" stroke="#fca5a5" strokeWidth="2" strokeDasharray="4,4" />
                    <path d={createPath(standing.map(p => ({x: p.x, y: p.yMin})))} fill="none" stroke="#fca5a5" strokeWidth="2" strokeDasharray="4,4" />
                  </>
                )}
                
                {/* Forward and Reflected */}
                {showForward && <path d={forwardPath} fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />}
                {showReflected && <path d={reflectedPath} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.6" />}
                
                {/* Total Voltage */}
                <path d={voltagePath} fill="none" stroke="#ef4444" strokeWidth="3" />
                
                {/* Hover indicator */}
                {hoverPoint && (
                  <>
                    <line x1={hoverPoint.x} y1={margin.top} x2={hoverPoint.x} y2={height - margin.bottom} stroke="#666" strokeWidth="1" strokeDasharray="2,2" />
                    <circle cx={hoverPoint.x} cy={scaleY(hoverPoint.voltage)} r="4" fill="#ef4444" />
                  </>
                )}
                
                {/* Labels */}
                <text x={margin.left / 2} y={margin.top + plotHeight / 2} textAnchor="middle" fontSize="14" fontWeight="bold">V (V)</text>
                <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="14" fontWeight="bold">Position (m)</text>
                
                {/* Source and Load */}
                <circle cx={margin.left} cy={margin.top + plotHeight / 2} r="6" fill="#3b82f6" />
                <text x={margin.left} y={margin.top - 15} textAnchor="middle" fontSize="12" fill="#3b82f6" fontWeight="bold">Source</text>
                
                <circle cx={width - margin.right} cy={margin.top + plotHeight / 2} r="6" fill="#10b981" />
                <text x={width - margin.right} y={margin.top - 15} textAnchor="middle" fontSize="12" fill="#10b981" fontWeight="bold">Load</text>
              </svg>
              
              {/* Hover Tooltip */}
              {hoverPoint && (
                <div className="tooltip" style={{ left: `${(hoverPoint.x / width) * 100}%` }}>
                  <div><strong>Position:</strong> {hoverPoint.position.toFixed(3)} m</div>
                  <div><strong>Voltage:</strong> {hoverPoint.voltage.toFixed(3)} V</div>
                  {showForward && <div><strong>Forward:</strong> {hoverPoint.forward.toFixed(3)} V</div>}
                  {showReflected && <div><strong>Reflected:</strong> {hoverPoint.reflected.toFixed(3)} V</div>}
                </div>
              )}
            </div>

            {/* Current Chart */}
            <div className="chart-container">
              <h3 className="chart-title">Current Wave (90° phase shift from voltage)</h3>
              <svg width={width} height={height} className="chart">
                <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />
                
                <line x1={margin.left} y1={margin.top + plotHeight / 2} x2={width - margin.right} y2={margin.top + plotHeight / 2} stroke="#333" strokeWidth="2" />
                <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#333" strokeWidth="2" />
                
                {/* X-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const x = scaleX(frac * inputs.length);
                  const lambdaFrac = (frac * inputs.length) / lambda;
                  return (
                    <g key={`current-x-${frac}`}>
                      <line x1={x} y1={margin.top + plotHeight / 2 - 5} x2={x} y2={margin.top + plotHeight / 2 + 5} stroke="#333" strokeWidth="2" />
                      <text x={x} y={height - margin.bottom + 20} textAnchor="middle" fontSize="11" fill="#666">
                        {lambdaFrac.toFixed(2)}λ
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis ticks and labels for current */}
                {[-2, -1, 0, 1, 2].map((val) => {
                  const scaledVal = (val * inputs.V0) / Zc_real;
                  const y = scaleY(val * inputs.V0);
                  return (
                    <g key={`current-y-${val}`}>
                      <line x1={margin.left - 5} y1={y} x2={margin.left + 5} y2={y} stroke="#333" strokeWidth="2" />
                      <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
                        {scaledVal.toFixed(3)}
                      </text>
                    </g>
                  );
                })}
                
                <path d={currentPath} fill="none" stroke="#3b82f6" strokeWidth="3" />
                
                <text x={margin.left / 2} y={margin.top + plotHeight / 2} textAnchor="middle" fontSize="14" fontWeight="bold">I (A)</text>
                <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="14" fontWeight="bold">Position (m)</text>
                
                <circle cx={margin.left} cy={margin.top + plotHeight / 2} r="6" fill="#3b82f6" />
                <circle cx={width - margin.right} cy={margin.top + plotHeight / 2} r="6" fill="#10b981" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WavePropagation;