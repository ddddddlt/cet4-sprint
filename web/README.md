# 四级冲刺 v2（预览）

React + Vite + Tailwind + shadcn 风格组件的重建版，先覆盖壳层、首页、题目练习、词汇深练。

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
# 产物在 dist/，部署到 GitHub Pages 的 /cet4-sprint/v2/
```

版式与配色：暖白底 + 墨绿主色，组件实现参考 shadcn/ui 的 Button / Card / Badge / Progress / Input。

> v2 预览复用旧版的数据脚本与 core.js（只读 localStorage），未迁移的页面通过“返回旧版”访问。
