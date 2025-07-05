import { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [vehicules, setVehicules] = useState([]);
  const [search, setSearch] = useState('');
  const [formVehicule, setFormVehicule] = useState({
    marque: '',
    modele: '',
    annee: '',
    prix: ''
  });

  // 🔄 Charger tous les véhicules
  const fetchVehicules = () => {
    axios.get('http://localhost:5000/api/vehicules')
      .then(res => setVehicules(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchVehicules();
  }, []);

  // ✅ Réserver un véhicule
  const reserverVehicule = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/vehicules/reserver/${id}`);
      alert('Réservation réussie !');
      fetchVehicules();
    } catch (err) {
      alert("Ce véhicule est déjà réservé");
    }
  };

  // ✅ Ajouter un véhicule
  const handleFormChange = (e) => {
    setFormVehicule({ ...formVehicule, [e.target.name]: e.target.value });
  };

  const handleAddVehicule = async (e) => {
    e.preventDefault();
    const { marque, modele, annee, prix } = formVehicule;
    try {
      await axios.post('http://localhost:5000/api/vehicules/add', {
        marque,
        modele,
        annee: parseInt(annee),
        prix: parseFloat(prix)
      });
      alert('🚗 Véhicule ajouté avec succès !');
      setFormVehicule({ marque: '', modele: '', annee: '', prix: '' });
      fetchVehicules();
    } catch (err) {
      alert('❌ Erreur lors de l’ajout');
      console.error(err);
    }
  };

  // 🔍 Recherche
  const filtered = vehicules.filter(v =>
    v.marque.toLowerCase().includes(search.toLowerCase()) ||
    v.modele.toLowerCase().includes(search.toLowerCase()) ||
    v.annee.toString().includes(search)
  );

  return (
    <div className="dashboard-container">
      <div style={{ textAlign: 'right', marginBottom: '10px' }}>
        <Link to="/login">Se déconnecter</Link>
      </div>

      <h1>Tableau de Bord - Véhicules</h1>

      {/* 🔵 Formulaire d’ajout */}
      <form className="vehicule-form" onSubmit={handleAddVehicule}>
        <input name="marque" placeholder="Marque" value={formVehicule.marque} onChange={handleFormChange} required />
        <input name="modele" placeholder="Modèle" value={formVehicule.modele} onChange={handleFormChange} required />
        <input name="annee" placeholder="Année" type="number" value={formVehicule.annee} onChange={handleFormChange} required />
        <input name="prix" placeholder="Prix" type="number" value={formVehicule.prix} onChange={handleFormChange} required />
        <button type="submit">Ajouter le véhicule</button>
      </form>

      {/* 🔎 Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher par marque, modèle ou année..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="search-bar"
      />

      {/* 📋 Tableau des véhicules */}
      <table className="vehicule-table">
        <thead>
          <tr>
            <th>Marque</th>
            <th>Modèle</th>
            <th>Année</th>
            <th>Prix</th>
            <th>Disponibilité</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(v => (
            <tr key={v.id}>
              <td>{v.marque}</td>
              <td>{v.modele}</td>
              <td>{v.annee}</td>
              <td>{v.prix} €</td>
              <td>
                {v.disponible ? (
                  <button onClick={() => reserverVehicule(v.id)}>Réserver</button>
                ) : (
                  <span className="non-dispo">Indisponible</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
