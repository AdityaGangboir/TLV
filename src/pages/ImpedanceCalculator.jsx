import React, { useState, useMemo } from "react";
import { Activity, Zap, TrendingUp, Waves, BookOpen } from "lucide-react";
import "./ImpedanceCalculator.css";

// Complex number class
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
  mag() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }
  phase() {
    return Math.atan2(this.im, this.re);
  }
  scale(k) {
    return new Complex(this.re * k, this.im * k);
  }
  sqrt() {
    const r = this.mag();
    const theta = this.phase() / 2;
    return new Complex(
      Math.sqrt(r) * Math.cos(theta),
      Math.sqrt(r) * Math.sin(theta)
    );
  }
  conj() {
    return new Complex(this.re, -this.im);
  }
}

const ImpedanceCalculator = () => {
  const [inputs, setInputs] = useState({
    R: 2.5,
    L: 250,
    G: 0.00001,
    C: 100,
    freq: 1,
    length: 0.1,
    ZL_re: 75,
    ZL_im: 0,
    Z0: 50,
  });

  const [showFormulas, setShowFormulas] = useState(false);

  const results = useMemo(() => {
    const { R, L, G, C, freq, length, ZL_re, ZL_im, Z0 } = inputs;
    const omega = 2 * Math.PI * freq * 1e9;

    // Series impedance and shunt admittance per unit length
    // Z = R + jωL (Ω/m)
    const Z = new Complex(R, omega * L * 1e-9);
    
    // Y = G + jωC (S/m)
    const Y = new Complex(G, omega * C * 1e-12);

    // Propagation constant γ = √(ZY) = α + jβ
    const ZY = Z.mul(Y);
    const gamma = ZY.sqrt();
    const alpha = gamma.re; // Attenuation constant (Np/m)
    const beta = gamma.im; // Phase constant (rad/m)

    // Characteristic impedance Zc = √(Z/Y)
    const Zc = Z.div(Y).sqrt();

    // Wavelength λ = 2π/β
    const wavelength = (2 * Math.PI) / beta;
    
    // Phase velocity vp = ω/β
    const phaseVel = omega / beta; // m/s

    // Load impedance
    const ZL = new Complex(ZL_re, ZL_im);

    // Input impedance using hyperbolic functions
    // Zin = Zc * (ZL + Zc*tanh(γl)) / (Zc + ZL*tanh(γl))
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

    // Reflection coefficient at load
    // ΓL = (ZL - Z0) / (ZL + Z0)
    const GammaL = ZL.sub(new Complex(Z0, 0)).div(ZL.add(new Complex(Z0, 0)));

    // Reflection coefficient at input
    // Γin = (Zin - Z0) / (Zin + Z0)
    const Gamma_in = Zin.sub(new Complex(Z0, 0)).div(
      Zin.add(new Complex(Z0, 0))
    );

    // VSWR = (1 + |Γ|) / (1 - |Γ|)
    const rho = Gamma_in.mag();
    const VSWR = rho < 0.9999 ? (1 + rho) / (1 - rho) : 999;

    // Return loss = -20*log10(|Γ|) dB
    const returnLoss = -20 * Math.log10(rho);

    // Attenuation in dB = α*l*8.686
    const attenuation_dB = alpha * length * 8.686; // Convert Np to dB

    // Quality factor Q = ωL/R or 1/(ωRC)
    const Q_series = (omega * L * 1e-9) / R;
    const Q_shunt = 1 / (omega * C * 1e-12 * (1/G));

    // Electrical length in degrees = βl * 180/π
    const electricalLength = (beta * length * 180) / Math.PI;

    // Time delay τ = l/vp
    const timeDelay = length / phaseVel; // seconds

    return {
      Zc,
      gamma,
      alpha,
      beta,
      wavelength,
      phaseVel,
      Zin,
      ZL,
      GammaL,
      Gamma_in,
      VSWR,
      returnLoss,
      attenuation_dB,
      Q_series,
      Q_shunt,
      electricalLength,
      timeDelay,
    };
  }, [inputs]);

  const handleInputChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const formatComplex = (z, unit = "") => {
    const sign = z.im >= 0 ? "+" : "";
    return `${z.re.toFixed(3)} ${sign} j${z.im.toFixed(3)} ${unit}`;
  };

  const formulas = [
    {
      title: "Series Impedance",
      formula: "Z = R + jωL",
      description: "Series impedance per unit length (Ω/m)"
    },
    {
      title: "Shunt Admittance",
      formula: "Y = G + jωC",
      description: "Shunt admittance per unit length (S/m)"
    },
    {
      title: "Propagation Constant",
      formula: "γ = √(ZY) = α + jβ",
      description: "Where α is attenuation constant (Np/m) and β is phase constant (rad/m)"
    },
    {
      title: "Characteristic Impedance",
      formula: "Zc = √(Z/Y)",
      description: "Characteristic impedance of the transmission line"
    },
    {
      title: "Input Impedance",
      formula: "Zin = Zc[(ZL + Zc·tanh(γl))/(Zc + ZL·tanh(γl))]",
      description: "Input impedance looking into the line"
    },
    {
      title: "Reflection Coefficient",
      formula: "Γ = (Z - Z₀)/(Z + Z₀)",
      description: "Reflection coefficient at any point"
    },
    {
      title: "VSWR",
      formula: "VSWR = (1 + |Γ|)/(1 - |Γ|)",
      description: "Voltage Standing Wave Ratio"
    },
    {
      title: "Return Loss",
      formula: "RL = -20·log₁₀(|Γ|) dB",
      description: "Return loss in decibels"
    },
    {
      title: "Wavelength",
      formula: "λ = 2π/β",
      description: "Wavelength in meters"
    },
    {
      title: "Phase Velocity",
      formula: "vp = ω/β",
      description: "Phase velocity in m/s"
    },
    {
      title: "Attenuation",
      formula: "α(dB) = α(Np)·l·8.686",
      description: "Attenuation in dB over length l"
    },
    {
      title: "Electrical Length",
      formula: "θ = βl·(180/π)°",
      description: "Electrical length in degrees"
    },
    {
      title: "Time Delay",
      formula: "τ = l/vp",
      description: "Signal propagation delay"
    },
    {
      title: "Quality Factor",
      formula: "Q = ωL/R",
      description: "Quality factor for series and shunt elements"
    }
  ];

  return (
    <div className="impedance-calc-container">
      <div className="impedance-calc-wrapper">
        {/* Header */}
        <div className="impedance-calc-header">
          <div className="impedance-calc-icon-wrapper">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="impedance-calc-title">Transmission Line Impedance Calculator</h1>
            <p className="impedance-calc-subtitle">
              Calculate characteristic impedance, propagation constant, and transmission line parameters with detailed formulas
            </p>
          </div>
        </div>

        {/* Formula Toggle Button */}
        <div className="formula-toggle-container">
          <button 
            className="formula-toggle-btn"
            onClick={() => setShowFormulas(!showFormulas)}
          >
            <BookOpen size={20} />
            {showFormulas ? "Hide Formulas" : "Show Formulas"}
          </button>
        </div>

        {/* Formulas Section */}
        {showFormulas && (
          <div className="formulas-section">
            <h2 className="formulas-title">
              <BookOpen size={24} />
              Formulas Used in Calculations
            </h2>
            <div className="formulas-grid">
              {formulas.map((item, idx) => (
                <div key={idx} className="formula-card">
                  <h3 className="formula-card-title">{item.title}</h3>
                  <div className="formula-equation">{item.formula}</div>
                  <p className="formula-description">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="impedance-calc-content">
          {/* Input Section */}
          <div className="impedance-calc-inputs">
            <h2 className="section-title">
              <Zap size={20} />
              Line Parameters
            </h2>

            <div className="input-grid">
              <div className="input-item">
                <label>Resistance R (Ω/m)</label>
                <input
                  type="number"
                  value={inputs.R}
                  onChange={(e) => handleInputChange("R", e.target.value)}
                  step="0.1"
                />
              </div>

              <div className="input-item">
                <label>Inductance L (nH/m)</label>
                <input
                  type="number"
                  value={inputs.L}
                  onChange={(e) => handleInputChange("L", e.target.value)}
                  step="1"
                />
              </div>

              <div className="input-item">
                <label>Conductance G (S/m)</label>
                <input
                  type="number"
                  value={inputs.G}
                  onChange={(e) => handleInputChange("G", e.target.value)}
                  step="0.00001"
                />
              </div>

              <div className="input-item">
                <label>Capacitance C (pF/m)</label>
                <input
                  type="number"
                  value={inputs.C}
                  onChange={(e) => handleInputChange("C", e.target.value)}
                  step="1"
                />
              </div>

              <div className="input-item">
                <label>Frequency (GHz)</label>
                <input
                  type="number"
                  value={inputs.freq}
                  onChange={(e) => handleInputChange("freq", e.target.value)}
                  step="0.1"
                />
              </div>

              <div className="input-item">
                <label>Line Length (m)</label>
                <input
                  type="number"
                  value={inputs.length}
                  onChange={(e) => handleInputChange("length", e.target.value)}
                  step="0.01"
                />
              </div>
            </div>

            <h2 className="section-title">
              <TrendingUp size={20} />
              Load Configuration
            </h2>

            <div className="input-grid">
              <div className="input-item">
                <label>Load Real Part (Ω)</label>
                <input
                  type="number"
                  value={inputs.ZL_re}
                  onChange={(e) => handleInputChange("ZL_re", e.target.value)}
                  step="1"
                />
              </div>

              <div className="input-item">
                <label>Load Imaginary Part (Ω)</label>
                <input
                  type="number"
                  value={inputs.ZL_im}
                  onChange={(e) => handleInputChange("ZL_im", e.target.value)}
                  step="1"
                />
              </div>

              <div className="input-item">
                <label>Reference Z₀ (Ω)</label>
                <input
                  type="number"
                  value={inputs.Z0}
                  onChange={(e) => handleInputChange("Z0", e.target.value)}
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="impedance-calc-results">
            <h2 className="section-title">
              <Waves size={20} />
              Calculated Results
            </h2>

            {/* Characteristic Impedance */}
            <div className="result-card purple">
              <div className="result-icon">Zc</div>
              <div className="result-content">
                <h3>Characteristic Impedance</h3>
                <div className="result-value">
                  {formatComplex(results.Zc, "Ω")}
                </div>
                <div className="result-meta">
                  |Zc| = {results.Zc.mag().toFixed(3)} Ω, ∠
                  {((results.Zc.phase() * 180) / Math.PI).toFixed(2)}°
                </div>
                <div className="result-formula">Zc = √(Z/Y)</div>
              </div>
            </div>

            {/* Propagation Constant */}
            <div className="result-card blue">
              <div className="result-icon">γ</div>
              <div className="result-content">
                <h3>Propagation Constant</h3>
                <div className="result-value">
                  {formatComplex(results.gamma, "/m")}
                </div>
                <div className="result-meta">
                  α = {results.alpha.toFixed(6)} Np/m | β ={" "}
                  {results.beta.toFixed(3)} rad/m
                </div>
                <div className="result-formula">γ = √(ZY) = α + jβ</div>
              </div>
            </div>

            {/* Wave Properties */}
            <div className="result-card green">
              <div className="result-icon">λ</div>
              <div className="result-content">
                <h3>Wave Properties</h3>
                <div className="result-value">
                  λ = {results.wavelength.toFixed(4)} m
                </div>
                <div className="result-meta">
                  Phase Velocity = {(results.phaseVel / 1e8).toFixed(3)} × 10⁸
                  m/s
                </div>
                <div className="result-formula">λ = 2π/β, vp = ω/β</div>
              </div>
            </div>

            {/* Input Impedance */}
            <div className="result-card orange">
              <div className="result-icon">Zin</div>
              <div className="result-content">
                <h3>Input Impedance</h3>
                <div className="result-value">
                  {formatComplex(results.Zin, "Ω")}
                </div>
                <div className="result-meta">
                  |Zin| = {results.Zin.mag().toFixed(3)} Ω, ∠
                  {((results.Zin.phase() * 180) / Math.PI).toFixed(2)}°
                </div>
                <div className="result-formula">Zin = Zc[(ZL + Zc·tanh(γl))/(Zc + ZL·tanh(γl))]</div>
              </div>
            </div>

            {/* Load Impedance */}
            <div className="result-card red">
              <div className="result-icon">ZL</div>
              <div className="result-content">
                <h3>Load Impedance</h3>
                <div className="result-value">
                  {formatComplex(results.ZL, "Ω")}
                </div>
                <div className="result-meta">
                  |ZL| = {results.ZL.mag().toFixed(3)} Ω, ∠
                  {((results.ZL.phase() * 180) / Math.PI).toFixed(2)}°
                </div>
                <div className="result-formula">ZL = R + jX</div>
              </div>
            </div>

            {/* Reflection Coefficient */}
            <div className="result-card teal">
              <div className="result-icon">Γ</div>
              <div className="result-content">
                <h3>Reflection Coefficient (Input)</h3>
                <div className="result-value">
                  {formatComplex(results.Gamma_in)}
                </div>
                <div className="result-meta">
                  |Γ| = {results.Gamma_in.mag().toFixed(4)}, ∠
                  {((results.Gamma_in.phase() * 180) / Math.PI).toFixed(2)}°
                </div>
                <div className="result-formula">Γ = (Zin - Z₀)/(Zin + Z₀)</div>
              </div>
            </div>

            {/* VSWR */}
            <div className="result-card pink">
              <div className="result-icon">S</div>
              <div className="result-content">
                <h3>Voltage Standing Wave Ratio</h3>
                <div className="result-value large">
                  {results.VSWR < 100 ? results.VSWR.toFixed(3) : "∞"}
                </div>
                <div className="result-meta">
                  Return Loss = {results.returnLoss.toFixed(2)} dB
                </div>
                <div className="result-formula">VSWR = (1 + |Γ|)/(1 - |Γ|)</div>
              </div>
            </div>

            {/* Attenuation */}
            <div className="result-card yellow">
              <div className="result-icon">α</div>
              <div className="result-content">
                <h3>Line Attenuation</h3>
                <div className="result-value large">
                  {results.attenuation_dB.toFixed(3)} dB
                </div>
                <div className="result-meta">Over {inputs.length} m length</div>
                <div className="result-formula">α(dB) = α·l·8.686</div>
              </div>
            </div>

            {/* Electrical Length */}
            <div className="result-card violet">
              <div className="result-icon">θ</div>
              <div className="result-content">
                <h3>Electrical Length</h3>
                <div className="result-value large">
                  {results.electricalLength.toFixed(2)}°
                </div>
                <div className="result-meta">
                  Time Delay: {(results.timeDelay * 1e9).toFixed(3)} ns
                </div>
                <div className="result-formula">θ = βl·(180/π)</div>
              </div>
            </div>

            {/* Quality Factor */}
            <div className="result-card emerald">
              <div className="result-icon">Q</div>
              <div className="result-content">
                <h3>Quality Factor</h3>
                <div className="result-value">
                  Qseries = {results.Q_series.toFixed(2)}
                </div>
                <div className="result-meta">
                  Qshunt = {results.Q_shunt.toFixed(2)}
                </div>
                <div className="result-formula">Q = ωL/R</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpedanceCalculator;