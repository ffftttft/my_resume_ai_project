# 阿里云服务器部署教程（无域名版）

适用项目目录：

- `C:\Users\18153\Desktop\my_resume_ai_project`

当前这份文档按你的实际情况整理：

- 云厂商：`阿里云`
- 服务器：`轻量应用服务器`
- 配置：`2H2G`
- 暂时不买域名
- 先通过公网 IP 访问
- 当前公网 IP：`8.137.49.216`

---

## 1. 当前部署目标

先把项目部署到阿里云服务器，并通过公网 IP 跑起来。

部署完成后，你会得到：

- 前端页面：`http://8.137.49.216`
- FastAPI 文档：`http://8.137.49.216/docs`
- 一个持续运行的后端服务
- 一个能转发前后端请求的 `Nginx`

当前阶段先不做：

- 域名
- HTTPS
- 数据库升级
- OSS 对象存储

---

## 2. 服务器方案

当前实际方案：

- 云厂商：`阿里云`
- 产品：`轻量应用服务器`
- 地域：`中国香港`
- 系统：`Ubuntu 22.04`
- 配置：`2H2G`
- 公网 IP：`8.137.49.216`

说明：

- `2H2G` 对练手项目够用
- 但前端构建和 Python 安装依赖时内存会偏紧
- 建议后面在服务器里加一个 `swap`

---

## 3. 整体架构

这次部署结构如下：

```text
浏览器
  |
  | 访问 http://8.137.49.216
  v
Nginx
  |
  | 提供前端静态文件
  | 转发 /api 请求
  v
FastAPI 后端
  |
  | 调 OpenAI API
  v
OpenAI
```

---

## 4. 当前项目的注意事项

这个项目现在适合：

- 练手
- 演示
- 作品集
- 单机部署

暂时不适合正式大规模生产，因为当前依赖：

- `memory.json`
- `profile_memory.json`
- 本地上传目录
- 本地输出目录

后面做大项目时再升级到：

- `PostgreSQL`
- `OSS`
- `Redis`
- `Docker`

---

## 5. 第一步：开放服务器端口

在阿里云轻量应用服务器后台放行这些端口：

- `22`：SSH 登录
- `80`：HTTP 访问
- `443`：以后 HTTPS 用
- `8000`：仅调试时临时用

当前你已经验证通过：

- `22` 正常
- `80` 正常

### 端口的意义

- `22` 开了，说明你能远程登录服务器
- `80` 开了，说明浏览器可以访问网站
- `443` 开了，说明以后可以配 HTTPS
- `8000` 只是在调试 FastAPI 时方便直接访问

### 当前你的测试结果

已验证：

- `ssh root@8.137.49.216` 正常
- `Test-NetConnection 8.137.49.216 -Port 22` 成功
- `80` 在安装并启动 Nginx 后恢复正常

---

## 6. 第二步：SSH 登录服务器

在 Windows PowerShell 里执行：

```bash
ssh root@8.137.49.216
```

第一次连接时如果提示：

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

输入：

```text
yes
```

然后输入服务器密码即可。

---

## 7. 第三步：安装基础环境

在服务器中执行：

```bash
apt update && apt upgrade -y
apt install -y git curl unzip nginx
apt install -y python3 python3-pip python3-venv
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

## 8. 第四步：建议先加 swap

因为你是 `2H2G`，建议先执行：

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

作用：

- 降低 `npm install` 和 `npm run build` 时内存不够被杀掉的风险

---

## 9. 第五步：从 GitHub 拉取代码

进入 root 目录：

```bash
cd /root
```

克隆项目：

```bash
git clone git@github.com:ffftttft/my_resume_ai_project.git
```

进入目录：

```bash
cd /root/my_resume_ai_project
```

---

## 10. 第六步：部署后端

### 10.1 创建虚拟环境并安装依赖

```bash
cd /root/my_resume_ai_project/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 10.2 创建后端环境变量

编辑：

```bash
nano /root/my_resume_ai_project/backend/.env
```

写入：

```env
OPENAI_API_KEY=你的OpenAIKey
OPENAI_MODEL=gpt-5.4-mini
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_ORIGIN=http://8.137.49.216
```

说明：

- 现在没有域名，所以 `FRONTEND_ORIGIN` 必须写公网 IP

### 10.3 手动测试启动后端

