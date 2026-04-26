# 阿里云服务器部署教程（无域名版）

适用项目目录：

- `C:\Users\18153\Desktop\my_resume_ai_project`

这份文档按你的当前情况来写：

- 先用 **阿里云**
- 先吃掉你的 **300 元优惠券**
- **暂时不买域名**
- 先通过 **公网 IP** 把项目跑起来
- 目标是练会完整的服务器部署流程

---

## 1. 我直接替你选好的方案

### 当前推荐

- 云厂商：`阿里云`
- 服务器类型：`轻量应用服务器`
- 系统：`Ubuntu 22.04 LTS`
- 地域：**`中国香港`**
- 配置：**`2 核 2GB` 起步**

### 为什么我这样选

- 你现在是练手项目，先求 **能跑起来**
- 你不想额外花钱，`2 核 2GB` 更容易被优惠券覆盖
- `中国香港` 对新手更友好，**后面没域名也能直接用公网 IP 访问**
- 如果以后客户给你域名，香港节点通常也比中国大陆少一些备案限制

### 如果优惠券足够

如果你发现 `2 核 4GB` 也能被优惠券覆盖，优先选：

- `2 核 4GB`

因为它在下面这些场景会更稳：

- `npm install`
- `npm run build`
- Python 安装依赖
- FastAPI + 向量/RAG 相关功能

但如果你现在只想 **零额外花费先上线**，就先选：

- `2 核 2GB`

---

## 2. 这次部署完成后会是什么样

部署完成后，你会得到：

- 一个可以访问的前端页面
- 一个运行中的 FastAPI 后端
- 一个公网访问地址：`http://你的服务器公网IP`
- 一个反向代理好的 Nginx
- 一个能长期后台运行的服务

这次先不做：

- 域名
- HTTPS
- 正式数据库
- 对象存储

先把最重要的链路跑通：

```text
浏览器
  |
  | 访问 http://你的公网IP
  v
Nginx
  |
  | 提供前端页面
  | 转发 /api 请求
  v
FastAPI 后端
  |
  | 调 OpenAI
  v
OpenAI API
```

---

## 3. 先说几个关键认知

### 3.1 现在没有域名，完全可以先上线

你现在可以直接通过服务器公网 IP 访问：

- 前端：`http://你的公网IP`
- 后端接口文档：`http://你的公网IP/docs`

### 3.2 没有域名，就先不要做 HTTPS

因为：

- `Let's Encrypt` 通常需要域名
- 纯 IP 部署一般先走 `HTTP`

所以你现在阶段：

- **先不折腾 HTTPS**
- **先不折腾证书**

后面客户提供域名了，再补。

### 3.3 你这个项目现在更适合“单机练手”

项目里当前有这些本地持久化：

- `memory.json`
- `profile_memory.json`
- 本地上传目录
- 本地输出目录

这意味着：

- 现在适合单机部署
- 适合作品集/demo/练手
- 还不适合多用户正式生产

这不影响你现在先学部署。

---

## 4. 这份教程的最终路线

我们按这个顺序做：

1. 注册阿里云
2. 购买轻量应用服务器
3. 开放端口
4. SSH 登录服务器
5. 安装基础环境
6. 从 GitHub 拉代码
7. 部署 FastAPI 后端
8. 部署 React 前端
9. 配置 Nginx
10. 用公网 IP 访问项目
11. 学会以后怎么更新项目

---

## 5. 你现在需要准备什么

开始前准备：

- 阿里云账号
- GitHub 账号
- OpenAI API Key
- 一台你本地可用的电脑
- 你的项目代码已经放到 GitHub

如果你的代码还没上 GitHub，建议先做这件事。

因为以后服务器更新项目最简单的方法就是：

```bash
git pull
```

---

## 6. 第一步：注册阿里云并购买服务器

### 6.1 注册阿里云

去阿里云官网注册账号并完成实名认证。

---

### 6.2 购买轻量应用服务器

在控制台里搜索：

- `轻量应用服务器`

然后按下面的方式选。

### 推荐选择

- 实例类型：`轻量应用服务器`
- 镜像：`Ubuntu 22.04`
- 地域：**`中国香港`**
- 套餐：**`2核2G`**
- 公网 IP：默认带
- 磁盘：默认即可

### 为什么选中国香港

这是这份文档里非常关键的一点。

因为你现在：

- 暂时没有域名
- 暂时不想折腾备案
- 只想先练会部署

所以 `中国香港` 是比较稳的选择。

如果你选中国大陆节点，后面客户一旦给你域名，通常会涉及：

- ICP 备案

