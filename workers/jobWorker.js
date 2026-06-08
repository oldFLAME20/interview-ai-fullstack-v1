const { Worker } = require('bullmq');
const config = require('../src/config/config');
const eventBus = require('../src/lib/eventBus');
const Job = require('../src/models/job.model');

const PHASES = ['preprocess', 'transform', 'build', 'package'];
const PHASE_DELAY_MS = 3000;

/**
 * 模拟异步延迟
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * BullMQ Worker: 处理 job-pipeline 队列中的任务
 *
 * 每个 job 按序执行 PHASES 中的 4 个阶段，每阶段：
 * 1. 等待 PHASE_DELAY_MS 毫秒（模拟处理耗时）
 * 2. 更新 MongoDB Job.phases
 * 3. 通过 eventBus 发送进度事件
 * 4. 全部阶段完成后更新 Job.status = 'completed'
 * 5. 发生错误时更新 Job.status = 'failed'
 */
const processJob = async (job) => {
  const { jobId } = job.data;

  await Job.updateOne({ jobId }, { status: 'processing' });

  try {
    await PHASES.reduce(async (prev, phaseName, index) => {
      await prev;

      await delay(PHASE_DELAY_MS);

      const now = new Date();
      await Job.updateOne(
        { jobId },
        {
          $set: {
            [`phases.${index}.status`]: 'completed',
            [`phases.${index}.completedAt`]: now,
          },
        }
      );

      const progress = Math.round(((index + 1) / PHASES.length) * 100);
      eventBus.emit(`job:${jobId}`, {
        jobId,
        phase: phaseName,
        status: 'completed',
        progress,
        log: `Phase ${phaseName} completed`,
      });
    }, Promise.resolve());

    await Job.updateOne({ jobId }, { status: 'completed', completedAt: new Date() });
    eventBus.emit(`job:${jobId}`, {
      jobId,
      phase: 'all',
      status: 'completed',
      progress: 100,
      log: 'Job completed successfully',
    });
  } catch (error) {
    await Job.updateOne({ jobId }, { status: 'failed' });
    eventBus.emit(`job:${jobId}`, {
      jobId,
      phase: 'error',
      status: 'failed',
      progress: 0,
      log: `Job failed: ${error.message}`,
    });
    throw error;
  }
};

/**
 * 启动 BullMQ Worker
 * 在 src/index.js 中调用 startWorker()
 */
const startWorker = () => {
  const worker = new Worker('job-pipeline', processJob, {
    connection: { url: config.redis.url },
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`Job ${job && job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = { startWorker, PHASES };
