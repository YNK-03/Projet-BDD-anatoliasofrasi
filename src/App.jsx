import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Database,
  Eye,
  Info,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  Utensils,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelCommande,
  createCommande,
  createPaiement,
  createPlat,
  deletePlat,
  getCategories,
  getCommande,
  getCommandes,
  getHealth,
  getPlat,
  getPlats,
  getReferences,
  getStats,
  updateCommandeStatut,
  updatePlat
} from './api.js';

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
});

const emptyDishForm = {
  id_plat: null,
  nom: '',
  description: '',
  prix: '',
  niveau_piquant: 'aucun',
  vegetarien: false,
  disponible: true,
  temps_preparation_min: 10,
  id_categorie: ''
};

const emptyOrderForm = {
  id_client: '',
  id_table: '',
  id_employe: '',
  type_commande: 'sur_place',
  note: '',
  lignes: []
};

function asMoney(value) {
  return money.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T')));
}

function statusTone(status) {
  if (status === 'payee' || status === 'valide') return 'success';
  if (status === 'annulee' || status === 'refuse') return 'danger';
  if (status === 'preparee' || status === 'servie' || status === 'en_attente') return 'warning';
  return 'neutral';
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function IconButton({ icon: Icon, children, tone = 'primary', ...props }) {
  return (
    <button className={`button button-${tone}`} {...props}>
      <Icon size={17} strokeWidth={2.2} />
      <span>{children}</span>
    </button>
  );
}

export default function App() {
  const [view, setView] = useState('commandes');
  const [health, setHealth] = useState({ status: 'checking', label: 'Connexion...' });
  const [categories, setCategories] = useState([]);
  const [plats, setPlats] = useState([]);
  const [orderPlats, setOrderPlats] = useState([]);
  const [clients, setClients] = useState([]);
  const [tables, setTables] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPlat, setSelectedPlat] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [dishFilters, setDishFilters] = useState({
    search: '',
    categorie: '',
    minPrice: '',
    maxPrice: '',
    onlyAvailable: true
  });
  const [orderFilters, setOrderFilters] = useState({
    search: '',
    statut: '',
    type: ''
  });
  const [dishForm, setDishForm] = useState(emptyDishForm);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [lineDraft, setLineDraft] = useState({ id_plat: '', quantite: 1, commentaire: '' });
  const [paymentMode, setPaymentMode] = useState('carte');
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlatId = selectedPlat?.plat?.id_plat;
  const selectedCommandeId = selectedCommande?.commande?.id_commande;

  const activeCategories = useMemo(
    () => categories.filter((category) => category.nombre_plats > 0 || category.id_categorie === Number(dishForm.id_categorie)),
    [categories, dishForm.id_categorie]
  );

  const orderTotal = useMemo(
    () => orderForm.lignes.reduce((total, line) => total + Number(line.prix) * Number(line.quantite), 0),
    [orderForm.lignes]
  );

  const refreshHealth = useCallback(async () => {
    try {
      const result = await getHealth();
      setHealth({
        status: 'ok',
        label: result.database?.database_name || 'MySQL connecte'
      });
    } catch (apiError) {
      setHealth({ status: 'down', label: apiError.message });
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch {
      setStats(null);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await getCategories();
    setCategories(data);
    setDishForm((current) =>
      current.id_categorie || !data[0]
        ? current
        : {
            ...current,
            id_categorie: String(data[0].id_categorie)
          }
    );
  }, []);

  const loadReferences = useCallback(async () => {
    const availablePlats = await getPlats({ onlyAvailable: true });
    let references = { clients: [], tables: [], employes: [] };

    try {
      references = await getReferences();
    } catch {
      references = { clients: [], tables: [], employes: [] };
    }

    setClients(references.clients);
    setTables(references.tables);
    setEmployes(references.employes);
    setOrderPlats(availablePlats);
    setLineDraft((current) =>
      current.id_plat || !availablePlats[0]
        ? current
        : { ...current, id_plat: String(availablePlats[0].id_plat) }
    );
    setOrderForm((current) => ({
      ...current,
      id_employe: current.id_employe || (references.employes[0] ? String(references.employes[0].id_employe) : '')
    }));
  }, []);

  const loadPlats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPlats(dishFilters);
      setPlats(data);
      if (selectedPlatId && !data.some((plat) => plat.id_plat === selectedPlatId)) {
        setSelectedPlat(null);
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [dishFilters, selectedPlatId]);

  const loadCommandes = useCallback(async () => {
    setOrderLoading(true);
    setError('');
    try {
      const data = await getCommandes(orderFilters);
      setCommandes(data);
      if (selectedCommandeId && !data.some((commande) => commande.id_commande === selectedCommandeId)) {
        setSelectedCommande(null);
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setOrderLoading(false);
    }
  }, [orderFilters, selectedCommandeId]);

  useEffect(() => {
    refreshHealth();
    loadCategories().catch((apiError) => setError(apiError.message));
    loadReferences().catch((apiError) => setError(apiError.message));
    loadStats();
  }, [loadCategories, loadReferences, loadStats, refreshHealth]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPlats();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadPlats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCommandes();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadCommandes]);

  async function selectPlat(id) {
    setError('');
    try {
      setSelectedPlat(await getPlat(id));
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function selectCommande(id) {
    setError('');
    try {
      setSelectedCommande(await getCommande(id));
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  function editPlat(plat) {
    setDishForm({
      id_plat: plat.id_plat,
      nom: plat.nom,
      description: plat.description || '',
      prix: plat.prix,
      niveau_piquant: plat.niveau_piquant,
      vegetarien: Boolean(plat.vegetarien),
      disponible: Boolean(plat.disponible),
      temps_preparation_min: plat.temps_preparation_min,
      id_categorie: String(plat.id_categorie)
    });
    setView('plats');
  }

  function resetDishForm() {
    setDishForm({
      ...emptyDishForm,
      id_categorie: categories[0] ? String(categories[0].id_categorie) : ''
    });
  }

  function resetOrderForm() {
    setOrderForm({
      ...emptyOrderForm,
      id_employe: employes[0] ? String(employes[0].id_employe) : ''
    });
    setLineDraft({
      id_plat: orderPlats[0] ? String(orderPlats[0].id_plat) : '',
      quantite: 1,
      commentaire: ''
    });
  }

  async function submitDishForm(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const payload = {
      ...dishForm,
      prix: Number(dishForm.prix),
      temps_preparation_min: Number(dishForm.temps_preparation_min),
      id_categorie: Number(dishForm.id_categorie)
    };

    try {
      const saved = dishForm.id_plat
        ? await updatePlat(dishForm.id_plat, payload)
        : await createPlat(payload);

      setMessage(dishForm.id_plat ? 'Plat mis a jour.' : 'Plat ajoute.');
      resetDishForm();
      await loadPlats();
      await loadStats();
      await loadCategories();
      await loadReferences();
      await selectPlat(saved.id_plat);
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function removePlat(plat) {
    setError('');
    setMessage('');
    try {
      const result = await deletePlat(plat.id_plat);
      setMessage(result?.message || 'Plat supprime.');
      if (selectedPlatId === plat.id_plat) setSelectedPlat(null);
      await loadPlats();
      await loadStats();
      await loadReferences();
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  function updateDishFilter(name, value) {
    setDishFilters((current) => ({ ...current, [name]: value }));
  }

  function updateDishForm(name, value) {
    setDishForm((current) => ({ ...current, [name]: value }));
  }

  function updateOrderFilter(name, value) {
    setOrderFilters((current) => ({ ...current, [name]: value }));
  }

  function updateOrderForm(name, value) {
    setOrderForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'type_commande' && value !== 'sur_place') next.id_table = '';
      return next;
    });
  }

  function addOrderLine() {
    const plat = orderPlats.find((item) => item.id_plat === Number(lineDraft.id_plat));
    const quantite = Number(lineDraft.quantite);

    if (!plat || !Number.isInteger(quantite) || quantite < 1) {
      setError('Choisis un plat disponible et une quantite positive.');
      return;
    }

    setError('');
    setOrderForm((current) => {
      const existing = current.lignes.find((line) => line.id_plat === plat.id_plat);

      if (existing) {
        return {
          ...current,
          lignes: current.lignes.map((line) =>
            line.id_plat === plat.id_plat
              ? {
                  ...line,
                  quantite: line.quantite + quantite,
                  commentaire: line.commentaire || lineDraft.commentaire
                }
              : line
          )
        };
      }

      return {
        ...current,
        lignes: [
          ...current.lignes,
          {
            id_plat: plat.id_plat,
            nom: plat.nom,
            categorie: plat.categorie,
            prix: Number(plat.prix),
            quantite,
            commentaire: lineDraft.commentaire.trim()
          }
        ]
      };
    });

    setLineDraft((current) => ({ ...current, quantite: 1, commentaire: '' }));
  }

  function changeOrderLineQuantity(idPlat, delta) {
    setOrderForm((current) => ({
      ...current,
      lignes: current.lignes
        .map((line) =>
          line.id_plat === idPlat
            ? {
                ...line,
                quantite: Math.max(0, line.quantite + delta)
              }
            : line
        )
        .filter((line) => line.quantite > 0)
    }));
  }

  async function submitOrderForm(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!orderForm.lignes.length) {
      setError('Ajoute au moins un plat a la commande.');
      return;
    }

    try {
      const saved = await createCommande({
        ...orderForm,
        lignes: orderForm.lignes.map((line) => ({
          id_plat: line.id_plat,
          quantite: line.quantite,
          commentaire: line.commentaire
        }))
      });

      setMessage(`Commande #${saved.commande.id_commande} creee.`);
      resetOrderForm();
      setSelectedCommande(saved);
      await loadCommandes();
      await loadStats();
      setView('commandes');
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function changeCommandeStatus(id, statut) {
    setError('');
    setMessage('');
    try {
      const updated = await updateCommandeStatut(id, statut);
      setMessage(`Commande #${id} mise a jour.`);
      setSelectedCommande(updated);
      await loadCommandes();
      await loadStats();
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function paySelectedCommande() {
    if (!selectedCommande) return;

    setError('');
    setMessage('');
    try {
      const updated = await createPaiement(selectedCommande.commande.id_commande, {
        mode_paiement: paymentMode,
        statut: 'valide',
        montant: selectedCommande.commande.total_commande
      });
      setSelectedCommande(updated);
      setMessage(`Commande #${updated.commande.id_commande} encaissee.`);
      await loadCommandes();
      await loadStats();
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  async function cancelSelectedCommande(id) {
    setError('');
    setMessage('');
    try {
      const updated = await cancelCommande(id);
      setSelectedCommande(updated);
      setMessage(`Commande #${id} annulee.`);
      await loadCommandes();
      await loadStats();
    } catch (apiError) {
      setError(apiError.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Utensils size={25} />
          </div>
          <div>
            <p className="eyebrow">Restaurant turc</p>
            <h1>Anatolia Sofrasi</h1>
          </div>
        </div>

        <div className="top-actions">
          <div className="view-tabs" role="tablist" aria-label="Navigation principale">
            <button className={view === 'commandes' ? 'active' : ''} onClick={() => setView('commandes')}>
              <ShoppingCart size={17} />
              <span>Commandes</span>
            </button>
            <button className={view === 'plats' ? 'active' : ''} onClick={() => setView('plats')}>
              <ClipboardList size={17} />
              <span>Carte</span>
            </button>
          </div>

          <div className={`db-status db-${health.status}`}>
            <Database size={17} />
            <span>{health.label}</span>
            <button className="icon-only" onClick={refreshHealth} title="Verifier la connexion MySQL">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {(error || message) && (
        <div className={error ? 'notice notice-error app-notice' : 'notice notice-success app-notice'}>
          {error || message}
        </div>
      )}

      {view === 'plats' ? (
        <main className="workspace">
          <section className="panel menu-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Carte</p>
                <h2>Plats</h2>
              </div>
              <Badge tone={loading ? 'warning' : 'neutral'}>{loading ? 'Chargement' : `${plats.length} lignes`}</Badge>
            </div>

            <div className="filters">
              <label className="searchbox">
                <Search size={18} />
                <input
                  value={dishFilters.search}
                  onChange={(event) => updateDishFilter('search', event.target.value)}
                  placeholder="Nom ou description"
                />
              </label>

              <select value={dishFilters.categorie} onChange={(event) => updateDishFilter('categorie', event.target.value)}>
                <option value="">Toutes les categories</option>
                {activeCategories.map((category) => (
                  <option key={category.id_categorie} value={category.id_categorie}>
                    {category.nom}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.5"
                value={dishFilters.minPrice}
                onChange={(event) => updateDishFilter('minPrice', event.target.value)}
                placeholder="Prix min"
              />

              <input
                type="number"
                min="0"
                step="0.5"
                value={dishFilters.maxPrice}
                onChange={(event) => updateDishFilter('maxPrice', event.target.value)}
                placeholder="Prix max"
              />

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={dishFilters.onlyAvailable}
                  onChange={(event) => updateDishFilter('onlyAvailable', event.target.checked)}
                />
                <span>Disponibles</span>
              </label>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plat</th>
                    <th>Categorie</th>
                    <th>Prix</th>
                    <th>Temps</th>
                    <th>Statut</th>
                    <th className="actions-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plats.map((plat) => (
                    <tr key={plat.id_plat} className={selectedPlatId === plat.id_plat ? 'selected-row' : ''}>
                      <td>
                        <button className="dish-link" onClick={() => selectPlat(plat.id_plat)}>
                          {plat.nom}
                        </button>
                        <span className="dish-note">{plat.niveau_piquant}</span>
                      </td>
                      <td>{plat.categorie}</td>
                      <td>{asMoney(plat.prix)}</td>
                      <td>{plat.temps_preparation_min} min</td>
                      <td>
                        <Badge tone={plat.disponible ? 'success' : 'danger'}>
                          {plat.disponible ? 'Actif' : 'Retire'}
                        </Badge>
                      </td>
                      <td className="actions-cell">
                        <button className="icon-only" onClick={() => editPlat(plat)} title="Modifier">
                          <Pencil size={16} />
                        </button>
                        <button className="icon-only danger" onClick={() => removePlat(plat)} title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!plats.length && !loading && (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        Aucun plat trouve
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="side-column">
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{dishForm.id_plat ? 'Modification' : 'Creation'}</p>
                  <h2>{dishForm.id_plat ? 'Plat selectionne' : 'Nouveau plat'}</h2>
                </div>
                {dishForm.id_plat && (
                  <button className="icon-only" onClick={resetDishForm} title="Annuler">
                    <X size={17} />
                  </button>
                )}
              </div>

              <form onSubmit={submitDishForm} className="dish-form">
                <label>
                  Nom
                  <input value={dishForm.nom} onChange={(event) => updateDishForm('nom', event.target.value)} required />
                </label>

                <label>
                  Categorie
                  <select
                    value={dishForm.id_categorie}
                    onChange={(event) => updateDishForm('id_categorie', event.target.value)}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id_categorie} value={category.id_categorie}>
                        {category.nom}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid">
                  <label>
                    Prix
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={dishForm.prix}
                      onChange={(event) => updateDishForm('prix', event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Minutes
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={dishForm.temps_preparation_min}
                      onChange={(event) => updateDishForm('temps_preparation_min', event.target.value)}
                      required
                    />
                  </label>
                </div>

                <label>
                  Piquant
                  <select
                    value={dishForm.niveau_piquant}
                    onChange={(event) => updateDishForm('niveau_piquant', event.target.value)}
                  >
                    <option value="aucun">Aucun</option>
                    <option value="doux">Doux</option>
                    <option value="moyen">Moyen</option>
                    <option value="fort">Fort</option>
                  </select>
                </label>

                <label>
                  Description
                  <textarea
                    value={dishForm.description}
                    onChange={(event) => updateDishForm('description', event.target.value)}
                    rows="3"
                  />
                </label>

                <div className="check-row">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={dishForm.vegetarien}
                      onChange={(event) => updateDishForm('vegetarien', event.target.checked)}
                    />
                    <span>Vegetarien</span>
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={dishForm.disponible}
                      onChange={(event) => updateDishForm('disponible', event.target.checked)}
                    />
                    <span>Disponible</span>
                  </label>
                </div>

                <IconButton icon={dishForm.id_plat ? Save : Plus} type="submit">
                  {dishForm.id_plat ? 'Enregistrer' : 'Ajouter'}
                </IconButton>
              </form>
            </section>

            <section className="panel detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Detail</p>
                  <h2>{selectedPlat?.plat?.nom || 'Aucun plat'}</h2>
                </div>
                <Info size={19} />
              </div>

              {selectedPlat ? (
                <div className="detail-content">
                  <p>{selectedPlat.plat.description || 'Description non renseignee.'}</p>
                  <div className="metric-row">
                    <span>{asMoney(selectedPlat.plat.prix)}</span>
                    <span>{selectedPlat.plat.temps_preparation_min} min</span>
                    <span>{selectedPlat.plat.categorie}</span>
                  </div>

                  <h3>Ingredients</h3>
                  <ul className="ingredients">
                    {selectedPlat.ingredients.map((ingredient) => (
                      <li key={ingredient.id_ingredient}>
                        <span>{ingredient.nom}</span>
                        <small>
                          {Number(ingredient.quantite)} {ingredient.unite}
                          {ingredient.allergene ? ' / allergene' : ''}
                        </small>
                      </li>
                    ))}
                  </ul>

                  <h3>Commandes recentes</h3>
                  <ul className="orders">
                    {selectedPlat.commandes.map((commande) => (
                      <li key={`${commande.id_commande}-${commande.date_commande}`}>
                        <span>#{commande.id_commande} - {commande.type_commande}</span>
                        <small>
                          {commande.quantite} x {asMoney(commande.prix_unitaire)} - {commande.statut}
                        </small>
                      </li>
                    ))}
                    {!selectedPlat.commandes.length && <li>Aucune commande</li>}
                  </ul>
                </div>
              ) : (
                <div className="empty-state">
                  <Clock3 size={25} />
                  <span>Selection vide</span>
                </div>
              )}
            </section>

            <StatsPanel stats={stats} asMoney={asMoney} />
          </aside>
        </main>
      ) : (
        <main className="workspace command-workspace">
          <div className="main-column">
            <section className="panel order-builder">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Caisse</p>
                  <h2>Passer une commande</h2>
                </div>
                <Badge tone={orderForm.lignes.length ? 'success' : 'neutral'}>
                  {orderForm.lignes.length} plat{orderForm.lignes.length > 1 ? 's' : ''}
                </Badge>
              </div>

              <form className="order-form" onSubmit={submitOrderForm}>
                <div className="order-meta-grid">
                  <label>
                    Type
                    <select
                      value={orderForm.type_commande}
                      onChange={(event) => updateOrderForm('type_commande', event.target.value)}
                    >
                      <option value="sur_place">Sur place</option>
                      <option value="a_emporter">A emporter</option>
                      <option value="livraison">Livraison</option>
                    </select>
                  </label>

                  <label>
                    Client
                    <select value={orderForm.id_client} onChange={(event) => updateOrderForm('id_client', event.target.value)}>
                      <option value="">Client non renseigne</option>
                      {clients.map((client) => (
                        <option key={client.id_client} value={client.id_client}>
                          {client.libelle}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Table
                    <select
                      value={orderForm.id_table}
                      onChange={(event) => updateOrderForm('id_table', event.target.value)}
                      disabled={orderForm.type_commande !== 'sur_place'}
                    >
                      <option value="">Aucune table</option>
                      {tables.map((table) => (
                        <option key={table.id_table} value={table.id_table}>
                          Table {table.numero} - {table.zone} - {table.capacite} places
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Employe
                    <select value={orderForm.id_employe} onChange={(event) => updateOrderForm('id_employe', event.target.value)}>
                      <option value="">Non affecte</option>
                      {employes.map((employe) => (
                        <option key={employe.id_employe} value={employe.id_employe}>
                          {employe.libelle}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="line-picker">
                  <label>
                    Plat
                    <select value={lineDraft.id_plat} onChange={(event) => setLineDraft((current) => ({ ...current, id_plat: event.target.value }))}>
                      {orderPlats.map((plat) => (
                        <option key={plat.id_plat} value={plat.id_plat}>
                          {plat.nom} - {asMoney(plat.prix)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Qte
                    <input
                      type="number"
                      min="1"
                      value={lineDraft.quantite}
                      onChange={(event) => setLineDraft((current) => ({ ...current, quantite: Number(event.target.value) }))}
                    />
                  </label>

                  <label>
                    Note cuisine
                    <input
                      value={lineDraft.commentaire}
                      onChange={(event) => setLineDraft((current) => ({ ...current, commentaire: event.target.value }))}
                      placeholder="Sans oignons, bien grille..."
                    />
                  </label>

                  <button className="button button-secondary" type="button" onClick={addOrderLine}>
                    <Plus size={17} />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="cart-list">
                  {orderForm.lignes.map((line) => (
                    <div className="cart-line" key={line.id_plat}>
                      <div>
                        <strong>{line.nom}</strong>
                        <small>
                          {line.categorie} - {asMoney(line.prix)}
                          {line.commentaire ? ` - ${line.commentaire}` : ''}
                        </small>
                      </div>
                      <div className="quantity-control">
                        <button type="button" onClick={() => changeOrderLineQuantity(line.id_plat, -1)} title="Retirer">
                          <Minus size={15} />
                        </button>
                        <span>{line.quantite}</span>
                        <button type="button" onClick={() => changeOrderLineQuantity(line.id_plat, 1)} title="Ajouter">
                          <Plus size={15} />
                        </button>
                      </div>
                      <strong>{asMoney(line.prix * line.quantite)}</strong>
                    </div>
                  ))}
                  {!orderForm.lignes.length && <div className="empty-cart">Aucun plat ajoute a la commande</div>}
                </div>

                <label>
                  Note commande
                  <textarea
                    value={orderForm.note}
                    onChange={(event) => updateOrderForm('note', event.target.value)}
                    rows="2"
                    placeholder="Information salle, livraison ou caisse"
                  />
                </label>

                <div className="order-submit-row">
                  <div>
                    <span>Total</span>
                    <strong>{asMoney(orderTotal)}</strong>
                  </div>
                  <IconButton icon={ShoppingCart} type="submit">
                    Valider la commande
                  </IconButton>
                </div>
              </form>
            </section>

            <section className="panel orders-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Suivi</p>
                  <h2>Commandes</h2>
                </div>
                <Badge tone={orderLoading ? 'warning' : 'neutral'}>{orderLoading ? 'Chargement' : `${commandes.length} lignes`}</Badge>
              </div>

              <div className="filters order-filters">
                <label className="searchbox">
                  <Search size={18} />
                  <input
                    value={orderFilters.search}
                    onChange={(event) => updateOrderFilter('search', event.target.value)}
                    placeholder="Numero, client ou plat"
                  />
                </label>

                <select value={orderFilters.statut} onChange={(event) => updateOrderFilter('statut', event.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="ouverte">Ouverte</option>
                  <option value="preparee">Preparee</option>
                  <option value="servie">Servie</option>
                  <option value="payee">Payee</option>
                  <option value="annulee">Annulee</option>
                </select>

                <select value={orderFilters.type} onChange={(event) => updateOrderFilter('type', event.target.value)}>
                  <option value="">Tous les types</option>
                  <option value="sur_place">Sur place</option>
                  <option value="a_emporter">A emporter</option>
                  <option value="livraison">Livraison</option>
                </select>
              </div>

              <div className="table-wrap orders-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Commande</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Statut</th>
                      <th className="actions-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.map((commande) => (
                      <tr key={commande.id_commande} className={selectedCommandeId === commande.id_commande ? 'selected-row' : ''}>
                        <td>
                          <button className="dish-link" onClick={() => selectCommande(commande.id_commande)}>
                            #{commande.id_commande}
                          </button>
                          <span className="dish-note">{formatDate(commande.date_commande)}</span>
                        </td>
                        <td>{commande.client || 'Client non renseigne'}</td>
                        <td>
                          {commande.type_commande}
                          {commande.numero_table ? <span className="dish-note">Table {commande.numero_table}</span> : null}
                        </td>
                        <td>{asMoney(commande.total_commande)}</td>
                        <td>
                          <Badge tone={statusTone(commande.statut)}>{commande.statut}</Badge>
                        </td>
                        <td className="actions-cell">
                          <button className="icon-only" onClick={() => selectCommande(commande.id_commande)} title="Voir">
                            <Eye size={16} />
                          </button>
                          <button className="icon-only danger" onClick={() => cancelSelectedCommande(commande.id_commande)} title="Annuler">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!commandes.length && !orderLoading && (
                      <tr>
                        <td colSpan="6" className="empty-cell">
                          Aucune commande trouvee
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="side-column">
            <section className="panel detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Detail commande</p>
                  <h2>{selectedCommande ? `Commande #${selectedCommande.commande.id_commande}` : 'Aucune commande'}</h2>
                </div>
                <ShoppingCart size={19} />
              </div>

              {selectedCommande ? (
                <div className="detail-content">
                  <div className="metric-row">
                    <span>{asMoney(selectedCommande.commande.total_commande)}</span>
                    <span>{selectedCommande.commande.nombre_articles} articles</span>
                    <span>{selectedCommande.commande.type_commande}</span>
                  </div>

                  <div className="status-editor">
                    <label>
                      Statut
                      <select
                        value={selectedCommande.commande.statut}
                        onChange={(event) => changeCommandeStatus(selectedCommande.commande.id_commande, event.target.value)}
                      >
                        <option value="ouverte">Ouverte</option>
                        <option value="preparee">Preparee</option>
                        <option value="servie">Servie</option>
                        <option value="payee">Payee</option>
                        <option value="annulee">Annulee</option>
                      </select>
                    </label>
                  </div>

                  <h3>Lignes</h3>
                  <ul className="orders">
                    {selectedCommande.lignes.map((line) => (
                      <li key={line.id_plat}>
                        <span>
                          {line.quantite} x {line.plat}
                        </span>
                        <small>{asMoney(line.total_ligne)}</small>
                      </li>
                    ))}
                  </ul>

                  <h3>Paiement</h3>
                  {selectedCommande.paiement ? (
                    <div className="payment-summary">
                      <CreditCard size={17} />
                      <span>
                        {asMoney(selectedCommande.paiement.montant)} - {selectedCommande.paiement.mode_paiement}
                      </span>
                      <Badge tone={statusTone(selectedCommande.paiement.statut)}>{selectedCommande.paiement.statut}</Badge>
                    </div>
                  ) : (
                    <div className="payment-form">
                      <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                        <option value="carte">Carte</option>
                        <option value="especes">Especes</option>
                        <option value="ticket_restaurant">Ticket restaurant</option>
                        <option value="en_ligne">En ligne</option>
                      </select>
                      <IconButton icon={CreditCard} type="button" onClick={paySelectedCommande}>
                        Encaisser
                      </IconButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <Clock3 size={25} />
                  <span>Selection vide</span>
                </div>
              )}
            </section>

            <section className="panel stats-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Activite</p>
                  <h2>Restaurant</h2>
                </div>
                <BarChart3 size={19} />
              </div>

              {stats && (
                <>
                  <div className="stats-grid">
                    <div>
                      <span>{stats.commandes?.nombre_commandes || 0}</span>
                      <small>Commandes</small>
                    </div>
                    <div>
                      <span>{stats.commandes?.commandes_en_cours || 0}</span>
                      <small>En cours</small>
                    </div>
                    <div>
                      <span>{asMoney(stats.commandes?.chiffre_affaires || 0)}</span>
                      <small>CA</small>
                    </div>
                  </div>

                  <ol className="ranking">
                    {stats.classement.map((item) => (
                      <li key={item.id_plat}>
                        <CheckCircle2 size={16} />
                        <span>{item.nom}</span>
                        <strong>{Number(item.quantite_vendue)}</strong>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          </aside>
        </main>
      )}
    </div>
  );
}

function StatsPanel({ stats, asMoney }) {
  return (
    <section className="panel stats-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Statistiques</p>
          <h2>Classement</h2>
        </div>
        <BarChart3 size={19} />
      </div>

      {stats && (
        <>
          <div className="stats-grid">
            <div>
              <span>{stats.global.nombre_plats}</span>
              <small>Plats</small>
            </div>
            <div>
              <span>{asMoney(stats.global.prix_moyen)}</span>
              <small>Prix moyen</small>
            </div>
            <div>
              <span>{stats.global.plats_disponibles}</span>
              <small>Actifs</small>
            </div>
          </div>

          <ol className="ranking">
            {stats.classement.map((item) => (
              <li key={item.id_plat}>
                <CheckCircle2 size={16} />
                <span>{item.nom}</span>
                <strong>{Number(item.quantite_vendue)}</strong>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
