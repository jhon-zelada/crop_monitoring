// File: src/pages/Login.jsx
import React from 'react';
import '../styles/login.css';

export default function LoginPage({ onLogin }) {
const [showForm, setShowForm] = React.useState(false);
const [loading, setLoading] = React.useState(false);
const [error, setError] = React.useState('');
const [form, setForm] = React.useState({ username: '', password: '' });


const handleChange = (e) => {
const { name, value } = e.target;
setForm((f) => ({ ...f, [name]: value }));
};


const handleSubmit = async (e) => {
e.preventDefault();
setError('');
if (!form.username || !form.password) {
setError('Por favor ingresa usuario y contraseña.');
return;
}
setLoading(true);
try {
// Adjust the endpoint to your FastAPI backend
const res = await fetch('/api/auth/login', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(form),
});


if (!res.ok) {
const payload = await res.json().catch(() => ({}));
throw new Error(payload.detail || 'Credenciales inválidas');
}


const payload = await res.json();
const token = payload.access_token || payload.token || '';
localStorage.setItem('access_token', token);
// optionally save user info as well
if (payload.user) localStorage.setItem('user', JSON.stringify(payload.user));


if (onLogin) onLogin(payload);
} catch (err) {
setError(err.message || 'Error al iniciar sesión');
} finally {
setLoading(false);
}
};
return (
<div className="auth-root" role="application" aria-label="Página de inicio de sesión">
<div className="auth-bg" aria-hidden="true" />
<div className="auth-center">
<div className={`auth-card ${showForm ? 'auth-card--form' : ''}`}>


{!showForm ? (
<div className="auth-intro">
<div className="auth-logo" aria-hidden="false" title="Logo del proyecto">
<svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
<rect width="48" height="48" rx="10" fill="#10B981" />
<text x="50%" y="58%" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">PM</text>
</svg>
</div>
<h1 className="auth-title">Proyecto Quinua</h1>
<p className="auth-desc">"Plataforma de monitoreo y alerta temprana utilizando algoritmos de procesamineto y autoencoders generativos, transmisión de imágenes multibanda mediante radiofrecuencia y análisis espectral para la determinación del estado de salud en cultivos de quinua y de condiciones climáticas en zonas agrícolas vulnerables como aporte a la gestión de riesgos" </p>
<button className="btn btn-primary" onClick={() => setShowForm(true)}>Iniciar sesión</button>
</div>
) : (
<form className="auth-form" onSubmit={handleSubmit} aria-label="Formulario de inicio de sesión">
<h2 className="form-title">Acceder</h2>
{error && <div className="auth-error" role="alert">{error}</div>}


<label className="field">
<span className="label-text">Usuario</span>
<input name="username" value={form.username} onChange={handleChange} autoComplete="username" />
</label>


<label className="field">
<span className="label-text">Contraseña</span>
<input type="password" name="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
</label>


<div className="form-actions">
<button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Ingresar'}</button>
<button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Volver</button>
</div>


<div className="auth-help">
<small>¿Olvidaste tu contraseña? Contacta al administrador.</small>
</div>
</form>
)}


</div>
</div>
</div>
);
}