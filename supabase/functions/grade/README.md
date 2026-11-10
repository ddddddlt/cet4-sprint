# AI 批改（DeepSeek）

这个函数只做两件事：校验当前 Supabase 用户，然后调用 DeepSeek 批改四六级写作/翻译。

## 1. 先撤销泄露的 Key

如果 API Key 曾出现在聊天、截图或代码里，先在 DeepSeek 控制台删除它，重新创建一个。

**不要**把 Key 写进前端、GitHub 仓库或 `index.ts`。

## 2. 部署函数

### 方式 A：Supabase Dashboard（推荐，不用装 CLI）

1. Supabase Dashboard → Edge Functions → **Deploy a new function**
2. 名称填 `grade`
3. 把 `index.ts` 全量粘贴进去
4. 关闭 “Verify JWT” 也可以，函数内部已经校验用户
5. 部署
6. Edge Functions → Secrets → 添加：

```text
DEEPSEEK_API_KEY = 新生成的 DeepSeek Key
```

### 方式 B：Supabase CLI

```bash
supabase functions deploy grade --project-ref <project-ref>
supabase secrets set DEEPSEEK_API_KEY=<新生成的 Key> --project-ref <project-ref>
```

## 3. 前端使用

在「写作 / 翻译」提交后，点击 **AI 批改**。

前端会：

1. 读取当前 Supabase 登录会话
2. 调用 `https://<project>.supabase.co/functions/v1/grade`
3. 显示 15 分制分数、问题、修改建议
4. 把结果保存到 `state.aiGrades`，随进度同步

## 4. 自测

```bash
curl -i -X OPTIONS \
  'https://<project>.supabase.co/functions/v1/grade' \
  -H 'Origin: https://ddddddlt.github.io'
```

应返回 204。正式请求必须带当前登录用户的：

```text
Authorization: Bearer <Supabase access_token>
apikey: <Supabase anon/publishable key>
```

## 注意

- 未登录时返回 401「请先在设置页登录 Supabase」
- 没有配置 Secret 时返回 503
- 函数未部署时前端提示「AI 批改函数还没部署」
- 模型是 `deepseek-chat`，按 15 分制输出
- 每次批改会消耗 DeepSeek 额度
