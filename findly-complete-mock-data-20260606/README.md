# Findly 完整商品模拟数据迁移包

本数据包用于把当前 Findly Demo 的完整商品模拟数据接入其他版本的 Demo。

## 包含内容

- 24 个商品主题。
- 120 个平台候选商品。
- 商品基础信息、规格、价格、优惠、库存、发货、退换规则和风险信息。
- 生成后的价格历史与拟真模拟评论。
- 口碑聚类所需的正负评价数据。
- 搜索接口按主题生成的完整响应快照。
- 24 张商品 SVG 素材。
- 当前后端模拟数据运行逻辑与 PE 文档快照。

## 目录

- `raw-source/findly-rich-mock-products.json`：原始商品主题与平台候选数据，建议作为主要数据源。
- `generated/products-with-generated-data.json`：120 个已展开商品，包含评论和价格历史，可直接接前端。
- `generated/search-responses-by-theme.json`：24 个主题对应的完整搜索响应快照。
- `generated/comments-by-product.json`：仅评论数据。
- `generated/comments.csv`：逐条评论明细。
- `generated/coverage-stats.json`：评论覆盖统计。
- `assets/mock-products/`：商品 SVG 素材。
- `runtime-reference/server.cjs`：当前模拟数据生成与 API 逻辑快照。
- `runtime-reference/package.json`：运行依赖参考。
- `runtime-reference/prompt.md`：最新版 PE 文档。

## 推荐接入方式

### 方式一：直接使用已展开商品数据

读取 `generated/products-with-generated-data.json`，可以直接获得商品列表、价格历史和评论。适合只迁移前端展示数据。

### 方式二：保留当前动态模拟逻辑

1. 将 `raw-source/findly-rich-mock-products.json` 放入目标项目的数据目录。
2. 将 `assets/mock-products/` 放入目标项目的静态资源目录。
3. 参考 `runtime-reference/server.cjs` 中的以下函数接入：
   - `mapRichListingToProduct`
   - `buildRichMockSearchResponse`
   - `buildRichMockDetail`
   - `buildMockReviews`
   - `buildMockPriceHistory`
   - `buildProductAgentCards`
4. 根据目标项目路由接入搜索、商品详情和 Agent 接口。

## 评论说明

- 评论为基于商品字段生成的拟真模拟数据，不是从真实消费者或电商平台抓取的原文。
- 每个商品固定包含好评和差评，并覆盖多个评价主题。

## 覆盖统计

- 商品主题：24
- 商品数量：120
- 评论总数：2880
- 单商品最少好评：17
- 单商品最少差评：4
- 单商品最少好评主题：4
- 单商品最少差评主题：4
