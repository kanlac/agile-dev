# dev-cycle 插件开发计划

## 1. 插件概述

**插件名称：** `dev-cycle`

**功能描述：** 建立一个自动化的开发-验收反馈循环系统，通过两个 subagent（developer 和 evaluator）不断迭代，直到满足需求文档中定义的验收标准。

**核心价值：**
- 自动化迭代开发流程
- 确保需求和验收标准清晰明确
- 通过持续反馈提升交付质量
- 完整的工作记录可追溯

---

## 2. 架构设计

```
用户
  │
  ├─> /task-init (创建任务 + 撰写需求)
  │       ↓
  │   requirement.md
  │
  └─> /task-run (启动反馈循环)
          │
          ├─> developer subagent
          │       ↓
          │   工作报告 (yyMMddHHmm-work-report-{model}.md)
          │       ↓
          ├─> evaluator subagent
          │       ↓
          │   验收报告 (yyMMddHHmm-eval-report-{model}.md)
          │       ↓
          └─> 判断验收结果
                  ├─> 通过 → 结束
                  └─> 未通过 → 重新启动 developer (最多20轮)
```

---

## 3. 组件详细设计

### 3.1 Slash Command: `/task-init`

**命令格式：**
```bash
/task-init <task-name>
```

**功能：**
1. 接收任务名称，创建目录 `docs/{task-name}/`
2. 在目录下创建 `requirement.md` 文件
3. 通过交互式对话收集需求信息：
   - 功能描述
   - 技术栈
   - 待澄清问题
   - **验收标准（必填）**：如何判断任务完成
4. 支持多轮交互，逐步完善需求文档

**YAML Frontmatter：**
```yaml
---
name: task-init
description: Create a new task directory and write requirement document
arguments:
  - name: task-name
    description: Name of the task/feature to implement
    required: true
---
```

**关键交互点：**
- 询问验收方式（Playwright 测试？API 测试？手动验证步骤？）
- 确认技术栈和依赖
- 明确功能边界

**输出：**
生成 `docs/{task-name}/requirement.md` 文件，包含：
- 任务名称和概述
- 功能描述
- 技术栈信息
- 验收标准（必填）
- 交互过程中收集的需求细节

---

### 3.2 Slash Command: `/task-run`

**命令格式：**
```bash
/task-run <task-name>
```

**功能：**
主调度器，负责启动 developer 和 evaluator 的反馈循环。

**执行流程：**

```javascript
1. 读取 docs/{task-name}/requirement.md
2. 初始化循环计数器 (max: 20)
3. 循环开始:
   a. 启动 developer subagent
      - 输入：requirement.md + (如有)最新验收报告
      - 等待 developer 完成并生成工作报告
   b. 读取工作报告
   c. 启动 evaluator subagent
      - 输入：requirement.md + 最新工作报告
      - 等待 evaluator 完成并生成验收报告
   d. 读取验收报告
   e. 判断验收结果：
      - 如果通过 → 输出成功信息，结束
      - 如果未通过 → 继续下一轮循环
      - 如果达到最大轮数 → 输出警告，结束
```

**YAML Frontmatter：**
```yaml
---
name: task-run
description: Start the dev-eval feedback loop for a task
arguments:
  - name: task-name
    description: Name of the task to run
    required: true
---
```

**配置项：**
```javascript
const MAX_ITERATIONS = 20; // 在命令文件顶部定义，方便修改
```

**输出：**
- 每轮循环的进度信息
- 最终结果（通过/超时）
- 总迭代次数

---

### 3.3 Subagent: developer

**Frontmatter 配置：**
```yaml
---
name: developer
description: Execute development tasks based on requirements and feedback
model: sonnet
color: blue
---
```

**System Prompt 要点：**

