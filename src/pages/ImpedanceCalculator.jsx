import React, { useState, useMemo } from 'react';
import { Activity, Zap, TrendingUp, Waves } from 'lucide-react';
import './ImpedanceCalculator.css';

// Complex number class
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
  mag() { return Math.sqrt(this.re * this.re + this.im * this.im); }
  phase() { return Math.atan2(this.im, this.re); }
  scale(k) { return new Complex(this.re * k, this.im * k); }
  sqrt() {
    const r = this.mag();
    const theta = this.phase() / 2;
    return new Complex(Math.sqrt(r) * Math.cos(theta), Math.sqrt(r) * Math.sin(theta));
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
    Z0: 50
  });

  const results = useMemo(() => {
    const { R, L, G, C, freq, length, ZL_re, ZL_im, Z0 } = inputs;
    const omega = 2 * Math.PI * freq * 1e9;
    
    // Series impedance and shunt admittance per unit length
    const Z = new Complex(R, omega * L * 1e-9);
    const Y = new Complex(G, omega * C * 1e-12);
    
    // Propagation constant γ = √(ZY)
    const ZY = Z.mul(Y);
    const gamma = ZY.sqrt();
    const alpha = gamma.re; // Attenuation constant (Np/m)
    const beta = gamma.im;  // Phase constant (rad/m)
    
    // Characteristic impedance Zc = √(Z/Y)
    const Zc = Z.div(Y).sqrt();
    
    // Wavelength and phase velocity
    const wavelength = (2 * Math.PI) / beta;
    const phaseVel = omega / beta; // m/s
    
    // Load impedance
    const ZL = new Complex(ZL_re, ZL_im);
    
    // Input impedance using hyperbolic functions
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
    const GammaL = ZL.sub(new Complex(Z0, 0)).div(ZL.add(new Complex(Z0, 0)));
    
    // Reflection coefficient at input
    const Gamma_in = Zin.sub(new Complex(Z0, 0)).div(Zin.add(new Complex(Z0, 0)));
    
    // VSWR
    const rho = Gamma_in.mag();
    const VSWR = rho < 0.9999 ? (1 + rho) / (1 - rho) : 999;
    
    // Return loss
    const returnLoss = -20 * Math.log10(rho);
    
    // Attenuation in dB
    const attenuation_dB = alpha * length * 8.686; // Convert Np to dB
    
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
      attenuation_dB
    };
  }, [inputs]);

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const formatComplex = (z, unit = '') => {
    const sign = z.im >= 0 ? '+' : '';
    return `${z.re.toFixed(3)} ${sign} j${z.im.toFixed(3)} ${unit}`;
  };

  return (
    <div className="impedance-calc-container">
      <div className="impedance-calc-wrapper">
        {/* Header */}
        <div className="impedance-calc-header">
          <div className="impedance-calc-icon-wrapper">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="impedance-calc-title">Impedance Calculator</h1>
            <p className="impedance-calc-subtitle">Calculate characteristic impedance, propagation constant, and transmission line parameters</p>
          </div>
        </div>

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
                  onChange={(e) => handleInputChange('R', e.target.value)}
                  step="0.1"
                />
              </div>
              
              <div className="input-item">
                <label>Inductance L (nH/m)</label>
                <input
                  type="number"
                  value={inputs.L}
                  onChange={(e) => handleInputChange('L', e.target.value)}
                  step="1"
                />
              </div>
              
              <div className="input-item">
                <label>Conductance G (S/m)</label>
                <input
                  type="number"
                  value={inputs.G}
                  onChange={(e) => handleInputChange('G', e.target.value)}
                  step="0.00001"
                />
              </div>
              
              <div className="input-item">
                <label>Capacitance C (pF/m)</label>
                <input
                  type="number"
                  value={inputs.C}
                  onChange={(e) => handleInputChange('C', e.target.value)}
                  step="1"
                />
              </div>
              
              <div className="input-item">
                <label>Frequency (GHz)</label>
                <input
                  type="number"
                  value={inputs.freq}
                  onChange={(e) => handleInputChange('freq', e.target.value)}
                  step="0.1"
                />
              </div>
              
              <div className="input-item">
                <label>Line Length (m)</label>
                <input
                  type="number"
                  value={inputs.length}
                  onChange={(e) => handleInputChange('length', e.target.value)}
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
                  onChange={(e) => handleInputChange('ZL_re', e.target.value)}
                  step="1"
                />
              </div>
              
              <div className="input-item">
                <label>Load Imaginary Part (Ω)</label>
                <input
                  type="number"
                  value={inputs.ZL_im}
                  onChange={(e) => handleInputChange('ZL_im', e.target.value)}
                  step="1"
                />
              </div>
              
              <div className="input-item">
                <label>Reference Z₀ (Ω)</label>
                <input
                  type="number"
                  value={inputs.Z0}
                  onChange={(e) => handleInputChange('Z0', e.target.value)}
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
                <div className="result-value">{formatComplex(results.Zc, 'Ω')}</div>
                <div className="result-meta">
                  |Zc| = {results.Zc.mag().toFixed(3)} Ω, ∠{(results.Zc.phase() * 180 / Math.PI).toFixed(2)}°
                </div>
              </div>
            </div>

            {/* Propagation Constant */}
            <div className="result-card blue">
              <div className="result-icon">γ</div>
              <div className="result-content">
                <h3>Propagation Constant</h3>
                <div className="result-value">{formatComplex(results.gamma, '/m')}</div>
                <div className="result-meta">
                  α = {results.alpha.toFixed(6)} Np/m | β = {results.beta.toFixed(3)} rad/m
                </div>
              </div>
            </div>

            {/* Wave Properties */}
            <div className="result-card green">
              <div className="result-icon">λ</div>
              <div className="result-content">
                <h3>Wave Properties</h3>
                <div className="result-value">λ = {results.wavelength.toFixed(4)} m</div>
                <div className="result-meta">
                  Phase Velocity = {(results.phaseVel / 1e8).toFixed(3)} × 10⁸ m/s
                </div>
              </div>
            </div>

            {/* Input Impedance */}
            <div className="result-card orange">
              <div className="result-icon">Zin</div>
              <div className="result-content">
                <h3>Input Impedance</h3>
                <div className="result-value">{formatComplex(results.Zin, 'Ω')}</div>
                <div className="result-meta">
                  |Zin| = {results.Zin.mag().toFixed(3)} Ω, ∠{(results.Zin.phase() * 180 / Math.PI).toFixed(2)}°
                </div>
              </div>
            </div>

            {/* Load Impedance */}
            <div className="result-card red">
              <div className="result-icon">ZL</div>
              <div className="result-content">
                <h3>Load Impedance</h3>
                <div className="result-value">{formatComplex(results.ZL, 'Ω')}</div>
                <div className="result-meta">
                  |ZL| = {results.ZL.mag().toFixed(3)} Ω, ∠{(results.ZL.phase() * 180 / Math.PI).toFixed(2)}°
                </div>
              </div>
            </div>

            {/* Reflection Coefficient */}
            <div className="result-card teal">
              <div className="result-icon">Γ</div>
              <div className="result-content">
                <h3>Reflection Coefficient (Input)</h3>
                <div className="result-value">{formatComplex(results.Gamma_in)}</div>
                <div className="result-meta">
                  |Γ| = {results.Gamma_in.mag().toFixed(4)}, ∠{(results.Gamma_in.phase() * 180 / Math.PI).toFixed(2)}°
                </div>
              </div>
            </div>

            {/* VSWR */}
            <div className="result-card pink">
              <div className="result-icon">S</div>
              <div className="result-content">
                <h3>Voltage Standing Wave Ratio</h3>
                <div className="result-value large">
                  {results.VSWR < 100 ? results.VSWR.toFixed(3) : '∞'}
                </div>
                <div className="result-meta">
                  Return Loss = {results.returnLoss.toFixed(2)} dB
                </div>
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
                <div className="result-meta">
                  Over {inputs.length} m length
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpedanceCalculator;