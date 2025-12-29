/**
 * Auth API Module
 * 
 * Handles authentication-related API calls:
 * - Firebase configuration
 * - Session management
 * - Logout
 * 
 * @module api/auth
 */

import { get, post } from './client';
import { AUTH } from './endpoints';

/**
 * Fetch Firebase configuration from backend.
 * 
 * @returns {Promise<Object>} Firebase config object
 */
export async function getFirebaseConfig() {
  return get(AUTH.FIREBASE_CONFIG);
}

/**
 * Create a server session with Firebase ID token.
 * 
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} Session response
 */
export async function setSession(idToken) {
  return post(AUTH.SET_SESSION, { idToken });
}

/**
 * Check if user has an active server session.
 * 
 * @returns {Promise<Object>} Session status
 */
export async function checkSession() {
  return get(AUTH.CHECK_SESSION);
}

/**
 * Logout and destroy server session.
 * 
 * @returns {Promise<Object>} Logout response
 */
export async function logout() {
  return post(AUTH.LOGOUT);
}

export default {
  getFirebaseConfig,
  setSession,
  checkSession,
  logout,
};
