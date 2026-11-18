# 與本機開發、測試使用同一個 Node 主版本（22）；alpine 版本體積小
FROM node:22-alpine3.22

# 正式環境模式：npm、express 等套件會依此啟用較有效率的行為
ENV NODE_ENV=production

WORKDIR /app

# 分層快取：先只複製 package*.json 並安裝套件，最後才複製程式碼。
# 這樣只改程式碼時，這兩層會直接重用，不必重新下載套件
COPY --chown=node:node package.json package-lock.json ./
# npm ci：嚴格依 package-lock.json 安裝（比 npm install 可重現）；--omit=dev：不裝 nodemon 這類開發用套件
RUN npm ci --omit=dev

COPY --chown=node:node . .

# 不用 root 執行：萬一程式被入侵，攻擊者拿到的不是最高權限（node 使用者是官方映像檔內建的）
USER node

# 僅是文件性質的宣告：這個容器的服務聽 8080。真正對外開放由 docker-compose.yml 的 ports 決定
EXPOSE 8080

# 用 node 直接啟動，不用 npm start：npm 會擋在中間，docker stop 的終止訊號（SIGTERM）傳不到程式，
# bin/www.js 裡寫好的「優雅關閉」就不會被觸發
CMD ["node", "./bin/www.js"]
