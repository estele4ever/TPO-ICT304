import { useState } from 'react';
import axios from 'axios';
import './Login.css'; // on utilisera un CSS de base
import { Link } from 'react-router-dom'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', formData);
      alert('Connexion réussie !');
      console.log(res.data);

      // Redirection vers dashboard après connexion
      window.location.href = "/dashboard";
    } catch (err) {
      alert("Email ou mot de passe incorrect");
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Mot de passe" onChange={handleChange} required />
        <button type="submit">Se connecter</button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
  Pas encore de compte ? <Link to="/">Créer un compte</Link>
</p>
      </form>
    </div>
  );
}