```markdown
你是 dev-cycle 的开发 agent。你的职责是：

1. 仔细阅读需求文档（requirement.md）
2. 如果这是第N轮迭代（N>1），优先阅读上一轮的验收报告，关注：
   - 哪些功能未完成
   - 哪些测试失败
   - 需要修复的问题
3. 执行开发工作（编码、测试、调试）
4. 完成后，**必须**生成工作报告

工作报告格式：
- 文件名：yyMMddHHmm-work-report-{model-name}.md
- 内容包括：
  - 本轮完成的工作
  - 修复的问题
  - 新增的功能
  - 遇到的困难
  - 下一步建议（如有）

重要原则：
- 专注于完成需求，不过度设计
- 编写可验证的代码
- 如果遇到阻塞问题，在报告中说明
```

**触发条件（When to use）：**
- 由 `/task-run` 命令调用
- 不应被用户直接调用

**工具访问：**
- All tools （需要完整的开发能力）

**输出文件格式：**
```
{task-dir}/202501101530-work-report-sonnet.md
```

---

### 3.4 Subagent: evaluator

**Frontmatter 配置：**
```yaml
---
name: evaluator
description: Evaluate development work against requirements and run tests
model: sonnet
color: green
---
```

**System Prompt 要点：**

```markdown
你是 dev-cycle 的验收 agent。你的职责是：

1. 阅读需求文档（requirement.md），特别关注**验收标准**部分
2. 阅读最新的工作报告，了解本轮完成的工作
3. 执行验收测试：
   - 如果验收标准是 Playwright 测试：使用 Playwright MCP 执行
   - 如果是 API 测试：执行测试命令或手动调用
   - 如果是单元测试：运行测试套件
4. 生成验收报告

验收原则：
- **只验收，不开发**：不修改代码，不写新功能
- 测试失败即停止：无需继续后续验收
- 客观记录：准确描述通过/失败的项目

验收报告格式：
- 文件名：yyMMddHHmm-eval-report-{model-name}.md
- 内容结构：

  ## 验收结果
  - 状态：✅ 通过 / ❌ 未通过

  ## 验收明细
  - [x] 功能1：描述
  - [ ] 功能2：失败原因

  ## 下一步行动（仅未通过时）
  - 需要修复的问题列表
  - 优先级建议
```

**触发条件（When to use）：**
- 由 `/task-run` 命令调用，在 developer 完成后
- 不应被用户直接调用

**工具访问：**
- All tools （需要运行测试和验证）

**输出文件格式：**
```
{task-dir}/202501101545-eval-report-sonnet.md
```

---

## 4. 文件结构

### 4.1 插件目录结构

```
.claude/plugins/dev-cycle/
├── plugin.json                 # 插件配置
├── commands/
│   ├── task-init.md           # 初始化任务命令
│   └── task-run.md            # 运行循环命令
├── agents/
│   ├── developer.md           # 开发 agent
│   └── evaluator.md           # 验收 agent
└── README.md                  # 插件说明文档
```

### 4.2 任务工作目录结构

```
docs/{task-name}/
├── requirement.md                          # 需求文档
├── 202501101430-work-report-sonnet.md     # 第1轮工作报告
├── 202501101445-eval-report-sonnet.md     # 第1轮验收报告
├── 202501101500-work-report-sonnet.md     # 第2轮工作报告
├── 202501101515-eval-report-sonnet.md     # 第2轮验收报告
└── ...
```

---

## 5. 配置项

### 5.1 plugin.json

```json
{
  "name": "dev-cycle",
  "version": "1.0.0",
  "description": "Automated development-evaluation feedback loop system",
  "commands": {
    "autoDiscover": true
  },
  "agents": {
    "autoDiscover": true
  }
}
```

### 5.2 可调参数

在 `/task-run` 命令文件中定义：

```javascript
// 配置区域（方便修改）
const MAX_ITERATIONS = 20;              // 最大循环次数
const TASK_BASE_DIR = 'docs';           // 任务目录根路径
const DEFAULT_MODEL = 'sonnet';         // 默认模型
```

---

## 6. 实现步骤

### Phase 1: 基础架构（优先级：高）
- [ ] 创建插件目录结构
- [ ] 编写 plugin.json
- [ ] 编写 README.md

