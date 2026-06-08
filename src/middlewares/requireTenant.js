const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Middleware: extract tenantId from JWT claim and attach to req.tenantId
 *
 * 从 req.user.tenantId 读取 tenantId（JWT 已由 Passport 验证，req.user 由 jwtStrategy 填充）
 * 若 tenantId 缺失，返回 401；否则设置 req.tenantId = req.user.tenantId
 *
 * ⚠️ 禁止从 req.body / req.query / req.headers['x-tenant-id'] 取值
 */
const requireTenant = (req, res, next) => {
  const tenantId = req.user && req.user.tenantId;
  if (!tenantId) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Tenant required'));
  }
  req.tenantId = tenantId;
  next();
};

module.exports = requireTenant;