而香港节点通常不需要你先处理这件事。

---

### 6.3 300 元优惠券怎么用

你购买时先看订单页：

- 如果优惠券能覆盖，就直接下单
- 如果 `2核4G` 也能被覆盖，优先 `2核4G`
- 如果不能，就退回 `2核2G`

你当前阶段的原则只有一个：

- **优先不额外花钱**

---

### 6.4 购买完成后记下这些信息

你要记住：

- 服务器公网 IP
- root 密码

后面 SSH 登录要用。

---

## 7. 第二步：开放服务器端口

在阿里云控制台里找到这台轻量服务器，确认放行这些端口：

- `22`：SSH 登录
- `80`：HTTP 网站访问
- `443`：以后有域名时做 HTTPS 用
- `8000`：仅调试时可临时开放

### 当前推荐

正式跑通后，长期只保留：

- `22`
- `80`
- `443`

`8000` 最好只在排错时临时开。

---

## 8. 第三步：用 SSH 登录服务器

你在 Windows 上直接打开 PowerShell，执行：

```bash
ssh root@你的服务器公网IP
```

例如：

```bash
ssh root@47.xx.xx.xx
```

第一次会提示：

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

输入：

```text
yes
```

然后输入密码。

登录成功后，你就进入服务器了。

---

## 9. 第四步：初始化服务器环境

下面这些命令都在服务器里执行。

### 9.1 更新系统

```bash
apt update && apt upgrade -y
```

---

### 9.2 安装基础工具

```bash
apt install -y git curl unzip nginx
```

用途：

- `git`：拉代码
- `curl`：测试接口
- `unzip`：解压文件
- `nginx`：网站服务和反向代理

---

### 9.3 安装 Python

```bash
apt install -y python3 python3-pip python3-venv
```

---

### 9.4 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
python3 --version
```

---

## 10. 第五步：从 GitHub 拉取项目代码

### 10.1 进入 root 目录

```bash
cd /root
```

### 10.2 克隆仓库

```bash
git clone 你的GitHub仓库地址
```

例如：

```bash
git clone https://github.com/你的用户名/你的仓库名.git
```

### 10.3 进入项目目录

```bash
cd 你的仓库名
```

下面默认你的项目目录是：

```bash
/root/my_resume_ai_project
```

如果你的目录名不一样，请把后面命令里的路径替换掉。

---

## 11. 第六步：先部署后端

你的后端目录是：

- `backend`

你的 AI 模块目录在项目根下：

- `ai_modules`

所以启动时要注意 Python 的导入路径。

---

## 12. 后端部署详细步骤

### 12.1 进入后端目录

```bash
cd /root/my_resume_ai_project/backend
```

### 12.2 创建虚拟环境

```bash
python3 -m venv .venv
```

### 12.3 激活虚拟环境

```bash
source .venv/bin/activate
```

### 12.4 安装依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 12.5 创建后端环境变量文件

创建文件：

- `backend/.env`

命令：

```bash
nano /root/my_resume_ai_project/backend/.env
```

写入下面这个版本：

```env
OPENAI_API_KEY=你的OpenAIKey
OPENAI_MODEL=gpt-5.4-mini
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_ORIGIN=http://你的服务器公网IP
```

### 为什么这里要写公网 IP

因为你现在没有域名，前端访问地址就是：

- `http://你的服务器公网IP`

所以后端 CORS 也要允许这个来源。

保存方法：

- `Ctrl + O`
- 回车
- `Ctrl + X`

---

### 12.6 手动测试启动后端

先回到项目根目录：

```bash
cd /root/my_resume_ai_project
```

激活后端虚拟环境：

```bash
source backend/.venv/bin/activate
```

启动：

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

如果这个路径有问题，再试项目自带入口：

```bash
python backend/run_local.py
```

但正式挂服务时，优先还是用 `uvicorn`。

---

### 12.7 测试后端是否正常

在服务器另开一个终端执行：

```bash
curl http://127.0.0.1:8000/docs
```

如果能返回内容，说明后端基本起来了。

你也可以在自己电脑浏览器访问：

```text
http://你的服务器公网IP:8000/docs
```

如果打不开，先检查：

- 后端是否真的启动了
- 阿里云端口 `8000` 是否临时放行

注意：`8000` 只是测试用，正式访问我们走 Nginx 的 `80` 端口。

---

## 13. 第七步：把后端做成后台服务

后端不能靠手动一直挂着，所以我们用 `systemd`。

### 13.1 创建服务文件

```bash
nano /etc/systemd/system/resume-backend.service
```

