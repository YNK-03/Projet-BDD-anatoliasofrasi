export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Erreur HTTP ${response.status}`);
  }

  return data;
}

export function getHealth() {
  return request('/health');
}

export function getCategories() {
  return request('/categories');
}

export function getPlats(filters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters || {})) {
    if (value !== '' && value !== false && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return request(`/plats${query ? `?${query}` : ''}`);
}

export function getPlat(id) {
  return request(`/plats/${id}`);
}

export function createPlat(payload) {
  return request('/plats', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updatePlat(id, payload) {
  return request(`/plats/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deletePlat(id) {
  return request(`/plats/${id}`, {
    method: 'DELETE'
  });
}

export function getStats() {
  return request('/stats');
}

export function getReferences() {
  return request('/references');
}

export function getCommandes(filters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters || {})) {
    if (value !== '' && value !== false && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return request(`/commandes${query ? `?${query}` : ''}`);
}

export function getCommande(id) {
  return request(`/commandes/${id}`);
}

export function createCommande(payload) {
  return request('/commandes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCommandeStatut(id, statut) {
  return request(`/commandes/${id}/statut`, {
    method: 'PATCH',
    body: JSON.stringify({ statut })
  });
}

export function createPaiement(id, payload) {
  return request(`/commandes/${id}/paiement`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function cancelCommande(id) {
  return request(`/commandes/${id}`, {
    method: 'DELETE'
  });
}
