// Decode JWT token (without external libraries)
export function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
}

// Check if token is expired
export function isTokenExpired() {
  const token = localStorage.getItem("token");
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  return Date.now() >= decoded.exp * 1000; // exp is in seconds
}

// Save token and expiry
export function saveAuthData(token) {
  localStorage.setItem("token", token);

  const decoded = decodeToken(token);
  if (decoded?.exp) {
    localStorage.setItem("expiry", decoded.exp * 1000);
  }
}

// Get token
export function getToken() {
  return localStorage.getItem("token");
}

// Logout
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("expiry");
  localStorage.removeItem("isAuthenticated"); // if you’re using this
}
