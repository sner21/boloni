# 博洛尼全屋定制供应链协同系统

线上地址：[https://boloni-azure.vercel.app/](https://boloni-azure.vercel.app/)

## 关键启动和部署命令

### 本地启动

本地开发要求 Node.js 20 或更高版本，并准备可连接的 PostgreSQL 数据库。

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run seed
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

如果不执行 `npm run seed`，也可以进入页面后点击 `初始化博洛尼演示数据`。

### Docker 启动

Docker Compose 会同时启动 PostgreSQL、执行迁移并启动 Next.js 服务。

```powershell
docker compose up --build
```

如需通过命令行初始化演示数据：

```powershell
docker compose --profile seed up seed
```

### 生产构建

```powershell
npm run build
npm run start
```

### Vercel 部署

推荐在 Vercel 控制台导入仓库部署，并在项目环境变量中配置生产数据库和 AI 参数。使用 Vercel CLI 时，关键命令如下：

```powershell
npm run build
npx vercel --prod
```

生产数据库首次上线后，需要在可信终端使用生产 `DATABASE_URL` 执行一次迁移：

```powershell
npm run db:migrate
```
## 核心能力

- 动态表格：支持动态创建表、字段和记录。
- 字段类型：支持文本、数字、标签、单选、多选、关联、公式、AI 文本和 AI 评分。
- 关联字段：使用 `record_links` 独立表存储跨表关联，不把关联关系拼接在 JSON 字符串中。
- 公式字段：使用安全 AST 计算 `SUM`、`MULTIPLY`、`DIVIDE`、`SUBTRACT` 和 `CEIL`，不使用 `eval`。
- AI 字段：支持供应商履约风险评分和定制订单摘要生成。
- 供应链场景：内置博洛尼供应商表、博洛尼产品表、博洛尼定制订单表和交付预警流程。
- 仪表盘：展示定制订单总额、供应商风险分布和库存交付缺口。
- API 文档：提供 OpenAPI JSON 和 Scalar 可视化接口文档。


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

下面按“PDF 题目范围”和“项目额外补充”拆分。PDF 题目范围指多维表格引擎与供应链应用必须直接支撑的核心交付；项目额外补充指为了演示完整度、工程化、部署和品牌化体验新增的能力。

### PDF 题目范围内

| 技术或能力 | 项目落地 |
| --- | --- |
| Next.js + React | 使用 App Router 构建单页业务工作台和 API Route Handler |
| TypeScript | 约束前后端数据结构、字段类型、公式 AST 和 API 输入输出 |
| PostgreSQL | 持久化动态表、字段、记录、单元格值和跨表关联 |
| 多维表格引擎 | 实现动态字段、记录 CRUD、内联编辑、分组聚合、关联字段和公式字段 |
| AI 能力 | 实现供应商风险评分和定制订单摘要两个 AI 字段能力 |
| 供应链业务应用 | 以供应商、产品、定制订单、库存预警和交付节点作为业务主线 |

### PDF 之外的项目补充

| 技术或能力 | 用途 |
| --- | --- |
| Drizzle ORM / Drizzle Kit | 管理 PostgreSQL schema、类型推导和数据库迁移 |
| Zod | 校验请求体、字段配置、公式 AST、AI 请求和 AI 响应 |
| Scalar + OpenAPI | 自动提供接口文档，便于面试演示和接口调试 |
| Recharts | 绘制定制交付仪表盘中的供应商风险分布图 |
| Lucide React | 提供页面操作图标，提升界面可读性 |
| Docker / Docker Compose | 固化 Node、PostgreSQL、迁移和 Web 服务启动流程 |
| Vercel | 托管线上演示环境 |
| Vitest | 覆盖公式计算和 Zod schema 等关键逻辑测试 |
| 代码结构检查脚本 | 检查单文件行数和文件命名长度，保持项目结构可维护 |

## UI 色调和视觉风格

UI 风格参考了博洛尼官网的高端全屋定制品牌调性，但不是官网页面的直接复制。整体视觉强调“高级家居、定制空间、沉稳商务、轻奢质感”。

- 主背景使用暖灰石材感色调 `#f4f2ee`，减少传统后台系统的冷硬感。
- 左侧导航使用深黑棕 `#171514`，对应高端家居官网常见的沉稳大面积暗色。
- 主要按钮和图表强调色使用香槟金 `#b89157`，呼应高端定制、金属五金和展厅灯光质感。
- 面板、表格和输入框以白色、浅暖灰和细边框为主，保持信息密度但不做过度装饰。
- 页面布局采用左侧品牌导航、中间多维表格、右侧仪表盘和字段面板，像一个可操作的供应链协同台。
- 左侧空间图片用于建立家居场景感，配合“Boloni Base”“全屋定制供应链工作台”等文案强化品牌化演示语境。

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

## API 文档

本地启动后可访问：

- OpenAPI JSON：`http://localhost:3000/openapi.json`
- Scalar 文档：`http://localhost:3000/reference`

线上环境可访问：

- OpenAPI JSON：[https://boloni-azure.vercel.app/openapi.json](https://boloni-azure.vercel.app/openapi.json)
- Scalar 文档：[https://boloni-azure.vercel.app/reference](https://boloni-azure.vercel.app/reference)

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
