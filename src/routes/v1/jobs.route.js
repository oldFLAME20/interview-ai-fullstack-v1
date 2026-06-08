const express = require('express');
const passport = require('passport');
const httpStatus = require('http-status');
const validate = require('../../middlewares/validate');
const requireTenant = require('../../middlewares/requireTenant');
const jobValidation = require('../../validations/job.validation');
const jobService = require('../../services/jobService');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

/**
 * POST /v1/jobs
 *
 * 使用 auth + requireTenant 保护路由
 * 调用 jobService.submit(req.tenantId, req.body.payload)
 * 余额不足时 jobService 抛出 ApiError(402)
 * 成功返回 201 { jobId }
 */
router.post(
  '/',
  auth,
  requireTenant,
  validate(jobValidation.submitJob),
  catchAsync(async (req, res) => {
    const result = await jobService.submit(req.tenantId, req.body.payload);
    res.status(httpStatus.CREATED).send(result);
  })
);

/**
 * GET /v1/jobs/:id
 *
 * 调用 jobService.getJob(req.params.id, req.tenantId)，返回 Job 文档
 */
router.get(
  '/:id',
  auth,
  requireTenant,
  catchAsync(async (req, res) => {
    const job = await jobService.getJob(req.params.id, req.tenantId);
    if (!job) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Job not found');
    }
    res.send(job);
  })
);

module.exports = router;
