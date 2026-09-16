<div align="center">

  <img src="public/icon/128.png" width="96" height="96" alt="Profile Insight Logo">

  # Profile Insight

  **基于公开动态快速了解海外客户，并生成个性化沟通建议。**

  免费使用 · 自带大模型 API · 数据保存在本地

</div>

## 项目简介

Profile Insight 是一款面向外贸销售、海外商务拓展、招聘及投资调研人员的浏览器扩展。

在 LinkedIn 或 X 用户主页点击 **Profile Insight**，扩展会读取当前页面的公开资料与近期公开动态，并使用您自行配置的大模型 API 生成结构化分析结果，帮助您减少信息整理时间，让每次沟通更有针对性。

> Profile Insight 仅处理页面中的公开信息，不提供或转售大模型服务。

## 主要功能

- 支持 LinkedIn 个人主页与公司主页
- 支持 X（Twitter）用户主页
- 自动收集并分析最多 100 条公开动态
- 提炼职业画像、主要语言和沟通风格
- 总结近期关注主题及观点
- 识别合作、招聘、采购和产品发布等商业信号
- 推荐适合作为沟通切入点的原始动态
- 同时显示对方当地时间与您的本地时间
- 生成 LinkedIn 私信、X 私信、Cold Email 和跟进话术
- 在浏览器本地保存分析历史，并支持随时清理

## 支持平台

| 平台 | 个人主页 | 公司主页 | 公开动态分析 |
| --- | :---: | :---: | :---: |
| LinkedIn | ✅ | ✅ | ✅ |
| X（Twitter） | ✅ | — | ✅ |

## 支持的大模型

您需要在扩展设置中配置自己的模型服务。当前支持：

- Google Gemini
- DeepSeek
- OpenAI Compatible API

使用自己的 API，可以自由选择模型服务商、控制调用费用，并随时更换模型或接口地址。API Key 不会提交给 Profile Insight 开发者。

## 使用方法

1. 安装并启用 Profile Insight。
2. 打开扩展的设置页面。
3. 填写 API Key、接口地址及模型名称。
4. 打开受支持的 LinkedIn 或 X 主页。
5. 点击页面中的 **⚡ Profile Insight** 按钮。
6. 选择分析目的，等待右侧面板生成结果。

> LinkedIn 的动态采用滚动加载。为了获得更完整的分析结果，扩展可能需要先加载更多公开动态。

## 本地开发

### 环境要求

- Node.js 18 或更高版本
- npm、pnpm 或 yarn
- Chrome 114 或更高版本

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

随后在 Chrome 中打开 `chrome://extensions`：

1. 开启右上角的“开发者模式”。
2. 点击“加载已解压的扩展程序”。
3. 选择项目生成的开发版输出目录。

### 类型检查与构建

```bash
npm run compile
npm run build
```

生产构建结果位于 `output/` 目录。

### 生成发布压缩包

```bash
npm run zip
```

## 隐私与数据处理

- API Key、扩展设置和分析历史保存在您的浏览器本地。
- Profile Insight 开发者不运营数据中转服务器。
- 公开主页资料和动态只会发送给您自行配置的大模型服务。
- 数据处理同时受所选模型服务商隐私政策的约束。
- 扩展不会收集密码、登录 Cookie 或私人消息。
- 您可以在设置页面清除 API Key、历史记录及全部本地数据。

### 访问的数据

为了提供个人主页分析功能，Profile Insight 可能访问以下数据：

- 当前 LinkedIn 或 X 页面上公开展示的姓名、用户名、简介及职业资料
- 当前页面上公开展示的动态内容、发布时间及相关互动信息
- 用户主动填写的大模型 API Key、接口地址、模型名称及扩展设置
- 由大模型返回的分析结果，以及用户选择保存在本地的分析历史

Profile Insight 不会读取或收集您的账号密码、身份验证 Cookie、私人消息、联系人列表、支付信息或未在当前页面公开展示的资料。

### 数据用途

访问上述数据仅用于：

- 收集用户主动要求分析的公开主页资料与公开动态
- 将必要内容发送给用户自行选择并配置的大模型服务进行分析
- 在侧边栏中展示画像、商业信号、活跃时间和沟通建议
- 在浏览器本地保存用户设置及分析历史

这些数据不会用于广告、信用评估、数据经纪、用户画像销售，或与扩展核心功能无关的用途。

### 数据存储、传输与共享

- API Key、设置及分析历史通过 Chrome Storage 保存在用户浏览器本地。
- Profile Insight 开发者不接收、存储或转售上述数据。
- 当用户主动发起分析时，必要的公开资料和动态会直接发送至用户配置的大模型 API。
- 除用户自行选择的模型服务商外，Profile Insight 不会向其他第三方出售或共享用户数据。
- 数据在模型服务商处的处理与保留规则受相应服务商的服务条款及隐私政策约束。

### 数据保留与删除

本地设置与分析历史会保留在当前浏览器中，直至用户主动删除、清除浏览器扩展数据或卸载扩展。用户可随时在 Profile Insight 设置页面清除 API Key、分析历史或全部本地数据。

### Limited Use 合规声明

Profile Insight 对从 Google API 获取的信息的使用和传输，将遵守 [Chrome Web Store 用户数据政策](https://developer.chrome.com/docs/webstore/user_data)，包括其中的 Limited Use 要求。

> Profile Insight's use and transfer of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

具体包括：

- 仅将用户数据用于提供或改进用户可见、且由用户主动请求的扩展核心功能。
- 不允许人工读取用户数据，除非获得用户明确同意、出于安全调查需要、为遵守法律，或数据已经过汇总及匿名化并仅用于内部运营。
- 不会将用户数据用于个性化广告，也不会出售给广告平台、数据经纪商或其他信息转售方。
- 不会将用户数据用于信用评估、贷款或其他与扩展核心功能无关的用途。

### 权限说明

Profile Insight 仅在实现核心功能所需的范围内申请权限：

- `storage`：在浏览器本地保存 API 设置及分析历史。
- `sidePanel`：在 Chrome 侧边栏中展示分析结果。
- `linkedin.com`、`x.com` 和 `twitter.com` 的页面访问权限：读取用户主动分析页面中公开展示的资料与动态，并注入分析入口。
- 可选网站访问权限：仅在用户配置其他兼容 API 地址并主动授权后，用于直接请求该模型服务。

## 使用提醒

分析结果基于公开信息和 AI 推断，可能存在遗漏或偏差。请在联系客户或作出决策前自行核实，并仅分析您有权处理的公开资料。

请勿使用分析结果推断敏感属性，或将其用于自动化的高风险决策。

## 技术栈

- [WXT](https://wxt.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- Chrome Extension Manifest V3

---

<div align="center">

少一点盲目群发，多一点真正与对方相关的沟通。

</div>