写入：

```ini
[Unit]
Description=Resume AI FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/my_resume_ai_project
Environment=PYTHONUNBUFFERED=1
Environment=PYTHONPATH=/root/my_resume_ai_project:/root/my_resume_ai_project/backend
ExecStart=/root/my_resume_ai_project/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

---

### 13.2 启动服务

```bash
systemctl daemon-reload
systemctl enable resume-backend
systemctl start resume-backend
```

### 13.3 查看状态

```bash
systemctl status resume-backend
```

如果看到：

```text
active (running)
```

说明后端已经常驻运行了。

### 13.4 查看日志

```bash
journalctl -u resume-backend -f
```

后面出问题优先看这里。

---

## 14. 第八步：部署前端

你项目里有两个前端目录：

- `frontend`
- `frontend_app`

建议部署：

- `frontend_app`

因为它更像当前主应用。

---

### 14.1 进入前端目录

```bash
cd /root/my_resume_ai_project/frontend_app
```

### 14.2 安装依赖

```bash
npm install
```

---

### 14.3 创建前端生产环境变量

创建文件：

- `frontend_app/.env.production`

命令：

```bash
nano /root/my_resume_ai_project/frontend_app/.env.production
```

写入：

```env
VITE_API_BASE_URL=http://你的服务器公网IP
```

### 为什么这里不能写 `/api`

因为你当前项目里的前端代码已经会自己拼接：

- `/api/health`
- `/api/resume/generate`

也就是说当前代码更适合这种配置：

```env
VITE_API_BASE_URL=http://你的服务器公网IP
```

而不是：

```env
VITE_API_BASE_URL=/api
```

否则容易拼成：

```text
/api/api/...
```

---

### 14.4 打包前端

```bash
npm run build
```

打包成功后会生成：

- `/root/my_resume_ai_project/frontend_app/dist`

---

## 15. 第九步：配置 Nginx

现在我们要让：

- 访问 `http://公网IP` 时看到前端页面
- 访问 `http://公网IP/api/...` 时转发到 FastAPI

### 15.1 创建 Nginx 配置文件

```bash
nano /etc/nginx/sites-available/resume-site
```

写入：

```nginx
server {
    listen 80;
    server_name _;

    root /root/my_resume_ai_project/frontend_app/dist;
    index index.html;
    client_max_body_size 20m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 为什么 `server_name _;`

因为你现在没有域名，只想让 Nginx 接住所有访问请求。  
后面客户给你域名后，再把这里改成正式域名即可。

---

### 15.2 启用配置

```bash
ln -s /etc/nginx/sites-available/resume-site /etc/nginx/sites-enabled/resume-site
```

如果默认站点冲突，先删掉默认配置：

```bash
rm -f /etc/nginx/sites-enabled/default
```

---

### 15.3 检查配置

```bash
nginx -t
```

如果输出：

```text
syntax is ok
test is successful
```

说明没问题。

### 15.4 重启 Nginx

```bash
systemctl restart nginx
systemctl status nginx
```

---

## 16. 第十步：正式访问项目

现在你应该可以访问：

- 前端首页：`http://你的服务器公网IP`
- FastAPI 文档：`http://你的服务器公网IP/docs`

如果前端页面能打开，但功能不正常，优先检查：

- `frontend_app/.env.production` 是否写了公网 IP
- 前端是否已经重新 `npm run build`
- 后端服务是否在运行

---

## 17. 这个项目当前最重要的上线细节

这部分和“服务器”无关，是“项目本身”的注意事项。

### 17.1 你的前端 API 地址现在必须写成公网 IP

当前项目前端文件：

- `C:\Users\18153\Desktop\my_resume_ai_project\frontend_app\src\api.js:1`

它的请求方式是：

- `VITE_API_BASE_URL + /api/...`

所以当前无域名部署时：

```env
VITE_API_BASE_URL=http://你的服务器公网IP
```

是正确写法。

### 17.2 后端 CORS 现在要允许公网 IP

当前后端配置文件：

- `C:\Users\18153\Desktop\my_resume_ai_project\backend\app\config.py:1`

环境变量里要写：

```env
FRONTEND_ORIGIN=http://你的服务器公网IP
```

### 17.3 现在不要把 OpenAI Key 放前端

只能放：

- `backend/.env`

绝对不要放：

- `frontend_app/.env.production`
- GitHub 仓库
- 前端源码

### 17.4 本地 JSON 现在只是练手方案

项目目前依赖：

- `memory.json`
- `profile_memory.json`

这适合：

- 单机 demo
- 练手
- 作品集

