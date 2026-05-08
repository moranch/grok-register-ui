# Grok Register Frontend

Grok Register 的前端项目，基于 React + TypeScript + Vite 构建。

## 技术栈

- React 19
- TypeScript 5
- Vite 6
- Zustand (状态管理)
- React Router v7
- Chart.js (数据可视化)
- 单HTML文件输出

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

开发模式下会自动代理 `/api` 请求到 `http://localhost:18600`。

## 构建

```bash
npm run build
```

构建产物为 `dist/index.html`，所有 JS/CSS 资源都会内联到单个 HTML 文件中。

## 与 grok-register 集成

构建后的 `dist/index.html` 会被复制到 `grok-register/apps/console/static/index.html`，由 FastAPI 直接托管。

### Docker 自动构建

在 `grok-register` 的 `docker-compose.yml` 中，console 服务会自动拉取并构建前端：

```yaml
console:
  build:
    context: .
    dockerfile: apps/worker-runtime/Dockerfile
  # ...
```

## 页面

- **仪表盘**: 任务统计、成功率、健康检查概览
- **任务管理**: 创建/停止/删除任务、实时日志
- **系统配置**: 代理、邮箱、Token推送配置
- **健康检查**: WARP、grok2api、邮箱API、x.ai 连通性检测

## API 接口

前端通过 `/api/*` 接口与后端通信：

- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/:id/logs` - 获取任务日志
- `GET /api/settings` - 获取系统配置
- `POST /api/settings` - 保存系统配置
- `GET /api/health` - 健康检查
