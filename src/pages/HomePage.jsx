import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Activity, LineChart, Radio } from "lucide-react";
import "./HomePage.css";

const HomePage = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const navigationCards = [
    {
      id: 1,
      title: "Smith Chart Simulator",
      description:
        "Visualize impedance matching, VSWR, and reflection coefficients on an interactive Smith chart",
      icon: Radio,
      route: "/smith-chart",
      color: "#3b82f6",
    },
    {
      id: 2,
      title: "Impedance Calculator",
      description:
        "Calculate characteristic impedance, propagation constant, and transmission line parameters",
      icon: Activity,
      route: "/impedance-calculator",
      color: "#a855f7",
    },
    {
      id: 3,
      title: "Wave Propagation",
      description:
        "Simulate and analyze electromagnetic wave propagation along transmission lines",
      icon: LineChart,
      route: "/wave-propagation",
      color: "#f97316",
    },
  ];

  return (
    <div className="homepage-container">
      {/* Animated background */}
      <div className="animated-background">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>

      {/* Floating particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Main content */}
      <div className="content-wrapper">
        {/* Header */}
        <header className="hero-section">
          <div className="hero-icon-wrapper">
            <Zap className="hero-icon" size={80} />
            <div className="icon-glow"></div>
          </div>

          <h1 className="hero-title">
            <span className="title-line">Transmission Line</span>
            <span className="title-line gradient-text">Visualizer</span>
          </h1>

          <p className="hero-subtitle">
            Explore the electromagnetic world of transmission lines through
            interactive simulations and real-time visualizations
          </p>
        </header>

        {/* Cards Section */}
        <div className="navigation-section">
          <h2 className="section-title">Choose Your Analysis Tool</h2>

          <div className="cards-grid">
            {navigationCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className={`nav-card ${
                    hoveredCard === card.id ? "hovered" : ""
                  }`}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div
                    className="card-glow"
                    style={{ background: card.color }}
                  ></div>

                  <div className="card-icon-wrapper">
                    <Icon className="card-icon" size={40} />
                  </div>

                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>

                  <button
                    className="card-button"
                    onClick={() => navigate(card.route)}
                  >
                    <span>Explore</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M6 3L11 8L6 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="credits-section">
          <div className="credits-card">
            <div className="credits-header">
              <Zap size={24} />
              <h3>Project Credits</h3>
            </div>
            <div className="credits-content">
              <p><strong>Project:</strong> Transmission Line Visualizer</p>
              <p><strong>Developed By:</strong> Your Team Name</p>
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Year:</strong> 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