不适合未来大项目。后面要升级成：

- `PostgreSQL`

### 17.5 上传文件现在是本地磁盘存储

这意味着：

- 服务器坏了文件可能丢
- 多机部署会麻烦

后面大项目建议迁移到：

- 阿里云 `OSS`

---

## 18. 页面打不开时怎么排查

按这个顺序查。

### 18.1 看后端服务

```bash
systemctl status resume-backend
```

### 18.2 看后端日志

```bash
journalctl -u resume-backend -f
```

### 18.3 看 Nginx 状态

```bash
systemctl status nginx
```

### 18.4 看 Nginx 配置

```bash
nginx -t
```

### 18.5 看 Nginx 报错

```bash
tail -f /var/log/nginx/error.log
```

### 18.6 看端口监听

```bash
ss -tulpn | grep 8000
ss -tulpn | grep 80
```

### 18.7 看阿里云防火墙/端口规则

确认至少已放行：

- `22`
- `80`

临时调试时如果要直接看后端：

- `8000`

---

## 19. 以后怎么更新项目

以后你本地改完代码，再更新服务器时按这个流程来。

### 19.1 拉最新代码

```bash
cd /root/my_resume_ai_project
git pull
```

### 19.2 如果后端依赖有变化

```bash
cd /root/my_resume_ai_project/backend
source .venv/bin/activate
pip install -r requirements.txt
```

### 19.3 如果前端改了

```bash
cd /root/my_resume_ai_project/frontend_app
npm install
npm run build
```

### 19.4 重启后端

```bash
systemctl restart resume-backend
```

### 19.5 如果改了 Nginx

```bash
nginx -t
systemctl reload nginx
```

---

## 20. 等客户提供域名后，你要改什么

等以后客户把域名给你，再做这几件事：

### 20.1 修改前端环境变量

把：

```env
VITE_API_BASE_URL=http://你的服务器公网IP
```

改成：

```env
VITE_API_BASE_URL=https://客户给你的域名
```

然后重新打包：

```bash
npm run build
```

### 20.2 修改后端环境变量

把：

```env
FRONTEND_ORIGIN=http://你的服务器公网IP
```

改成：

```env
FRONTEND_ORIGIN=https://客户给你的域名
```

然后重启后端：

```bash
systemctl restart resume-backend
```

### 20.3 修改 Nginx 的 `server_name`

把：

```nginx
server_name _;
```

改成：

```nginx
server_name 客户给你的域名 www.客户给你的域名;
```

### 20.4 再配置 HTTPS

等有域名后，再安装：

- `certbot`
- `python3-certbot-nginx`

然后申请证书。

---

## 21. 以后做大项目时怎么升级

等你不再是练手项目时，建议升级顺序如下。

### 第一阶段

- 存储从 JSON 改成 PostgreSQL
- 文件从本地磁盘改成阿里云 OSS

### 第二阶段

- 用 Docker 打包
- 用 `docker compose` 管理服务

### 第三阶段

- 前后端分离部署
- Redis 缓存
- 独立日志监控
- 错误告警

但这些都不是你今天必须做的。

你现在第一目标只有一个：

- **用阿里云服务器，通过公网 IP，把项目真正跑起来**

---

## 22. 最终推荐清单

如果你现在就去买，我给你的最终配置是：

- 云厂商：`阿里云`
- 产品：`轻量应用服务器`
- 地域：`中国香港`
- 系统：`Ubuntu 22.04`
- 配置：`2核2G`
- 访问方式：`公网 IP`
- Web 服务：`Nginx`
- 后端：`FastAPI + systemd`
- 前端：`frontend_app + Vite build`

---

## 23. 你现在立刻该做什么

按这个顺序：

1. 注册阿里云
2. 买 `中国香港` 的轻量应用服务器
3. 确认端口 `22` 和 `80` 已放行
4. 把代码上传到 GitHub
5. 按本文 SSH 登录服务器
6. 安装 Python / Node / Nginx
7. 部署后端
8. 打包前端
9. 配置 Nginx
10. 通过公网 IP 验证

---

## 24. 下一步我建议你让我继续做什么

现在这份文档已经改成适合你的版本了。  
更进一步，我建议你下一步让我继续做这两件事之一：

- 检查并修改项目里的线上环境变量配置
- 直接补一份“阿里云上线前检查清单”

如果你愿意，我下一步可以直接帮你：

- 检查 `frontend_app` 是否需要改 API 地址逻辑
- 检查 `backend` 的 CORS 是否还要补
- 再给你补一份 `DEPLOY_CHECKLIST.md`

