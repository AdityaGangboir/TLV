import React, { useState, useMemo } from 'react';
import { Zap } from 'lucide-react';
import './SmithChart.css';

// Complex number utilities
class Complex {
  constructor(real, imag = 0) {
    this.re = real;
    this.im = imag;
  }
  
  add(z) { return new Complex(this.re + z.re, this.im + z.im); }
  sub(z) { return new Complex(this.re - z.re, this.im - z.im); }
  mul(z) {
    return new Complex(
      this.re * z.re - this.im * z.im,
      this.re * z.im + this.im * z.re
    );
  }
  div(z) {
    const denom = z.re * z.re + z.im * z.im;
    return new Complex(
      (this.re * z.re + this.im * z.im) / denom,
      (this.im * z.re - this.re * z.im) / denom
    );
  }
  conj() { return new Complex(this.re, -this.im); }
  mag() { return Math.sqrt(this.re * this.re + this.im * this.im); }
  phase() { return Math.atan2(this.im, this.re); }
  scale(k) { return new Complex(this.re * k, this.im * k); }
}

const SmithChartTool = () => {
  const [inputs, setInputs] = useState({
    R: 75,
    L: 250,
    G: 0.0001,
    C: 100,
    freq: 1,
    length: 0.08,
    Z0: 50
  });

  // Calculate all transmission line parameters
  const results = useMemo(() => {
    const { R, L, G, C, freq, length, Z0 } = inputs;
    const omega = 2 * Math.PI * freq * 1e9;
    
    const Z_series = new Complex(R, omega * L * 1e-9);
    const Y_shunt = new Complex(G, omega * C * 1e-12);
    
    const ZY = Z_series.mul(Y_shunt);
    const gamma_mag = Math.sqrt(ZY.mag());
    const gamma_phase = ZY.phase() / 2;
    const gamma = new Complex(
      gamma_mag * Math.cos(gamma_phase),
      gamma_mag * Math.sin(gamma_phase)
    );
    
    const Z_div_Y = Z_series.div(Y_shunt);
    const Zc_mag = Math.sqrt(Z_div_Y.mag());
    const Zc_phase = Z_div_Y.phase() / 2;
    const Zc = new Complex(
      Zc_mag * Math.cos(Zc_phase),
      Zc_mag * Math.sin(Zc_phase)
    );
    
    const ZL = new Complex(Z0 * 1.5, Z0 * 0.5);
    
    const gl = gamma.scale(length);
    const sinh_gl = new Complex(
      Math.sinh(gl.re) * Math.cos(gl.im),
      Math.cosh(gl.re) * Math.sin(gl.im)
    );
    const cosh_gl = new Complex(
      Math.cosh(gl.re) * Math.cos(gl.im),
      Math.sinh(gl.re) * Math.sin(gl.im)
    );
    const tanh_gl = sinh_gl.div(cosh_gl);
    
    const num = ZL.add(Zc.mul(tanh_gl));
    const den = Zc.add(ZL.mul(tanh_gl));
    const Zin = Zc.mul(num.div(den));
    
    const Gamma = Zin.sub(new Complex(Z0, 0)).div(Zin.add(new Complex(Z0, 0)));
    const GammaL = ZL.sub(new Complex(Z0, 0)).div(ZL.add(new Complex(Z0, 0)));
    
    const Gamma_mag = Gamma.mag();
    const VSWR = Gamma_mag < 0.9999 ? (1 + Gamma_mag) / (1 - Gamma_mag) : 999;
    
    const Yin = new Complex(1, 0).div(Zin);
    const YL = new Complex(1, 0).div(ZL);
    const QFactor = Math.abs(Zin.im) / Zin.re;
    
    const returnLoss = -20 * Math.log10(Gamma_mag);
    
    return { Zc, Zin, ZL, Yin, YL, Gamma, GammaL, VSWR, gamma, QFactor, returnLoss };
  }, [inputs]);

  const zToSmith = (z, Z0) => {
    const zn = new Complex(z.re / Z0, z.im / Z0);
    const denom = (1 + zn.re) * (1 + zn.re) + zn.im * zn.im;
    return {
      x: ((zn.re * zn.re + zn.im * zn.im - 1) / denom) * 200 + 400,
      y: (-2 * zn.im / denom) * 200 + 300
    };
  };

  const generateDetailedGrid = () => {
    const elements = [];
    
    // Constant resistance circles - main ones only
    const rValues = [0, 0.2, 0.5, 1, 2, 5];
    rValues.forEach((r) => {
      if (r === 0) {
        elements.push(
          <circle key="r-0" cx={200} cy={300} r={200} fill="none" stroke="#333" strokeWidth="1.5" />
        );
      } else {
        const cx = 200 + 200 * r / (1 + r);
        const radius = 200 / (1 + r);
        elements.push(
          <circle
            key={`r-${r}`}
            cx={cx}
            cy={300}
            r={radius}
            fill="none"
            stroke="#333"
            strokeWidth="1.5"
          />
        );
        
        elements.push(
          <text key={`r-label-${r}`} x={cx + radius - 8} y={305} fontSize="10" fill="#000" fontWeight="bold">
            {r}
          </text>
        );
      }
    });
    
    // Constant reactance arcs - main ones only
    const xValues = [-5, -2, -1, -0.5, -0.2, 0.2, 0.5, 1, 2, 5];
    xValues.forEach((x) => {
      const cy = 300 - 200 / x;
      const radius = 200 / Math.abs(x);
      const startX = 200;
      
      elements.push(
        <path
          key={`x-${x}`}
          d={describeSmithArc(startX, cy, radius, x > 0)}
          fill="none"
          stroke="#333"
          strokeWidth="1.5"
        />
      );
      
      if (Math.abs(x) <= 5) {
        const labelAngle = x > 0 ? -25 : 25;
        const labelRad = labelAngle * Math.PI / 180;
        const labelX = startX + radius * Math.cos(labelRad);
        const labelY = cy + radius * Math.sin(labelRad);
        
        elements.push(
          <text
            key={`x-label-${x}`}
            x={labelX}
            y={labelY}
            fontSize="10"
            fill="#000"
            textAnchor="middle"
            fontWeight="bold"
          >
            {x > 0 ? `+j${x}` : `-j${Math.abs(x)}`}
          </text>
        );
      }
    });
    
    return elements;
  };

  const describeSmithArc = (startX, cy, radius, isPositive) => {
    const endX = startX;
    const startY = cy - (isPositive ? radius : -radius);
    const endY = cy + (isPositive ? radius : -radius);
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 ${isPositive ? 1 : 0} ${endX} ${endY}`;
  };

  const generateRadialLines = () => {
    const elements = [];
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    
    angles.forEach(angle => {
      const rad = (angle - 90) * Math.PI / 180;
      const x = 400 + 200 * Math.cos(rad);
      const y = 300 + 200 * Math.sin(rad);
      
      elements.push(
        <line
          key={`angle-${angle}`}
          x1={400}
          y1={300}
          x2={x}
          y2={y}
          stroke="#ddd"
          strokeWidth="0.5"
        />
      );
      
      const labelX = 400 + 220 * Math.cos(rad);
      const labelY = 300 + 220 * Math.sin(rad);
      
      elements.push(
        <text
          key={`angle-label-${angle}`}
          x={labelX}
          y={labelY}
          fontSize="10"
          fill="#666"
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight="bold"
        >
          {angle}°
        </text>
      );
    });
    
    return elements;
  };

  const zinPoint = zToSmith(results.Zin, inputs.Z0);
  const zlPoint = zToSmith(results.ZL, inputs.Z0);

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  return (
    <div className="container">
      <div className="wrapper">
        <div className="header">
          <div className="icon-wrapper">
            <Zap size={24} />
          </div>
          <h1 className="title">
            SMITH CHART TOOL - Impedance/Admittance Chart
          </h1>
        </div>

        <div className="content">
          {/* Left Panel - Inputs */}
          <div className="panel-left">
            <h2 className="panel-title">INPUT PARAMETERS</h2>
            
            {[
              { label: 'Resistance R (Ω/m)', field: 'R', step: 0.1 },
              { label: 'Inductance L (nH/m)', field: 'L', step: 1 },
              { label: 'Conductance G (S/m)', field: 'G', step: 0.00001 },
              { label: 'Capacitance C (pF/m)', field: 'C', step: 1 },
              { label: 'Frequency (GHz)', field: 'freq', step: 0.1 },
              { label: 'Line Length (m)', field: 'length', step: 0.001 },
              { label: 'Reference Z₀ (Ω)', field: 'Z0', step: 1 }
            ].map(({ label, field, step }) => (
              <div key={field} className="input-group">
                <label>{label}</label>
                <input
                  type="number"
                  value={inputs[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  step={step}
                />
              </div>
            ))}
          </div>

          {/* Center Panel - Smith Chart */}
          <div className="chart-wrapper">
            <svg viewBox="0 0 800 750" className="chart-svg">
              {/* Main Chart Circle */}
              <circle cx="400" cy="300" r="200" fill="none" stroke="#000" strokeWidth="2"/>
              
              {/* Grid */}
              {generateDetailedGrid()}
              
              {/* Radial angle lines */}
              {generateRadialLines()}
              
              {/* Center point */}
              <circle cx="400" cy="300" r="2" fill="#000"/>
              
              {/* Main horizontal axis */}
              <line x1="200" y1="300" x2="600" y2="300" stroke="#000" strokeWidth="2"/>
              
              {/* Scale markers on horizontal axis */}
              {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(val => {
                const x = 200 + val * 400;
                return (
                  <g key={`scale-${val}`}>
                    <line x1={x} y1={295} x2={x} y2={305} stroke="#000" strokeWidth="1"/>
                    <text x={x} y={320} fontSize="8" fill="#000" textAnchor="middle">{val.toFixed(1)}</text>
                  </g>
                );
              })}
              
              {/* Reflection coefficient circles */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map(rho => (
                <circle
                  key={`rho-${rho}`}
                  cx="400"
                  cy="300"
                  r={rho * 200}
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
              ))}
              
              {/* Plot points and path */}
              <circle cx={zlPoint.x} cy={zlPoint.y} r="5" fill="#e74c3c"/>
              <circle cx={zlPoint.x} cy={zlPoint.y} r="8" fill="none" stroke="#e74c3c" strokeWidth="2"/>
              <text x={zlPoint.x + 15} y={zlPoint.y - 10} fill="#e74c3c" fontSize="11" fontWeight="bold">ZL</text>
              
              <circle cx={zinPoint.x} cy={zinPoint.y} r="5" fill="#2ecc71"/>
              <circle cx={zinPoint.x} cy={zinPoint.y} r="8" fill="none" stroke="#2ecc71" strokeWidth="2"/>
              <text x={zinPoint.x + 15} y={zinPoint.y - 10} fill="#2ecc71" fontSize="11" fontWeight="bold">Zin</text>
              
              <line x1={zlPoint.x} y1={zlPoint.y} x2={zinPoint.x} y2={zinPoint.y} stroke="#9b59b6" strokeWidth="3" strokeDasharray="6,3"/>
              
              {/* Outer labels */}
              <text x="605" y="305" fontSize="12" fill="#000" fontWeight="bold">∞</text>
              <text x="190" y="305" fontSize="12" fill="#000" fontWeight="bold" textAnchor="end">0</text>
              
              {/* Title */}
              <text x="400" y="30" fontSize="14" fill="#000" fontWeight="bold" textAnchor="middle">
                SMITH CHART - IMPEDANCE OR ADMITTANCE COORDINATES
              </text>
              
              {/* Bottom Scale Section */}
              <g transform="translate(0, 520)">
                {/* Reflection Coefficient Scale */}
                <text x="50" y="10" fontSize="9" fill="#000" fontWeight="bold">REFLECTION COEFFICIENT |Γ|</text>
                <line x1="200" y1="20" x2="600" y2="20" stroke="#000" strokeWidth="1"/>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(val => {
                  const x = 200 + val * 400;
                  return (
                    <g key={`refl-${val}`}>
                      <line x1={x} y1={15} x2={x} y2={25} stroke="#000" strokeWidth="1"/>
                      <text x={x} y="35" fontSize="8" fill="#000" textAnchor="middle">{val.toFixed(1)}</text>
                    </g>
                  );
                })}
                
                {/* VSWR Scale */}
                <text x="50" y="60" fontSize="9" fill="#000" fontWeight="bold">VSWR</text>
                <line x1="200" y1="70" x2="600" y2="70" stroke="#000" strokeWidth="1"/>
                {[1, 1.5, 2, 3, 4, 5, 7, 10, 20, 50].map((val) => {
                  const rho = (val - 1) / (val + 1);
                  const x = 200 + rho * 400;
                  return (
                    <g key={`vswr-${val}`}>
                      <line x1={x} y1={65} x2={x} y2={75} stroke="#000" strokeWidth="1"/>
                      <text x={x} y="85" fontSize="8" fill="#000" textAnchor="middle">{val}</text>
                    </g>
                  );
                })}
                
                {/* Return Loss Scale */}
                <text x="50" y="110" fontSize="9" fill="#000" fontWeight="bold">RETURN LOSS (dB)</text>
                <line x1="200" y1="120" x2="600" y2="120" stroke="#000" strokeWidth="1"/>
                {[0, 3, 6, 10, 14, 20, 26, 34, 46].map((val) => {
                  const rho = Math.pow(10, -val/20);
                  const x = 200 + rho * 400;
                  return (
                    <g key={`rl-${val}`}>
                      <line x1={x} y1={115} x2={x} y2={125} stroke="#000" strokeWidth="1"/>
                      <text x={x} y="135" fontSize="8" fill="#000" textAnchor="middle">{val}</text>
                    </g>
                  );
                })}
                
                {/* Transmission Coefficient Scale */}
                <text x="50" y="160" fontSize="9" fill="#000" fontWeight="bold">TRANS COEFF |T|</text>
                <line x1="200" y1="170" x2="600" y2="170" stroke="#000" strokeWidth="1"/>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(val => {
                  const t = 1 - val;
                  const x = 200 + val * 400;
                  return (
                    <g key={`trans-${val}`}>
                      <line x1={x} y1={165} x2={x} y2={175} stroke="#000" strokeWidth="1"/>
                      <text x={x} y="185" fontSize="8" fill="#000" textAnchor="middle">{t.toFixed(1)}</text>
                    </g>
                  );
                })}
              </g>
              
              {/* Current values indicator */}
              <g transform="translate(0, 520)">
                <line 
                  x1={200 + results.Gamma.mag() * 400} 
                  y1="10" 
                  x2={200 + results.Gamma.mag() * 400} 
                  y2="195" 
                  stroke="#e74c3c" 
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              </g>
            </svg>
          </div>

          {/* Right Panel - Outputs */}
          <div className="panel-right">
            <h2 className="panel-title">CALCULATED OUTPUTS</h2>

            <div className="output-card blue">
              <div className="output-label">
                Input Impedance (Zin)
              </div>
              <div className="output-value">
                {results.Zin.re.toFixed(2)} {results.Zin.im >= 0 ? '+' : ''} j{results.Zin.im.toFixed(2)} Ω
              </div>
              <div className="output-meta">
                |Z| = {results.Zin.mag().toFixed(2)} Ω, ∠{(results.Zin.phase() * 180 / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="output-card red">
              <div className="output-label">
                Load Impedance (ZL)
              </div>
              <div className="output-value">
                {results.ZL.re.toFixed(2)} {results.ZL.im >= 0 ? '+' : ''} j{results.ZL.im.toFixed(2)} Ω
              </div>
              <div className="output-meta">
                |Z| = {results.ZL.mag().toFixed(2)} Ω, ∠{(results.ZL.phase() * 180 / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="output-card orange">
              <div className="output-label">
                Reflection Coefficient (Γ)
              </div>
              <div className="output-value">
                {results.Gamma.re.toFixed(4)} {results.Gamma.im >= 0 ? '+' : ''} j{results.Gamma.im.toFixed(4)}
              </div>
              <div className="output-meta">
                |Γ| = {results.Gamma.mag().toFixed(4)}, ∠{(results.Gamma.phase() * 180 / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="output-card darkorange">
              <div className="output-label">
                VSWR
              </div>
              <div className="output-value large">
                {results.VSWR < 100 ? results.VSWR.toFixed(3) : '∞'}
              </div>
            </div>

            <div className="output-card teal">
              <div className="output-label">
                Return Loss
              </div>
              <div className="output-value medium">
                {results.returnLoss.toFixed(2)} dB
              </div>
            </div>

            <div className="output-card purple">
              <div className="output-label">
                Q-Factor
              </div>
              <div className="output-value medium">
                {results.QFactor.toFixed(3)}
              </div>
            </div>

            <div className="output-card dark">
              <div className="output-label">
                Char. Impedance (Zc)
              </div>
              <div className="output-value small">
                {results.Zc.re.toFixed(2)} {results.Zc.im >= 0 ? '+ j' : '- j'}{Math.abs(results.Zc.im).toFixed(2)} Ω
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmithChartTool;