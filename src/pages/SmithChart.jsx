import React, { useState, useMemo, useEffect } from "react";
import { Zap, TrendingUp, Radio } from "lucide-react";
import "./SmithChart.css";

const Radius = 300;
/* Complex number utilities */
class Complex {
  constructor(real, imag = 0) {
    this.re = real;
    this.im = imag;
  }
  add(z) {
    return new Complex(this.re + z.re, this.im + z.im);
  }
  sub(z) {
    return new Complex(this.re - z.re, this.im - z.im);
  }
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
  conj() {
    return new Complex(this.re, -this.im);
  }
  mag() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }
  phase() {
    return Math.atan2(this.im, this.re);
  }
  scale(k) {
    return new Complex(this.re * k, this.im * k);
  }
  static fromPolar(mag, phase) {
    return new Complex(mag * Math.cos(phase), mag * Math.sin(phase));
  }
}

const SmithChartTool = () => {
  const [inputs, setInputs] = useState({
    R: 75,
    L: 250,
    G: 0.0001,
    C: 100,
    freq: 1,
    length: 0.08,
    Z0: 50,
    ZL_real: 75,
    ZL_imag: 25,
  });

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timer);
  }, [inputs]);

  const results = useMemo(() => {
    const { R, L, G, C, freq, length, Z0, ZL_real, ZL_imag } = inputs;
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

    const ZL = new Complex(ZL_real, ZL_imag);

    // Calculate reflection coefficient at load
    const GammaL = ZL.sub(new Complex(Z0, 0)).div(ZL.add(new Complex(Z0, 0)));
    
    // Calculate wavelength and electrical length
    const beta = Math.abs(gamma.im); // Phase constant (rad/m)
    const wavelength = beta !== 0 ? (2 * Math.PI) / beta : 0;
    const electricalLength = wavelength !== 0 ? (length / wavelength) : 0;
    const electricalLengthDegrees = electricalLength * 360;
    
    // Rotate reflection coefficient toward generator
    // Γ(d) = ΓL × e^(-j2βd) - moving toward generator rotates CLOCKWISE
    const rotationAngle = -2 * beta * length; // Negative for clockwise rotation
    const rotationFactor = Complex.fromPolar(1, rotationAngle);
    const Gamma = GammaL.mul(rotationFactor);
    
    // Calculate Zin from Gamma using inverse transformation
    // Z = Z0 * (1 + Γ) / (1 - Γ)
    const oneMinusGamma = new Complex(1, 0).sub(Gamma);
    const onePlusGamma = new Complex(1, 0).add(Gamma);
    const Zin = onePlusGamma.div(oneMinusGamma).scale(Z0);

    const Gamma_mag = Gamma.mag();
    const GammaL_mag = GammaL.mag();
    const VSWR = Gamma_mag < 0.9999 ? (1 + Gamma_mag) / (1 - Gamma_mag) : 999;

    const Yin = new Complex(1, 0).div(Zin);
    const YL = new Complex(1, 0).div(ZL);
    const QFactor = Math.abs(Zin.im) / Math.max(Zin.re, 0.001);

    const returnLoss = -20 * Math.log10(Gamma_mag);
    const transCoeff = 1 - Gamma_mag;

    return {
      Zc,
      Zin,
      ZL,
      Yin,
      YL,
      Gamma,
      GammaL,
      VSWR,
      gamma,
      QFactor,
      returnLoss,
      transCoeff,
      wavelength,
      electricalLength,
      electricalLengthDegrees,
      beta,
    };
  }, [inputs]);

  const gammaToSmith = (gamma) => {
    return {
      x: gamma.re * 300 + 400,
      y: -gamma.im * 300 + 300,
    };
  };

  const zToSmith = (z, Z0) => {
    const zn = new Complex(z.re / Z0, z.im / Z0);
    const gamma = zn.sub(new Complex(1, 0)).div(zn.add(new Complex(1, 0)));
    return {
      x: gamma.re * 300 + 400,
      y: -gamma.im * 300 + 300,
      gamma: gamma,
      zn: zn
    };
  };

  const describeSmithArc = (startX, cy, radius, isPositive) => {
    const endX = startX;
    const startY = cy - (isPositive ? radius : -radius);
    const endY = cy + (isPositive ? radius : -radius);
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 ${
      isPositive ? 1 : 0
    } ${endX} ${endY}`;
  };

  const generateDetailedGrid = () => {
    const elements = [];
    
    // Normalized resistance circles (r = constant)
    // const rValues = [0, 0.2, 0.5, 1, 2, 5];
    const rValues=[1000, 5,2,1,0.5,0.2,0];
    let offset = 0;
    rValues.forEach((r) => {
      if (r === 0) {
        elements.push(
          <circle
            key="r-0"
            className="grid-circle"
            cx={400}
            cy={300}
            r={300}
            fill="none"
          />
        );
      } else {
        const cx = 400 + (300 * r) / (1 + r);
        const radius = 300 / (1 + r);
        elements.push(
          <circle
            key={`r-${r}`}
            className="grid-circle"
            cx={cx}
            cy={300}
            r={radius}
            fill="none"
          />
        );
        elements.push(
          <text
            key={`r-label-${r}`}
            x={cx + radius - 5 - offset}
            y={292}
            className="grid-text resistance"
            textAnchor="middle"
          >
            {r}
          </text>
        );
      }

      offset += 100;
    });

    // Normalized reactance arcs (x = constant)
    const xValues = [-5, -2, -1, -0.5, -0.2, 0.2, 0.5, 1, 2, 5];
    xValues.forEach((x) => {
      const cy = 300 - 300 /(-x);
      const radius = 300 / (-Math.abs(x));
      const startX = 700;
      
      elements.push(
        <path
          key={`x-${x}`}
          d={describeSmithArc(startX, cy, radius, x > 0)}
          className="grid-arc"
          fill="none"
        />
      );

      if (Math.abs(x) <= 5) {
        const labelX = x > 0 ? 420-Math.ceil(cy/1.5) + 480 : Math.ceil(cy/1.5) + 500;
        const labelY = x > 0 ? 390 : 220;
        elements.push(
          <text
            key={`x-label-${x}`}
            x={labelX}
            y={labelY}
            className="grid-text reactance"
            textAnchor="start"
          >
            {x < 0 ? `x=+${-x}j` : `x=${-x}j`}
          </text>
        );
      }
    });

    return elements;
  };

  const generateAngleMarkings = () => {
    const elements = [];
    const centerX = 400,
      centerY = 300,
      radius = 300;
    
    const wavelengthPoints = [
      { angle: 0, label: "90" },
      { angle: 30, label: "60" },
      { angle: 60, label: "30" },
      { angle: 90, label: "0" },
      { angle: 120, label: "-30" },
      { angle: 150, label: "-60" },
      { angle: 180, label: "-90" },
      { angle: 210, label: "-120" },
      { angle: 240, label: "-150" },
      { angle: 270, label: "180" },
      { angle: 300, label: "150" },
      { angle: 330, label: "120" },
    ];

    wavelengthPoints.forEach(({ angle, label }) => {
      const rad = ((angle - 90) * Math.PI) / 180;
      const x1 = centerX + radius * Math.cos(rad);
      const y1 = centerY + radius * Math.sin(rad);
      const x2 = centerX + (radius + 10) * Math.cos(rad);
      const y2 = centerY + (radius + 10) * Math.sin(rad);
      const xText = centerX + (radius + 28) * Math.cos(rad);
      const yText = centerY + (radius + 28) * Math.sin(rad);

      elements.push(
        <line
          key={`tick-${angle}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="angle-tick"
        />
      );
      elements.push(
        <text
          key={`angle-${angle}`}
          x={xText}
          y={yText}
          className="angle-text"
          textAnchor="middle"
        >
          {label}
        </text>
      );
    });
    
    return elements;
  };

  const zlPoint = gammaToSmith(results.GammaL);
  const zinPoint = gammaToSmith(results.Gamma);
  
  // SWR circle radius - SAME for both ZL and Zin
  const swrCircleRadius = results.GammaL.mag() * 300;
  
  // Calculate arc path from ZL to Zin along SWR circle
  const zlAngle = Math.atan2(-(zlPoint.y - 300), zlPoint.x - 400);
  const zinAngle = Math.atan2(-(zinPoint.y - 300), zinPoint.x - 400);
  let arcSweep = zinAngle - zlAngle;
  
  // Normalize angle difference
  while (arcSweep > Math.PI) arcSweep -= 2 * Math.PI;
  while (arcSweep < -Math.PI) arcSweep += 2 * Math.PI;
  
  const largeArcFlag = Math.abs(arcSweep) > Math.PI ? 1 : 0;
  const sweepFlag = arcSweep > 0 ? 1 : 0;

  // Convert to normalized impedance for display
  const zlNorm = zToSmith(results.ZL, inputs.Z0);
  const zinNorm = zToSmith(results.Zin, inputs.Z0);

  const generateScales = () => {
    const elements = [];
    const baseY = 650,
      startX = 400,
      endX = 100;

    // Reflection Coefficient Scale
    elements.push(
      <text key="refl-label" x={100} y={baseY} className="scale-label">
        REFLECTION COEFFICIENT |Γ|
      </text>
    );
    elements.push(
      <line
        key="refl-baseline"
        x1={startX}
        y1={baseY + 15}
        x2={endX}
        y2={baseY + 15}
        className="scale-baseline"
      />
    );

    const reflValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    reflValues.forEach((val) => {
      const x = startX + (endX - startX) * val;
      elements.push(
        <line
          key={`refl-tick-${val}`}
          x1={x}
          y1={baseY + 10}
          x2={x}
          y2={baseY + 20}
          className="scale-tick"
        />
      );
      elements.push(
        <text
          key={`refl-val-${val}`}
          x={x}
          y={baseY + 32}
          className="scale-value"
          textAnchor="middle"
        >
          {val.toFixed(1)}
        </text>
      );
    });

    const gammaMag = results.Gamma.mag();
    const gammaX = startX + (endX - startX) * gammaMag;
    
    // Connection from Zin to reflection coefficient scale
    elements.push(
      <line
        key="gamma-connection"
        x1={gammaX}
        y1={300}
        x2={gammaX}
        y2={baseY + 15}
        className="conn-line gamma"
      />
    );
    elements.push(
      <circle
        key="gamma-marker"
        cx={gammaX}
        cy={baseY + 15}
        r="4"
        className="marker-gamma"
      />
    );

    // VSWR Scale
    const vswrY = baseY + 50;
    elements.push(
      <text key="vswr-label" x={100} y={vswrY} className="scale-label">
        VSWR
      </text>
    );
    elements.push(
      <line
        key="vswr-baseline"
        x1={startX}
        y1={vswrY + 15}
        x2={endX}
        y2={vswrY + 15}
        className="scale-baseline"
      />
    );

    const vswrValues = [1, 1.5, 2, 3, 5, 10, 20];
    vswrValues.forEach((val) => {
      const gamma = (val - 1) / (val + 1);
      const x = startX + (endX - startX) * gamma;
      elements.push(
        <line
          key={`vswr-tick-${val}`}
          x1={x}
          y1={vswrY + 10}
          x2={x}
          y2={vswrY + 20}
          className="scale-tick"
        />
      );
      elements.push(
        <text
          key={`vswr-val-${val}`}
          x={x}
          y={vswrY + 32}
          className="scale-value"
          textAnchor="middle"
        >
          {val}
        </text>
      );
    });

    const vswrGamma = (results.VSWR - 1) / (results.VSWR + 1);
    const vswrX = startX + (endX - startX) * vswrGamma;
    if (results.VSWR < 100) {
      elements.push(
        <line
          key="vswr-connection"
          x1={gammaX}
          y1={baseY + 15}
          x2={vswrX}
          y2={vswrY + 15}
          className="conn-line vswr"
        />
      );
      elements.push(
        <circle
          key="vswr-marker"
          cx={vswrX}
          cy={vswrY + 15}
          r="4"
          className="marker-vswr"
        />
      );
    }

    // Return Loss Scale
    const rlY = baseY + 100;
    elements.push(
      <text key="rl-label" x={100} y={rlY} className="scale-label">
        RETURN LOSS (dB)
      </text>
    );
    elements.push(
      <line
        key="rl-baseline"
        x1={startX}
        y1={rlY + 15}
        x2={endX}
        y2={rlY + 15}
        className="scale-baseline"
      />
    );

    const rlValues = [0, 3, 6, 10, 14, 20, 26, 40];
    rlValues.forEach((val) => {
      const gamma = Math.pow(10, -val / 20);
      const x = startX + (endX - startX) * gamma;
      if (x >= endX && x <= startX) {
        elements.push(
          <line
            key={`rl-tick-${val}`}
            x1={x}
            y1={rlY + 10}
            x2={x}
            y2={rlY + 20}
            className="scale-tick"
          />
        );
        elements.push(
          <text
            key={`rl-val-${val}`}
            x={x}
            y={rlY + 32}
            className="scale-value"
            textAnchor="middle"
          >
            {val}
          </text>
        );
      }
    });

    const rlGamma = Math.pow(10, -results.returnLoss / 20);
    const rlX = startX + (endX - startX) * rlGamma;
    if (rlX <= startX && rlX >= endX) {
      elements.push(
        <line
          key="rl-connection"
          x1={vswrX}
          y1={vswrY + 15}
          x2={rlX}
          y2={rlY + 15}
          className="conn-line rl"
        />
      );
      elements.push(
        <circle
          key="rl-marker"
          cx={rlX}
          cy={rlY + 15}
          r="4"
          className="marker-rl"
        />
      );
    }

    // Transmission Coefficient Scale
    const tcY = baseY + 150;
    elements.push(
      <text key="tc-label" x={100} y={tcY} className="scale-label">
        TRANS COEFF |T|
      </text>
    );
    elements.push(
      <line
        key="tc-baseline"
        x1={startX}
        y1={tcY + 15}
        x2={endX}
        y2={tcY + 15}
        className="scale-baseline"
      />
    );
    const tcValues = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
    tcValues.forEach((val) => {
      const gamma = 1 - val;
      const x = startX + (endX - startX) * gamma;
      elements.push(
        <line
          key={`tc-tick-${val}`}
          x1={x}
          y1={tcY + 10}
          x2={x}
          y2={tcY + 20}
          className="scale-tick"
        />
      );
      elements.push(
        <text
          key={`tc-val-${val}`}
          x={x}
          y={tcY + 32}
          className="scale-value"
          textAnchor="middle"
        >
          {val.toFixed(1)}
        </text>
      );
    });

    const tcGamma = 1 - results.transCoeff;
    const tcX = startX + (endX - startX) * tcGamma;
    elements.push(
      <line
        key="tc-connection"
        x1={rlX}
        y1={rlY + 15}
        x2={tcX}
        y2={tcY + 15}
        className="conn-line tc"
      />
    );
    elements.push(
      <circle
        key="tc-marker"
        cx={tcX}
        cy={tcY + 15}
        r="4"
        className="marker-tc"
      />
    );

    return elements;
  };

  const handleInputChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const inputSections = [
    {
      title: "Line Parameters",
      icon: <TrendingUp size={16} className="section-icon-svg" />,
      fields: [
        { label: "Resistance R", field: "R", step: 0.1, unit: "Ω/m" },
        { label: "Inductance L", field: "L", step: 1, unit: "nH/m" },
        { label: "Conductance G", field: "G", step: 0.00001, unit: "S/m" },
        { label: "Capacitance C", field: "C", step: 1, unit: "pF/m" },
      ],
    },
    {
      title: "Load Impedance",
      icon: <Radio size={16} className="section-icon-svg" />,
      fields: [
        { label: "ZL Real", field: "ZL_real", step: 0.1, unit: "Ω" },
        { label: "ZL Imaginary", field: "ZL_imag", step: 0.1, unit: "Ω" },
      ],
    },
    {
      title: "System Parameters",
      icon: <Zap size={16} className="section-icon-svg" />,
      fields: [
        { label: "Frequency", field: "freq", step: 0.1, unit: "GHz" },
        { label: "Line Length", field: "length", step: 0.001, unit: "m" },
        { label: "Reference Z₀", field: "Z0", step: 1, unit: "Ω" },
      ],
    },
  ];

  return (
    <div className="smith-container">
      <div className="card-shell">
        <header className="tool-header">
          <div className="logo-box">
            <Zap size={32} />
          </div>
          <div>
            <h1 className="tool-title">Smith Chart Analyzer</h1>
            <p className="tool-sub">Advanced RF Impedance Matching Tool</p>
          </div>
        </header>

        <div className="main-grid">
          <aside className="left-panel">
            {inputSections.map((section, idx) => (
              <div key={idx} className="section-card">
                <div className="section-head">
                  <span className="section-icon">{section.icon}</span>
                  <h3 className="section-title">{section.title}</h3>
                </div>

                {section.fields.map(({ label, field, step, unit }) => (
                  <div key={field} className="field">
                    <label className="field-label">{label}</label>
                    <div className="field-row">
                      <input
                        type="number"
                        className="field-input"
                        value={inputs[field]}
                        onChange={(e) =>
                          handleInputChange(field, e.target.value)
                        }
                        step={step}
                      />
                      <span className="field-unit">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </aside>

          <main className="center-panel">
            <div className="chart-panel">
              <svg
                viewBox="0 -200 850 1200"
                className={`chart-svg ${animate ? "animating" : ""}`}
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <linearGradient
                    id="chartGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.1)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                  </linearGradient>
                </defs>

                <circle className="main-circle" cx="400" cy="300" r="300" />

                {generateDetailedGrid()}

                <circle cx="400" cy="300" r="3" className="center-dot" />

                <line
                  className="center-line"
                  x1="100"
                  y1="300"
                  x2="700"
                  y2="300"
                />

                {/* SWR Circle - SAME radius for both ZL and Zin */}
                {swrCircleRadius > 5 && (
                  <circle
                    cx="400"
                    cy="300"
                    r={swrCircleRadius}
                    className="swr-circle"
                  />
                )}

                {/* Constant |Γ| circles */}
            

                {generateAngleMarkings()}

                {/* Radius line from center to ZL */}
                <line
                  x1="400"
                  y1="300"
                  x2={zlPoint.x}
                  y2={zlPoint.y}
                  className="radius-line zl"
                />

                {/* Radius line from center to Zin */}
                <line
                  x1="400"
                  y1="300"
                  x2={zinPoint.x}
                  y2={zinPoint.y}
                  className="radius-line zin"
                />

                {/* Arc from ZL to Zin along SWR circle */}
                {swrCircleRadius > 5 && (
                  <path
                    d={`M ${zlPoint.x} ${zlPoint.y} A ${swrCircleRadius} ${swrCircleRadius} 0 ${largeArcFlag} ${sweepFlag} ${zinPoint.x} ${zinPoint.y}`}
                    className="transformation-arc"
                    fill="none"
                  />
                )}

                {/* ZL Marker */}
                <g
                  className="marker marker-zl"
                  style={{ transformOrigin: `${zlPoint.x}px ${zlPoint.y}px` }}
                >
                  <circle
                    cx={zlPoint.x}
                    cy={zlPoint.y}
                    r="8"
                    className="marker-bg"
                    filter="url(#glow)"
                  />
                  <circle
                    cx={zlPoint.x}
                    cy={zlPoint.y}
                    r="5"
                    className="marker-core red"
                  />
                  <circle
                    cx={zlPoint.x}
                    cy={zlPoint.y}
                    r="8"
                    className="marker-ring red"
                  />
                  <text
                    x={zlPoint.x + 15}
                    y={zlPoint.y - 15}
                    className="marker-label red"
                  >
                    ZL
                  </text>
                  <text
                    x={zlPoint.x + 15}
                    y={zlPoint.y - 2}
                    className="marker-sublabel"
                  >
                    z={zlNorm.zn.re.toFixed(2)}{zlNorm.zn.im >= 0 ? '+' : ''}{zlNorm.zn.im.toFixed(2)}j
                  </text>
                </g>

                {/* Zin Marker */}
                <g
                  className="marker marker-zin"
                  style={{ transformOrigin: `${zinPoint.x}px ${zinPoint.y}px` }}
                >
                  <circle
                    cx={zinPoint.x}
                    cy={zinPoint.y}
                    r="8"
                    className="marker-bg"
                    filter="url(#glow)"
                  />
                  <circle
                    cx={zinPoint.x}
                    cy={zinPoint.y}
                    r="5"
                    className="marker-core green"
                  />
                  <circle
                    cx={zinPoint.x}
                    cy={zinPoint.y}
                    r="8"
                    className="marker-ring green"
                  />
                  <text
                    x={zinPoint.x + 15}
                    y={zinPoint.y - 15}
                    className="marker-label green"
                  >
                    Zin
                  </text>
                  <text
                    x={zinPoint.x + 15}
                    y={zinPoint.y - 2}
                    className="marker-sublabel"
                  >
                    z={zinNorm.zn.re.toFixed(2)}{zinNorm.zn.im >= 0 ? '+' : ''}{zinNorm.zn.im.toFixed(2)}j
                  </text>
                </g>

                <text
                  x="400"
                  y="-150"
                  className="chart-title"
                  textAnchor="middle"
                >
                  NORMALIZED SMITH CHART
                </text>
                
                <text
                  x="400"
                  y="-130"
                  className="chart-subtitle"
                  textAnchor="middle"
                >
                  IMPEDANCE COORDINATES
                </text>

                <text
                  x="730"
                  y="310"
                  className="direction-label"
                  textAnchor="start"
                >
                  ↓ TOWARD GENERATOR
                </text>
                
                <text
                  x="80"
                  y="310"
                  className="direction-label"
                  textAnchor="end"
                >
                  TOWARD LOAD ↓
                </text>
                
                <text x="100" y="320" className="baseline-label" textAnchor="middle">r=0</text>
                <text x="200" y="320" className="baseline-label" textAnchor="middle">r=0.2</text>
                <text x="300" y="320" className="baseline-label" textAnchor="middle">r=0.5</text>
                <text x="400" y="320" className="baseline-label" textAnchor="middle">r=1</text>
                <text x="500" y="320" className="baseline-label" textAnchor="middle">r=2</text>
                <text x="600" y="320" className="baseline-label" textAnchor="middle">r=5</text>
                <text x="700" y="320" className="baseline-label" textAnchor="middle">∞</text>

                <g className="legend">
                  <rect x="50" y="450" width="160" height="85" rx="8" className="legend-box" />
                  <text x="60" y="468" className="legend-title">Legend</text>
                  <circle cx="65" cy="480" r="4" className="marker-core red" />
                  <text x="75" y="485" className="legend-text">Load Impedance (ZL)</text>
                  <circle cx="65" cy="500" r="4" className="marker-core green" />
                  <text x="75" y="505" className="legend-text">Input Impedance (Zin)</text>
                  <line x1="60" y1="515" x2="75" y2="515" className="swr-circle" style={{ strokeDasharray: "4,2" }} />
                  <text x="80" y="520" className="legend-text">SWR Circle</text>
                </g>

                {generateScales()}
              </svg>
            </div>
          </main>

          <aside className="right-panel">
            <h2 className="results-title">Results</h2>

            <div className="result-card zin">
              <div className="result-head">Input Impedance (Zin)</div>
              <div className="result-value">
                {results.Zin.re.toFixed(2)} {results.Zin.im >= 0 ? "+j" : "-j"}
                {Math.abs(results.Zin.im.toFixed(2))} Ω
              </div>
              <div className="result-sub">
                |Z| = {results.Zin.mag().toFixed(2)} Ω, ∠
                {((results.Zin.phase() * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="result-card zc">
              <div className="result-head">Characteristic Impedance (Zc)</div>
              <div className="result-value">
                {results.Zc.re.toFixed(2)} {results.Zc.im >= 0 ? "+j" : "-j"}
                {Math.abs(results.Zc.im.toFixed(2))} Ω
              </div>
              <div className="result-sub">
                |Z| = {results.Zc.mag().toFixed(2)} Ω, ∠
                {((results.Zc.phase() * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="result-card gamma">
              <div className="result-head">Reflection Coefficient (Γ)</div>
              <div className="result-value">
                {results.Gamma.re.toFixed(4)} {results.Gamma.im >= 0 ? "+j" : "-j"}{" "}
                {Math.abs(results.Gamma.im.toFixed(4))}
              </div>
              <div className="result-sub">
                |Γ| = {results.Gamma.mag().toFixed(4)}, ∠
                {((results.Gamma.phase() * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>

            <div className="result-card vswr">
              <div className="result-head">VSWR</div>
              <div className="result-value large">
                {results.VSWR < 100 ? results.VSWR.toFixed(3) : "∞"}
              </div>
            </div>

            <div className="result-card rl">
              <div className="result-head">Return Loss</div>
              <div className="result-value large">
                {results.returnLoss.toFixed(2)} dB
              </div>
            </div>

            <div className="result-card qf">
              <div className="result-head">Q-Factor</div>
              <div className="result-value large">
                {results.QFactor.toFixed(3)}
              </div>
            </div>

            <div className="result-card wavelength">
              <div className="result-head">Electrical Length</div>
              <div className="result-value">
                {results.electricalLength.toFixed(4)}λ
              </div>
              <div className="result-sub">
                {results.electricalLengthDegrees.toFixed(2)}° | λ = {results.wavelength.toFixed(4)}m
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SmithChartTool;