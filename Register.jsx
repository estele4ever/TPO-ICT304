import { useState } from 'react';
import axios from 'axios';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({ nom: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const { nom, email, password } = formData; // ✅ extraction correcte des données
    try {
      const res = await axios.post('http://localhost:5000/api/users/register', {
        nom,
        email,
        password,
      });
      alert('Inscription réussie ✅');
      console.log(res.data);

      // ✅ Redirection automatique vers /login après succès
      navigate('/login');
    } catch (err) {
      alert("❌ Erreur lors de l'inscription");
      console.error(err);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Créer un compte</h2>
        <input
          name="nom"
          placeholder="Nom complet"
          value={formData.nom}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">S’inscrire</button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
