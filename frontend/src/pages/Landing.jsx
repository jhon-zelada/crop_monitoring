// File: src/pages/Landing.jsx
import React from "react";
import "../styles/landing.css";

import banner from "../assets/quinoa-plantations.jpg";
import pestImg from "../assets/analizar-plagas.jpg";
import dataImg from "../assets/visualizacion-datos.png";
import mapImg from "../assets/mapas-campo.jpg";

export default function LandingPage({ onLoginClick }) {
  return (
    <div className="sq-landing">
      {/* Fila 1: Header (nota: header-inner ya NO usa sq-container) */}
      <header className="sq-header" role="banner">
        <div className="header-inner">
          <div className="brand" aria-hidden>
            <div className="brand-logo">SQ</div>
            <div className="brand-name">SmartQuinua</div>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-login"
              onClick={onLoginClick}
              aria-label="Iniciar sesión"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Fila 2: Hero */}
      <main className="sq-main">
        <section className="hero-row">
          <div className="hero">
            <img
              src={banner}
              alt="Campos de quinua"
              className="hero-image"
            />

            <div className="hero-overlay" role="region" aria-label="Introducción SmartQuinua">
              <h1 className="hero-title">SmartQuinua</h1>
              <p className="hero-text">
                Plataforma integral para monitoreo de cultivos: analiza imágenes de hojas,
                visualiza datos meteorológicos y recibe alertas tempranas para toma de decisiones.
              </p>

              <div className="hero-cta">
                <button className="btn btn-primary" onClick={onLoginClick}>
                  Comenzar ahora
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Fila 3: ¿Cómo funciona? */}
        <section className="how-row sq-container" aria-labelledby="how-title">
          <h2 id="how-title" className="how-title">¿Cómo funciona?</h2>
          <p className="how-desc">
            SmartQuinua permite visualizar información meteorológica en tiempo real, consultar
            históricos y patrones, y subir imágenes de hojas o cultivos para la detección automatizada
            de plagas mediante modelos de inteligencia artificial. El sistema combina datos de sensores
            y análisis de imágenes para generar alertas tempranas y mapas de campo con geolocalización.
          </p>
        </section>

        {/* Fila 4: 3 tarjetas */}
        <section className="cards-row sq-container" aria-label="Características principales">
          <div className="sq-cards-grid">
            <article className="sq-card" aria-labelledby="card-1-title">
              <div className="sq-card-media">
                <img src={pestImg} alt="Analizar plagas" />
              </div>
              <h3 id="card-1-title" className="sq-card-title">Analizar plagas</h3>
              <p className="sq-card-desc">
                Empleamos algoritmos de IA para detectar plagas y daños en imágenes, facilitando
                la identificación temprana y recomendaciones de manejo.
              </p>
            </article>

            <article className="card" aria-labelledby="card-2-title">
              <div className="sq-card-media">
                <img src={dataImg} alt="Visualización de datos" />
              </div>
              <h3 id="card-2-title" className="sq-card-title">Visualización de datos</h3>
              <p className="sq-card-desc">
                Paneles dinámicos con variables agroclimáticas (temperatura, humedad, precipitación)
                y generación de alertas cuando se detectan condiciones anómalas.
              </p>
            </article>

            <article className="sq-card" aria-labelledby="card-3-title">
              <div className="sq-card-media">
                <img src={mapImg} alt="Mapas de campo" />
              </div>
              <h3 id="card-3-title" className="sq-card-title">Mapas de campo</h3>
              <p className="sq-card-desc">
                Visualiza todas las ubicaciones donde se desplegaron sensores y realiza seguimiento
                espacial del estado del cultivo y eventos reportados.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="sq-footer">
        <div className="sq-container">
          <small>© {new Date().getFullYear()} SmartQuinua — Todos los derechos reservados</small>
        </div>
      </footer>
    </div>
  );
}
