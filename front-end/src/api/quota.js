/**
 * Quota API Module
 * 
 * Handles user rate limit quota API calls.
 * 
 * @module api/quota
 */

import { get } from './client';
import { QUOTA } from './endpoints';

/**
 * Get user's current quota status (usage and limits).
 * 
 * @returns {Promise<{status: string, user_id: string, quota: Object}>}
 */
export async function getQuotaStatus() {
  return get(QUOTA.STATUS);
}

export default {
  getQuotaStatus,
};
