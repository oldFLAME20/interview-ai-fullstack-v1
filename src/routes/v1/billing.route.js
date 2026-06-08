const express = require('express');
const passport = require('passport');
const requireTenant = require('../../middlewares/requireTenant');
const billingService = require('../../services/billingService');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

/**
 * GET /v1/billing/balance
 *
 * 使用 auth + requireTenant 中间件保护路由
 * 调用 billingService.getBalance(req.tenantId)
 * 返回 { tenantId: req.tenantId, balance: <number> }
 */
router.get(
  '/balance',
  auth,
  requireTenant,
  catchAsync(async (req, res) => {
    const balance = await billingService.getBalance(req.tenantId);
    res.send({ tenantId: req.tenantId, balance });
  })
);

module.exports = router;
