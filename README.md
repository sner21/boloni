# 博洛尼全屋定制供应链协同系统

线上地址：[https://boloni-azure.vercel.app/](https://boloni-azure.vercel.app/)

## 关键启动和部署命令

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run seed  
npm run dev
```

### Docker 启动

```powershell
docker compose up --build
```

如需通过命令行初始化演示数据：

```powershell
docker compose --profile seed up seed
```

### 常用命令速查

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务 |
| `npm run db:migrate` | 执行 SQL 迁移 |
| `npm run db:push` | 使用 Drizzle Kit 推送 schema |
| `npm run seed` | 初始化博洛尼演示数据 |
| `npm run lint` | 执行类型检查和代码结构检查 |
| `npm run test` | 运行 Vitest 单元测试 |
| `docker compose up --build` | 使用 Docker 启动完整环境 |
| `docker compose --profile seed up seed` | 使用 Docker 初始化演示数据 |
| `npx vercel --prod` | 部署到 Vercel 生产环境 |

## 技术栈说明

| 技术或能力 | 项目落地 |
| --- | --- |
| Next.js + React | 使用 App Router 构建单页业务工作台和 API Route Handler |
| TypeScript | 约束前后端数据结构、字段类型、公式 AST 和 API 输入输出 |
| PostgreSQL | 持久化动态表、字段、记录、单元格值和跨表关联 |
| Drizzle ORM / Drizzle Kit | 管理 PostgreSQL schema、类型推导和数据库迁移 |
| Zod | 校验请求体、字段配置、公式 AST、AI 请求和 AI 响应 |
| Scalar + OpenAPI | 自动提供接口文档，便于面试演示和接口调试 |
| Docker / Docker Compose | 固化 Node、PostgreSQL、迁移和 Web 服务启动流程 |
| Vercel | 托管线上演示环境 |
| Vitest | 覆盖公式计算和 Zod schema 等关键逻辑测试 |

## PDF 核心难点与源码路径

- 关联（Link to another record）- 核心难点，需实现表与表之间的关联。
  - 数据结构：`src/lib/db/schema.ts` 中的 `fieldType` 包含 `link`，`links` 定义了独立的 `record_links` 关联表。
  - 字段校验：`src/lib/schemas/base.ts` 中的 `fieldConfigSchema` 支持 `targetTableId`，`src/lib/base/records.ts` 中的 `validateField` 会校验关联字段必须配置目标表。
  - 关联写入与读取：`src/lib/base/records.ts` 中的 `saveLinks` 负责保存关联记录，`buildRecords` 和 `loadTitles` 负责把关联 ID 转为前端展示数据。
  - 前端交互：`src/components/base/LinkCell.tsx` 负责渲染关联记录选择器，`src/components/base/DynamicGrid.tsx` 在表格中按 `link` 类型挂载关联编辑器。

- 公式（Formula）- 核心难点，需实现基础的公式计算（如 `SUM`、`MULTIPLY`）。
  - 公式 AST 与配置校验：`src/lib/schemas/base.ts` 中的 `formulaOpSchema`、`formulaNodeSchema` 和 `fieldConfigSchema` 定义公式白名单和配置结构。
  - 公式计算引擎：`src/lib/base/formula.ts` 中的 `evalFormula` 实现 `SUM`、`MULTIPLY`、`DIVIDE`、`SUBTRACT` 和 `CEIL` 的安全计算。
  - 运行时集成：`src/lib/base/records.ts` 中的 `validateField` 会校验公式配置，`buildRecords` 内部的 `computeFormula` 负责实时计算公式字段并处理循环依赖。
  - 前端展示与聚合：`src/components/base/DynamicGrid.tsx` 会把 `formula` 字段以只读方式渲染，并通过 `sumRows` 参与分组汇总。
  - 测试覆盖：`tests/formula.test.ts` 覆盖乘法、体积向上取整后计算运费、除零返回 `null` 等关键场景。

## 目录结构

```text
D:\sy
├─ src
│  ├─ app
│  │  ├─ api                         # Next.js API 路由
│  │  │  ├─ ai                       # AI 风险评分和订单摘要接口
│  │  │  ├─ automation               # 库存交付预警自动化接口
│  │  │  ├─ dashboard                # 供应链仪表盘数据接口
│  │  │  ├─ records                  # 单元格更新接口
│  │  │  ├─ seed                     # 演示数据初始化接口
│  │  │  └─ tables                   # 动态表、字段和记录接口
│  │  ├─ openapi.json                # OpenAPI JSON 输出
│  │  ├─ reference                   # Scalar API 文档页面
│  │  ├─ globals.css                 # 全局样式和博洛尼视觉色调
│  │  ├─ layout.tsx                  # Next.js 根布局
│  │  └─ page.tsx                    # 首页入口
│  ├─ components
│  │  └─ base                        # 多维表格、字段面板和仪表盘组件
│  ├─ lib
│  │  ├─ ai                          # AI provider、mock 和火山方舟调用
│  │  ├─ api                         # API 响应和请求读取工具
│  │  ├─ base                        # 多维表格核心逻辑、seed 和供应链业务逻辑
│  │  ├─ db                          # Drizzle schema、数据库客户端和错误处理
│  │  └─ schemas                     # Zod schema 和 OpenAPI 注册
│  └─ types                          # 第三方库类型补充
├─ scripts                           # 迁移、seed、环境读取和代码结构检查脚本
├─ drizzle                           # SQL 迁移文件
├─ tests                             # 公式和 schema 单元测试
├─ Dockerfile                        # Next.js 生产镜像
├─ docker-compose.yml                # PostgreSQL、迁移、Web 和 seed 编排
├─ drizzle.config.ts                 # Drizzle Kit 配置
├─ next.config.ts                    # Next.js 配置
├─ package.json                      # npm 脚本和依赖
└─ README.md                         # 项目说明文档
```

## 质量检查

```powershell
npm run lint
npm run test
```

当前检查覆盖：

- TypeScript 类型检查。
- 单文件不超过 1000 行。
- 人工命名不超过 4 个英文词或 4 段语义单元。
- 公式计算逻辑测试。
- Zod schema 校验测试。
