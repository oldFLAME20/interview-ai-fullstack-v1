# SELF-REVIEW

**候选人：** ___刘冠雄________
**提交时间：** ____20260608  _______
**仓库 URL：** ___https://github.com/oldFLAME20/interview-ai-fullstack-v1________

## 完成情况

勾选已完成的模块，未完成的简述卡在哪里：

- [x] A 多租户 Auth（requireTenant 中间件 + login.jsx）
- [x] B Redis 计费（Lua 原子扣费 + seed）
- [x] C BullMQ 队列（Job Schema + Worker 4 阶段 + MongoDB 状态）
- [x] D WebSocket（WS 鉴权 + 事件推送 + dashboard.jsx 进度条）
- [x] E Docker（frontend/Dockerfile + 四服务 healthcheck / depends_on / volumes）

未完成说明：

> （写不下去的原因，不要跳过）

---

## 四个问题（必答，不限字数，写真实经历）

### 1. 追问过程

```bash
 你现在是该项目的 Principal Engineer。

  目标：

  让项目最终达到：

  * npm install 成功
  * npm run lint 通过
  * npm run build 通过
  * npm run test 通过（如果存在）
  * docker compose up 成功（如果存在 Docker）
  * 项目可以正常启动

  工作规则：

  1. 先完整分析项目结构
  2. 找出所有阻塞运行的问题
  3. 不要只给建议
  4. 直接修改代码
  5. 每次修改后重新执行验证命令
  6. 如果发现新的错误，继续修复
  7. 不要因为发现一个错误就停止
  8. 持续迭代直到项目成功运行或遇到无法解决的外部依赖

  重点检查：

  * Dockerfile
  * docker-compose.yml
  * package.json
  * pnpm-lock.yaml
  * TypeScript配置
  * 环境变量
  * 数据库配置
  * API配置
  * 构建脚本

  输出格式：

  ## 问题1

  原因：
  修改：

  ## 问题2

  原因：
  修改：

  最后输出：

  ## 最终结果

  * 已修改文件
  * 修改内容
  * 剩余问题
  * 当前运行状态

  现在开始执行，不要询问确认。
  
  ___________________
  以上是我的prompt，我原本是想要claude去审视我另外一个claude写的代码，但是在npm install时由于版本node版本问题卡了很久，
  然后claude就一直在进行重试，我让claude修改，最后还是手动执行得命令启动docker，我觉得对于一些耗时长的命令还行需要人工介入
  
```



> 贴出你认为最有价值的一轮 AI 对话——你最初问了什么，AI 哪里回答得不够或有误，你怎么追问的，最终得到了什么结论？

（粘贴原始 prompt + 你的判断，不要转述）

---

### 2. 卡住的地方

```bash
 在代码审查这部分我卡了比较久，花了大改十来二十分钟，问题出在npm install这些部分
  本来就是耗时的操作，我看到了，node版本需要22，我当前版本只有20和18，所以我赶紧停止对话，让他用fnm工具下载22的版本，
  观测到claude npm这部分执行比较慢 ，我直接新开的一个窗口手动执行完成，包括 docker compose up -d 
```



> 你卡得最久的地方是什么？花了多长时间？期间走过哪些死路，最后怎么解开的？

（具体到报错信息或行为现象，不要只写"debug了很久"）

---

### 3. 架构延伸

> 现在 eventBus 是进程内通信，如果 backend 横向扩展到 3 个实例，WS 进度推送会在哪里失效？你会怎么改？

现在会失效在 worker 发进度事件到 WebSocket 的这段链路， EventEmitter 只能进程内通信，横向扩展后 worker 和 WS 连接可能不在同一个实例；改法是用 Redis/BullMQ 这种共享消息通道做进度广播，MongoDB 保存最终状态，WS 只负责转发给当前实例上的客户端。

（写你自己的判断，不需要实现，但要说清楚失效原因和改法）





---

### 4. 回头看

> 做完之后，你觉得这个设计里哪个决策值得质疑？如果让你重来，你会改什么？

我觉得最值得质疑的是 **把 worker 和 WebSocket 实时推送耦合在一个进程内 eventBus 上**。这个设计在单机 demo 里很简单，但它隐含了一个假设：任务执行者和 WS 连接一定在同一个 Node 进程里。只要后面做横向扩展、拆 worker、重启实例，进度事件就可能丢。这个问题不是业务逻辑问题，而是架构边界没有划清楚。

如果让我重来，我会改成：

1. worker 只负责执行任务和写状态 
2. MongoDB 保存任务最终状态 
3. Redis/BullMQ 负责进度事件分发 
4. WebSocket 服务只负责鉴权、订阅和转发

（可以质疑题目设计本身）

---

## Claude Code 使用证据

贴出你认为最关键的 3 条 prompt 原文（不是描述，是原文）：

**Prompt 1：**
```
你阅读一下我们当前项目下的readme.md文档，整理一下当前的任务（粘贴）
```

**Prompt 2：**

```
我目前手动启动了docker ， docker compose up -d --build，然后前端提交任务 → 实时看到 preprocess → transform → build →
  package 进度条都有显示，你最后审视一下代码，这几个约束是否符合，tenantId 必须从 JWT claim 读取，禁止从 body/header
  取值
  Redis 扣费必须使用 Lua 脚本（禁止 GET-then-SET）
  WebSocket token 通过 query 传递：/ws/job/:id?token=<jwt>
  容器间通讯使用服务名（禁止 localhost）；浏览器访问 backend 用 localhost:3000
  至少 4 个 feature 分支，语义化 commi
```

**Prompt 3：**
```
你现在是该项目的 Principal Engineer。

  目标：

  让项目最终达到：

  * npm install 成功
  * npm run lint 通过
  * npm run build 通过
  * npm run test 通过（如果存在）
  * docker compose up 成功（如果存在 Docker）
  * 项目可以正常启动

  工作规则：

  1. 先完整分析项目结构
  2. 找出所有阻塞运行的问题
  3. 不要只给建议
  4. 直接修改代码
  5. 每次修改后重新执行验证命令
  6. 如果发现新的错误，继续修复
  7. 不要因为发现一个错误就停止
  8. 持续迭代直到项目成功运行或遇到无法解决的外部依赖

  重点检查：

  * Dockerfile
  * docker-compose.yml
  * package.json
  * pnpm-lock.yaml
  * TypeScript配置
  * 环境变量
  * 数据库配置
  * API配置
  * 构建脚本

  输出格式：

  ## 问题1

  原因：
  修改：

  ## 问题2

  原因：
  修改：

  最后输出：

  ## 最终结果

  * 已修改文件
  * 修改内容
  * 剩余问题
  * 当前运行状态

  现在开始执行，不要询问确认。
```

---

## 已知 Bug / 未处理边界

- 
- 