```bash
cd /root/my_resume_ai_project
source backend/.venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

如果要测试：

```bash
curl http://127.0.0.1:8000/docs
```

---

## 11. 第七步：把后端挂成 systemd 服务

创建服务文件：

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

启动服务：

```bash
systemctl daemon-reload
systemctl enable resume-backend
systemctl start resume-backend
systemctl status resume-backend
```

查看日志：

```bash
journalctl -u resume-backend -f
```

---

## 12. 第八步：部署前端

建议部署目录：

- `frontend_app`

### 12.1 安装依赖并配置环境变量

```bash
cd /root/my_resume_ai_project/frontend_app
npm install
```

编辑：

```bash
nano /root/my_resume_ai_project/frontend_app/.env.production
```

写入：

```env
VITE_API_BASE_URL=http://8.137.49.216
```

说明：

- 当前前端代码会自己拼 `/api/...`
- 所以这里要写完整公网 IP
- 不要写成 `/api`

### 12.2 打包前端

```bash
npm run build
```

打包结果在：

```bash
/root/my_resume_ai_project/frontend_app/dist
```

---

## 13. 第九步：Nginx 配置

### 13.1 关键坑：不要让 Nginx 直接读 `/root/.../dist`

你这次已经真实踩到这个坑了。

错误现象：

- 浏览器报 `500 Internal Server Error`
- `Nginx` 错误日志出现：

```text
Permission denied
stat() "/root/my_resume_ai_project/frontend_app/dist/index.html" failed
```

原因：

- `nginx` 默认用户不能直接读取 `/root` 目录下的前端文件

### 正确做法：把前端打包结果复制到 `/var/www/`

执行：

```bash
mkdir -p /var/www/resume-site
cp -r /root/my_resume_ai_project/frontend_app/dist/* /var/www/resume-site/
chmod -R 755 /var/www/resume-site
```

以后每次前端重新打包后，都要重新复制一次：

```bash
cp -r /root/my_resume_ai_project/frontend_app/dist/* /var/www/resume-site/
```

---

### 13.2 创建 Nginx 配置

编辑：

```bash
nano /etc/nginx/sites-available/resume-site
```

写入：

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/resume-site;
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

启用配置：

```bash
ln -s /etc/nginx/sites-available/resume-site /etc/nginx/sites-enabled/resume-site
rm -f /etc/nginx/sites-enabled/default
```

检查并重启：

```bash
nginx -t
systemctl restart nginx
systemctl status nginx
```

---

## 14. 第十步：正式访问

现在应该可以访问：

- 首页：`http://8.137.49.216`
- API 文档：`http://8.137.49.216/docs`

如果首页能打开但功能异常，优先检查：

- `frontend_app/.env.production` 是否写成 `http://8.137.49.216`
- 前端是否重新 `npm run build`
- 是否重新复制到 `/var/www/resume-site/`
- 后端是否正常运行

---

## 15. 常见排查命令

查看后端状态：

```bash
systemctl status resume-backend
```

查看后端日志：

```bash
journalctl -u resume-backend -f
```

查看 Nginx 状态：

```bash
systemctl status nginx
```

检查 Nginx 配置：

```bash
nginx -t
```

查看 Nginx 错误日志：

```bash
tail -f /var/log/nginx/error.log
```

查看端口监听：

```bash
ss -tulpn | grep 8000
ss -tulpn | grep 80
```

---

## 16. 更新项目的标准流程

以后服务器更新代码时：

### 16.1 拉代码

```bash
cd /root/my_resume_ai_project
git pull
```

### 16.2 更新后端依赖

```bash
cd /root/my_resume_ai_project/backend
source .venv/bin/activate
pip install -r requirements.txt
```

### 16.3 更新前端

```bash
cd /root/my_resume_ai_project/frontend_app
npm install
npm run build
cp -r /root/my_resume_ai_project/frontend_app/dist/* /var/www/resume-site/
```

### 16.4 重启后端

```bash
systemctl restart resume-backend
```

### 16.5 如果改了 Nginx

```bash
nginx -t
systemctl reload nginx
```

---

## 17. 等客户提供域名后要改什么

### 17.1 修改前端环境变量

把：

```env
VITE_API_BASE_URL=http://8.137.49.216
```

改成：

```env
VITE_API_BASE_URL=https://客户给你的域名
```

然后重新：

```bash
npm run build
cp -r /root/my_resume_ai_project/frontend_app/dist/* /var/www/resume-site/
```

### 17.2 修改后端环境变量

把：

```env
FRONTEND_ORIGIN=http://8.137.49.216
```

改成：

```env
FRONTEND_ORIGIN=https://客户给你的域名
```

然后：

```bash
systemctl restart resume-backend
```

### 17.3 修改 Nginx

把：

```nginx
server_name _;
```

改成：

```nginx
server_name 客户给你的域名 www.客户给你的域名;
```

### 17.4 再配置 HTTPS

有域名后再安装：

```bash
apt install -y certbot python3-certbot-nginx
```

再申请证书。

---

## 18. 当前实战结论

你这台服务器当前关键信息：

- 公网 IP：`8.137.49.216`
- 服务器规格：`2H2G`
- 系统：`Ubuntu 22.04`
- 前端访问：`http://8.137.49.216`
- API 文档：`http://8.137.49.216/docs`
- 前端静态目录：`/var/www/resume-site`
- 项目目录：`/root/my_resume_ai_project`

---

## 19. 下一步建议

现在最值得继续做的是：

- 验证首页是否真的能完整调用后端
- 检查上传、生成、导出流程
- 补一份单独的 `DEPLOY_CHECKLIST.md`

