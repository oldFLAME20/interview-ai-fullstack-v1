const { URL } = require('url');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const eventBus = require('./eventBus');
const Job = require('../models/job.model');

/**
 * Attach WebSocket server to an existing HTTP server
 *
 * URL 格式：ws://host/ws/job/:jobId?token=<jwt>
 *
 * 1. 解析 request.url，提取 jobId 和 token query 参数
 * 2. 用 jwt.verify(token, config.jwt.secret) 验证 token
 * 3. 查询 MongoDB 确认 job.tenantId === tokenPayload.tenantId（租户隔离）
 * 4. 验证失败则 ws.close(4001, 'Unauthorized')
 * 5. 验证成功则监听 eventBus 上的 `job:${jobId}` 事件
 * 6. 收到 progress === 100 的事件后，延迟 500ms 关闭连接
 * 7. 客户端断开时移除 eventBus 监听器（防止内存泄漏）
 *
 * @param {http.Server} server - Express HTTP server instance
 * @returns {WebSocket.Server}
 */
const attachWsServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    let eventHandler = null;
    let closeTimer = null;
    let jobId = null;

    try {
      // 1. 解析 URL：提取 jobId 和 token
      // req.url 格式：/ws/job/:jobId?token=<jwt>
      const urlMatch = req.url && req.url.match(/^\/ws\/job\/([^?]+)/);
      if (!urlMatch) {
        ws.close(4001, 'Invalid path');
        return;
      }
      [, jobId] = urlMatch;

      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = urlObj.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Token required');
        return;
      }

      // 2. 验证 JWT
      let payload;
      try {
        payload = jwt.verify(token, config.jwt.secret);
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }

      if (!payload.tenantId) {
        ws.close(4001, 'Tenant required in token');
        return;
      }

      // 3. 租户隔离：确认 job 属于该租户
      const jobDoc = await Job.findOne({ jobId, tenantId: payload.tenantId });
      if (!jobDoc) {
        ws.close(4001, 'Job not found or not authorized');
        return;
      }

      // 4. 认证通过，监听 eventBus 事件并推送给客户端
      eventHandler = (event) => {
        try {
          ws.send(JSON.stringify(event));
        } catch {
          // 发送失败（客户端可能已断开），忽略
        }

        // 5. 进度 100% 时延迟关闭连接
        if (event.progress === 100) {
          closeTimer = setTimeout(() => {
            try {
              ws.close(1000, 'Job completed');
            } catch {
              // ignore
            }
          }, 500);
        }
      };

      eventBus.on(`job:${jobId}`, eventHandler);
    } catch {
      ws.close(4001, 'Unauthorized');
    }

    // 6. 客户端断开时清理
    ws.on('close', () => {
      if (eventHandler) {
        eventBus.off(`job:${jobId}`, eventHandler);
      }
      if (closeTimer) {
        clearTimeout(closeTimer);
      }
    });

    ws.on('error', () => {
      if (eventHandler) {
        eventBus.off(`job:${jobId}`, eventHandler);
      }
      if (closeTimer) {
        clearTimeout(closeTimer);
      }
    });
  });

  return wss;
};

module.exports = { attachWsServer };
