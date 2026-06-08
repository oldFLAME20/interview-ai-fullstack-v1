const { getClient } = require('../lib/redisClient');

const COST_PER_JOB = 10;

const DEDUCT_LUA = `
  local bal = tonumber(redis.call('GET', KEYS[1]) or 0)
  if bal < tonumber(ARGV[1]) then return -1 end
  return redis.call('DECRBY', KEYS[1], ARGV[1])
`;

/**
 * Atomically deduct points from tenant balance using Lua script
 *
 * Redis key 格式：`billing:${tenantId}`
 * 使用 Lua 脚本保证原子性（禁止 GET-then-SET）
 *
 * @param {string} tenantId
 * @param {number} points - default COST_PER_JOB (10)
 * @returns {Promise<{ok: boolean, balance?: number, reason?: string}>}
 */
const deduct = async (tenantId, points = COST_PER_JOB) => {
  const redis = getClient();
  const key = `billing:${tenantId}`;
  const result = await redis.eval(DEDUCT_LUA, 1, key, points);
  if (result === -1) {
    return { ok: false, reason: 'INSUFFICIENT' };
  }
  return { ok: true, balance: result };
};

/**
 * Get current balance for a tenant
 *
 * @param {string} tenantId
 * @returns {Promise<number>}
 */
const getBalance = async (tenantId) => {
  const redis = getClient();
  const key = `billing:${tenantId}`;
  const val = await redis.get(key);
  return Number(val) || 0;
};

/**
 * Idempotently seed initial balances from tenants map
 * Only sets key if it does NOT already exist (SET NX)
 *
 * @param {Object} tenants - { "tenant-001": 100, ... }
 */
const seed = async (tenants) => {
  const redis = getClient();
  await Promise.all(Object.entries(tenants).map(([tenantId, balance]) => redis.set(`billing:${tenantId}`, balance, 'NX')));
};

module.exports = { deduct, getBalance, seed, COST_PER_JOB };
