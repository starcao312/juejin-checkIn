# juejin-checkIn

## ⚠️ 注意事项

> 请在使用前删除 config 文件夹下的所有内容！

## 使用教程

1. 本地运行
   首次运行需要扫码登录；每次运行 `node index.js` 执行一次签到
2. 搭配`github action`
   需要本地先运行一次扫码登录后推送代码，然后就可以执行 Actions。定时任务设置为每天北京时间 08:17（UTC 00:17）执行，也可在 Actions 页面手动运行。GitHub 定时调度可能延迟，不保证准点执行。
3. 配置企业微信群机器人推送消息
   `QYWX_ROBOT` Settings action secrets 新增 QYWX_ROBOT 值就是你机器人的 webhook 地址
   [配置文档](https://developer.work.weixin.qq.com/document/path/91770)

## 本地运行（请用 PowerShell 或者 git bash 运行）

> **cmd 直接运行会报错**

```bash
pnpm install  # 安装依赖
node index.js  # 运行
```

## 更新日志

### [base] - 2024-08-28

#### 新增功能

- 新增判断是否已经免费抽奖

#### 问题修复

- 修复了重复运行脚本扣除矿石抽奖

### [base] - 2024-08-29

#### 新增功能

- 新增判断是否已经点击签到按钮的调试信息，优化签到状态判断

#### 问题修复

- 修复 Actions 执行有时签到不执行问题

### [base] - 2024-09-01

#### 新增功能

- 修改点击签到按钮的判断加入重试机制

#### 问题修复

- 修复 Actions 执行有时签到不执行问题

> **Docker 运行报错 弃用了 想了解代码的在 main-bak 分支**

## docker 运行（已弃用 采用 github action 执行）

```bash
docker run -d --name juejin-checkin -e QYWX_ROBOT='你的企业微信群机器人webhook地址' -e CRON='0 0 7 * * *' lmyself/juejin-checkin:latest
```

## docker-compose 运行（已弃用 采用 github action 执行）

```bash
docker-compose up -d
```

## 参数说明

以下六字段表达式用于已弃用的 Docker 配置。GitHub Actions 使用五字段 cron，当前配置为 `17 0 * * *`（UTC）。

| 字段 | 值  |             含义              |
| :--: | :-: | :---------------------------: |
|  秒  |  0  |      每分钟的第 0 秒执行      |
| 分钟 |  0  |     每小时的第 0 分钟执行     |
| 小时 |  7  |     每天的上午 7:00 执行      |
| 日期 | \*  |            每一天             |
| 月份 | \*  |            每个月             |
| 星期 | \*  | 每一天（0 和 7 都表示星期天） |

## 更新时间

20261229
