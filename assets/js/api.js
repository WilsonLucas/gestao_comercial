const API = (() => {
  const BASE = '/api';
  const getToken = () => localStorage.getItem('sgc_token');
  const headers = () => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  });

  const handleResponse = async (res) => {
    if (res.status === 401) {
      localStorage.removeItem('sgc_token');
      localStorage.removeItem('sgc_usuario');
      window.location.href = 'login.html';
      return;
    }
    if (!res.ok) throw await res.json();
    if (res.status === 204) return null;
    return res.json();
  };

  return {
    get:    (path)       => fetch(`${BASE}${path}`, { headers: headers() }).then(handleResponse),
    post:   (path, body) => fetch(`${BASE}${path}`, { method: 'POST',   headers: headers(), body: JSON.stringify(body) }).then(handleResponse),
    put:    (path, body) => fetch(`${BASE}${path}`, { method: 'PUT',    headers: headers(), body: JSON.stringify(body) }).then(handleResponse),
    delete: (path)       => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handleResponse),
  };
})();