### Phase 2: 需求收集命令（优先级：高）
- [ ] 实现 `/task-init` 命令
  - [ ] 目录创建逻辑
  - [ ] 交互式需求收集
  - [ ] requirement.md 模板生成
  - [ ] 验收标准必填验证

### Phase 3: Developer Agent（优先级：高）
- [ ] 创建 developer agent
  - [ ] System prompt 编写
  - [ ] 工作报告生成逻辑
  - [ ] 文件命名规范实现

### Phase 4: Evaluator Agent（优先级：高）
- [ ] 创建 evaluator agent
  - [ ] System prompt 编写
  - [ ] 测试执行逻辑
  - [ ] 验收报告生成逻辑
  - [ ] 结果判断标准

### Phase 5: 主循环调度（优先级：高）
- [ ] 实现 `/task-run` 命令
  - [ ] 读取需求文档
  - [ ] Developer subagent 调用
  - [ ] Evaluator subagent 调用
  - [ ] 循环控制逻辑
  - [ ] 结果判断和反馈
  - [ ] 最大轮数限制

### Phase 6: 测试和优化（优先级：中）
- [ ] 端到端测试
- [ ] 错误处理优化
- [ ] 用户体验改进
- [ ] 文档完善

---

## 7. 关键技术点

### 7.1 文件命名时间戳

```javascript
// 生成格式：yyMMddHHmm
const timestamp = new Date().toISOString()
  .replace(/[-:T]/g, '')
  .slice(2, 12); // 提取 yyMMddHHmm

// 示例：202501101530
```

### 7.2 报告解析

evaluator 的验收报告需要包含明确的状态标识，便于主循环解析：

```markdown
## 验收结果
状态：✅ 通过

或

## 验收结果
状态：❌ 未通过
```

主循环通过正则匹配 `状态：✅ 通过` 来判断是否通过。

### 7.3 Agent 间的信息传递

- Developer 读取：`requirement.md` + 上一轮的 `eval-report`
- Evaluator 读取：`requirement.md` + 最新的 `work-report`

主循环负责将正确的文件路径传递给 subagent。

---

## 8. 注意事项

### 8.1 避免无限循环
- 设置 MAX_ITERATIONS = 20
- 每轮循环输出进度信息
- 达到上限时明确提示用户

### 8.2 需求文档质量
- task-init 必须强制要求填写验收标准
- 验收标准必须可执行（有明确的测试步骤）
- 建议提供模板示例

### 8.3 报告可读性
- 使用统一的 Markdown 格式
- 文件名包含时间戳和模型名称，便于追溯
- 验收报告的状态标识必须清晰

### 8.4 错误处理
- subagent 执行失败时的处理
- 文件读写权限问题
- 任务目录已存在的情况

### 8.5 用户体验
- 每轮循环显示进度（第N/20轮）
- 最终总结：总共迭代次数、是否通过
- 提供查看历史报告的便捷方式

---

## 9. 未来扩展

### 9.1 多模型支持
- 允许 developer 和 evaluator 使用不同模型
- 支持用户在命令中指定模型

### 9.2 并行任务
- 支持同时运行多个任务
- 任务队列管理

### 9.3 报告可视化
- 生成 HTML 格式的进度报告
- 任务面板（显示所有任务状态）

### 9.4 中断和恢复
- 支持中途暂停循环
- 从断点继续执行

---

## 10. 验收标准（本开发计划的验收）

1. ✅ `/task-init` 能成功创建任务目录和需求文档
2. ✅ 需求文档包含完整的验收标准部分
3. ✅ `/task-run` 能启动 developer 和 evaluator 循环
4. ✅ developer 能生成符合格式的工作报告
5. ✅ evaluator 能执行测试并生成验收报告
6. ✅ 主循环能正确判断验收结果（通过/未通过）
7. ✅ 达到 20 轮上限时能正确终止
8. ✅ 所有报告文件命名符合规范
9. ✅ 整个流程端到端可用

---

**文档版本：** v1.0
**创建日期：** 2026-01-10
**最后更新：** 2026-01-10
