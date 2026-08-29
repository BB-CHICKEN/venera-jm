class JM extends ComicSource {
    name = "禁漫天堂(重构)"
    key = "jm"
    version = "1.8.5"
    minAppVersion = "1.5.0"

    static jmVersion = "2.0.16"
    static jmPkgName = "com.example.app"
    url = "https://ghfast.top/https://raw.githubusercontent.com/BB-CHICKEN/venera-jm.js/main/recode-jm.js"

    dailyCheckInInProgress = false
    _loggedIn = false
    _reLoginDialogShown = false
    _renewing = false
    _shuntMapping = null

    static fallbackServers = [
        "www.cdnhjk.net",
        "www.cdngwc.cc",
        "www.cdngwc.net",
        "www.cdngwc.club",
        "www.cdnutc.me",
    ];
    static apiDomains = JM.fallbackServers;
    static imageUrl = "https://cdn-msp.jmapiproxy1.cc"
    static fallbackImageUrls = [
        "https://cdn-msp.jmapiproxy1.cc",
        "https://cdn-msp.jmapiproxy2.cc",
        "https://cdn-msp.jmapiproxy3.cc",
        "https://cdn-msp.jmapinodeudzn.net",
        "https://cdn-msp.jmapinodeudzn.cc",
    ]

    static ua = "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36"

    get ua() {
        return JM.ua;
    }

    get baseUrl() {
        let index = parseInt(this.loadSetting('apiDomain')) - 1;
        if (isNaN(index) || index < 0 || index >= JM.apiDomains.length) {
            index = 0;
        }
        return `https://${JM.apiDomains[index]}`;
    }

    get imageUrl() {
        return JM.imageUrl
    }

    overwriteApiDomains(domains) {
        if (domains.length != 0) JM.apiDomains = domains
    }

    overwriteImgUrl(url) {
        if (url.length != 0) JM.imageUrl = url
    }

    isNum(str) {
        return /^\d+$/.test(str)
    }

    get baseHeaders() {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
            "Origin": "https://localhost",
            "Referer": "https://localhost/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "X-Requested-With": JM.jmPkgName,
        }
    }

    getApiHeaders(time) {
        if (this.loadSetting("dailyCheckInTask")) {
            this.dailyCheckIn(true)
        }
        const jmAuthKey = "18comicAPPContent"
        let token = Convert.md5(Convert.encodeUtf8(`${time}${jmAuthKey}`))

        return {
            ...this.baseHeaders,
            "Authorization": "Bearer",
            "Sec-Fetch-Storage-Access": "active",
            "token": Convert.hexEncode(token),
            "tokenparam": `${time},${JM.jmVersion}`,
            "User-Agent": this.ua,
        }
    }

    getImgHeaders() {
        return {
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
            "Referer": "https://localhost/",
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Storage-Access": "active",
            "User-Agent": this.ua,
            "X-Requested-With": JM.jmPkgName,
        }
    }

    getCoverUrl(id) {
        return `${this.imageUrl}/media/albums/${id}_3x4.jpg`
    }

    getImageUrl(id, imageName) {
        return `${this.imageUrl}/media/photos/${id}/${imageName}`
    }

    getAvatarUrl(imageName) {
        return `${this.imageUrl}/media/users/${imageName}`
    }

    // ---------- 初始化 ----------
    async init() {
        if (this.loadSetting('refreshDomainsOnStart')) await this.refreshApiDomains(false);
        this.refreshImgUrl(false);
        await this._autoLogin();
        if (this.loadSetting('checkUpdateOnStart')) {
            this.checkVersion();
        }
    }

    // ---------- 版本检查 ----------
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLen = Math.max(parts1.length, parts2.length);
        for (let i = 0; i < maxLen; i++) {
            const a = parts1[i] || 0;
            const b = parts2[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
        }
        return 0;
    }

    async checkVersion() {
        try {
            const urls = [
                "https://ghfast.top/https://raw.githubusercontent.com/BB-CHICKEN/venera-jm.js/main/version.json",
                "https://raw.githubusercontent.com/BB-CHICKEN/venera-jm.js/main/version.json"
            ];
            let res = null;
            for (const url of urls) {
                try {
                    res = await Promise.race([
                        fetch(url, { headers: this.baseHeaders }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                    ]);
                    if (res && res.status === 200) break;
                } catch (e) {
                    continue;
                }
            }
            if (!res || res.status !== 200) {
                console.warn("版本检查失败：无法获取远程版本信息");
                return;
            }
            const data = await res.json();
            const remoteVersion = data.version;
            if (!remoteVersion) {
                console.warn("版本检查失败：无法解析远程版本号");
                return;
            }
            if (this.compareVersions(remoteVersion, this.version) > 0) {
                const notes = data.notes || "";
                const notesText = notes ? `\n\n更新内容：\n${notes}` : "";
                UI.showDialog(
                    "JMComic发现新版本",
                    `当前版本：${this.version}\n最新版本：${remoteVersion}${notesText}\n\n请前往漫画源列表更新最新版本\n不是蓝色按钮的更新，是漫画源版本号的右方时钟图标`,
                    [
                        { text: "关闭", callback: () => {} }
                    ]
                );
            } else {
                console.log(`版本检查完成：当前 ${this.version} 已是最新版本`);
            }
        } catch (e) {
            console.warn("版本检查失败", e);
        }
    }

    // ---------- 自动登录（从设置读取凭证） ----------
    async _autoLogin() {
        const username = this.loadSetting('jm_account');
        const password = this.loadSetting('jm_pwd');
        if (!username || !password) {
            this._loggedIn = false;
            console.warn("⚠️ 请在设置中填写 JM 账号和密码");
            return;
        }
        try {
            await this.account.login(username, password);
            this._loggedIn = true;
            console.log("✅ 插件自动登录成功");
        } catch (e) {
            this._loggedIn = false;
            console.warn("❌ 自动登录失败", e);
        }
    }

    // ---------- 域名刷新 ----------
    async refreshApiDomains(showConfirmDialog) {
        let url = "https://rup4a04-c02.tos-cn-hongkong.bytepluses.com/newsvr-2025.txt"
        let domainSecret = "diosfjckwpqpdfjkvnqQjsik"
        let title = ""
        let message = ""
        let servers = []
        let domains = []
        let res = null;
        try {
            res = await fetch(url, { headers: this.baseHeaders });
        } catch (error) {
            res = null;
        }
        if (res && res.status === 200) {
            let data = this.convertData(await res.text(), domainSecret)
            let json = JSON.parse(data)
            if (json["Server"]) {
                title = "更新成功"
                message = "\n"
                servers = json["Server"]
            }
        }
        if (servers.length === 0) {
            title = "更新失败"
            message = "使用内置域名：\n\n"
            servers = JM.fallbackServers
        }
        for (let i = 0; i < servers.length; i++) {
            message = message + `线路${i + 1}:  ${servers[i]}\n\n`
            domains.push(servers[i])
        }
        if (showConfirmDialog) {
            UI.showDialog(
                title,
                message,
                [
                    {
                        text: "取消",
                        callback: () => { }
                    },
                    {
                        text: "应用",
                        callback: () => {
                            this.overwriteApiDomains(domains)
                            this._shuntMapping = null
                            this._shuntResults = null
                            this.refreshImgUrl(true)
                        }
                    }
                ]
            )
        } else {
            this.overwriteApiDomains(domains)
        }
    }

    async refreshImgUrl(showMessage) {
        let option = parseInt(this.loadSetting('imageStream')) || 1
        let mapping = await this._buildShuntMapping()
        let actualIndex = mapping[Math.min(option - 1, mapping.length - 1)]

        let res = await this.get(
            `${this.baseUrl}/setting?app_img_shunt=${actualIndex}&express=`
        )
        let setting = JSON.parse(res)
        if (setting["img_host"]) {
            if (showMessage) {
                UI.showMessage(`图片分流 ${option} → 实际线路${actualIndex}:\n${setting["img_host"]}`)
            }
            this.overwriteImgUrl(setting["img_host"])
        }
    }

    /**
     * 构建去重后的分流映射表：选项 N → 第 N 个不重复的实际分流编号
     * 同时缓存所有分流的原始结果供 testImageSpeed 复用
     * @returns {Promise<number[]>} 如 [1, 2, 3, 4, 6, 9]
     */
    async _buildShuntMapping(forceRefresh = false) {
        if (!forceRefresh && this._shuntMapping && this._shuntMapping.length > 0) {
            return this._shuntMapping
        }
        const MAX_SHUNTS = 10
        const seenUrls = new Map()
        const uniqueIndices = []

        const tasks = []
        for (let i = 1; i <= MAX_SHUNTS; i++) {
            tasks.push(
                this._fetchCdnUrl(i).catch(() => ({ index: i, url: null }))
            )
        }
        const results = await Promise.all(tasks)

        for (const r of results) {
            if (r.url && !seenUrls.has(r.url)) {
                seenUrls.set(r.url, r.index)
                uniqueIndices.push(r.index)
            }
        }

        this._shuntMapping = uniqueIndices
        this._shuntResults = results
        return uniqueIndices
    }

    // ---------- 节点 Ping ----------
    async testApiNode(domain) {
        let testPath = "/promote?page=1"
        let url = `https://${domain}${testPath}`
        let time = Math.floor(Date.now() / 1000)
        let startTime = Date.now()

        try {
            let res = await Promise.race([
                Network.get(url, this.getApiHeaders(time)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
            ])
            if (res.status !== 200) {
                return { success: false, latency: 0 }
            }
            let latency = Date.now() - startTime
            return { success: true, latency: latency }
        } catch (e) {
            return { success: false, latency: 0 }
        }
    }

    formatSpeed(speedMBps) {
        if (speedMBps >= 1) {
            return `${speedMBps.toFixed(2)} MB/s`
        }
        return `${(speedMBps * 1024).toFixed(1)} KB/s`
    }

    formatSize(bytes) {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`
        }
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    async optimizeNodes() {
        UI.showMessage("正在测试节点延迟...")
        const domains = JM.apiDomains

        // 同步创建所有 Promise，确保请求同时发出
        const promises = []
        for (let i = 0; i < domains.length; i++) {
            promises.push(this.testApiNode(domains[i]))
        }
        const nodeResults = await Promise.all(promises)

        const results = []
        for (let i = 0; i < domains.length; i++) {
            results.push({
                index: i + 1,
                domain: domains[i],
                latency: nodeResults[i].latency,
                success: nodeResults[i].success
            })
        }

        results.sort((a, b) => {
            if (!a.success && !b.success) return 0
            if (!a.success) return 1
            if (!b.success) return -1
            return a.latency - b.latency
        })

        let message = "节点延迟测试结果:\n\n"
        for (let i = 0; i < results.length; i++) {
            let r = results[i]
            let status = r.success ? `${r.latency}ms` : "连接失败"
            let mark = i === 0 && r.success ? " 👈 最快" : ""
            message += `线路${r.index}: ${r.domain}\n延迟: ${status}${mark}\n\n`
        }

        if (!results[0].success) {
            message += "所有节点均连接失败，请检查网络后重试"
        }

        UI.showDialog(
            "节点延迟",
            message,
            [
                { text: "关闭", callback: () => { } },
                { text: "重新测试", callback: () => setTimeout(() => this.optimizeNodes(), 100) }
            ]
        )
    }

    // ---------- 图片分流测速 ----------
    async testImageSpeed() {
        const MAX_OPTIONS = 5
        const TEST_IMG_BASE = "/media/photos/209654/"
        const TEST_IMG_NAMES = ["00001.webp", "00002.webp", "00003.webp"]
        const IMG_TIMEOUT_MS = 5000

        UI.showMessage("正在获取分流列表...")

        // ===== 第一步：获取去重映射（选项 N → 实际线路编号） =====
        const mapping = await this._buildShuntMapping(true)
        const optionIndices = mapping.slice(0, MAX_OPTIONS)

        // ===== 第二步：并行获取每个选项对应的 CDN 域名 =====
        const fetchTasks = optionIndices.map(idx =>
            this._fetchCdnUrl(idx).catch(() => ({ index: idx, url: null }))
        )
        const cdnResults = await Promise.all(fetchTasks)

        UI.showMessage("正在测速...")

        // ===== 第三步：并行测速 =====
        const testTasks = cdnResults.map(r => {
            if (!r.url) return Promise.resolve({ speed: 0, size: 0, success: false })
            return this._testSingleDomain(r.url, TEST_IMG_BASE, TEST_IMG_NAMES, IMG_TIMEOUT_MS)
        })
        const testResults = await Promise.all(testTasks)

        // ===== 第四步：构建结果并排序 =====
        const sorted = optionIndices.map((shuntIdx, i) => ({
            option: i + 1,
            shunt: shuntIdx,
            url: cdnResults[i].url || "获取失败",
            speed: cdnResults[i].url ? testResults[i].speed : 0,
            size: cdnResults[i].url ? testResults[i].size : 0,
            success: cdnResults[i].url ? testResults[i].success : false
        }))

        // 按速度降序
        sorted.sort((a, b) => {
            if (!a.success && !b.success) return 0
            if (!a.success) return 1
            if (!b.success) return -1
            return b.speed - a.speed
        })

        let message = "图片分流测速结果:\n\n"
        for (let i = 0; i < sorted.length; i++) {
            const r = sorted[i]
            let status
            if (r.success) {
                status = `${this.formatSpeed(r.speed)}  (${this.formatSize(r.size)})`
            } else {
                status = "连接失败"
            }
            const mark = (i === 0 && r.success) ? " 👈 最快" : ""
            message += `选项${r.option} → 实际线路${r.shunt}\n${r.url}\n速度: ${status}${mark}\n\n`
        }

        if (sorted.every(r => !r.success)) {
            message += "所有节点均连接失败，请检查网络后重试"
        }

        UI.showDialog(
            "图片分流测速",
            message,
            [
                { text: "关闭", callback: () => { } },
                { text: "重新测速", callback: () => setTimeout(() => this.testImageSpeed(), 100) }
            ]
        )
    }

    /**
     * 获取指定线路的图片 CDN 域名
     * @param {number} index - 线路编号 (1-10)
     * @returns {Promise<{index: number, url: string|null}>}
     */
    async _fetchCdnUrl(index) {
        try {
            const res = await this.get(`${this.baseUrl}/setting?app_img_shunt=${index}&express=`)
            const setting = JSON.parse(res)
            const url = setting["img_host"] || null
            return { index, url }
        } catch (e) {
            return { index, url: null }
        }
    }

    /**
     * 对单个 CDN 域名进行测速：并行下载多张小图，计算总大小与耗时
     * @param {string} cdnUrl - CDN 域名（如 "https://cdn-xxx.net"）
     * @param {string} imgBase - 图片路径前缀
     * @param {string[]} imgNames - 待下载的图片文件名列表
     * @param {number} timeoutMs - 单张图片超时毫秒数
     * @returns {Promise<{speed: number, size: number, success: boolean}>}
     */
    async _testSingleDomain(cdnUrl, imgBase, imgNames, timeoutMs) {
        const startTime = Date.now()
        let totalSize = 0
        let anySuccess = false

        // 并行下载所有图片
        const downloads = imgNames.map(imgName =>
            this._downloadImage(`${cdnUrl}${imgBase}${imgName}`, timeoutMs)
        )

        const results = await Promise.all(downloads)

        for (const data of results) {
            if (data !== null) {
                totalSize += data.byteLength
                anySuccess = true
            }
        }

        if (!anySuccess || totalSize === 0) {
            return { speed: 0, size: 0, success: false }
        }

        const elapsed = (Date.now() - startTime) / 1000
        const speedMBps = (totalSize / 1024 / 1024) / elapsed

        return { speed: speedMBps, size: totalSize, success: true }
    }

    /**
     * 下载单张图片，带超时控制
     * @param {string} url - 图片完整 URL
     * @param {number} timeoutMs - 超时毫秒数
     * @returns {Promise<ArrayBuffer|null>} - 成功返回 ArrayBuffer，失败返回 null
     */
    async _downloadImage(url, timeoutMs) {
        try {
            const fetchPromise = fetch(url, { headers: this.getImgHeaders() })
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), timeoutMs)
            )
            const res = await Promise.race([fetchPromise, timeoutPromise])
            if (res.status !== 200) return null
            const data = await res.arrayBuffer()
            return data
        } catch (e) {
            return null
        }
    }
    // ---------- 数据转换 ----------
    parseComic(comic) {
        let id = comic.id.toString()
        let author = comic.author
        let title = comic.name
        let description = comic.description ?? ""
        let cover = this.getCoverUrl(id)
        let tags = []
        if (comic?.category?.title) {
            tags.push(comic.category.title)
        }
        if (comic?.category_sub?.title) {
            tags.push(comic.category_sub.title)
        }
        return new Comic({
            id: id,
            title: title,
            subTitle: author,
            cover: cover,
            tags: tags,
            description: description
        })
    }

    convertData(input, secret) {
        let key = Convert.encodeUtf8(Convert.hexEncode(Convert.md5(Convert.encodeUtf8(secret))))
        let data = Convert.decodeBase64(input)
        let decrypted = Convert.decryptAesEcb(data, key)
        let res = Convert.decodeUtf8(decrypted)
        let start = 0
        while (start < res.length && res[start] !== '{' && res[start] !== '[') {
            start++
        }
        let end = res.length - 1
        while (end > start && res[end] !== '}' && res[end] !== ']') {
            end--
        }
        return res.substring(start, end + 1)
    }

    // ---------- 核心请求方法 ----------
    async get(url) {
        let time = Math.floor(Date.now() / 1000)
        let kJmSecret = "185Hcomic3PAPP7R"
        let res = await Network.get(url, this.getApiHeaders(time))
        if (res.status !== 200) {
            if (res.status === 401) {
                let json = JSON.parse(res.body);
                let message = json.errorMsg;
                if (message === "請先登入會員") {
                    if (this._loggedIn && this.loadSetting('autoReLogin')) {
                        try {
                            let renewed = await this._handleAutoRenew(url, null, 'GET');
                            if (renewed !== false) return renewed;
                        } catch (e) { }
                    }
                    return await this.handleLoginExpired(url, null, 'GET');
                }
                throw message ?? '无效状态码：' + res.status;
            }
            throw '无效状态码：' + res.status;
        }
        let json = JSON.parse(res.body)
        let data = json.data
        if (typeof data !== 'string') {
            throw '无效数据'
        }
        return this.convertData(data, `${time}${kJmSecret}`)
    }

    async post(url, body) {
        let time = Math.floor(Date.now() / 1000)
        let kJmSecret = "185Hcomic3PAPP7R"
        let res = await Network.post(url, {
            ...this.getApiHeaders(time),
            "Content-Type": "application/x-www-form-urlencoded"
        }, body)
        if (res.status !== 200) {
            if (res.status === 401) {
                let json = JSON.parse(res.body);
                let message = json.errorMsg;
                if (message === "請先登入會員") {
                    if (this._loggedIn && this.loadSetting('autoReLogin')) {
                        try {
                            let renewed = await this._handleAutoRenew(url, body, 'POST');
                            if (renewed !== false) return renewed;
                        } catch (e) { }
                    }
                    return await this.handleLoginExpired(url, body, 'POST');
                }
                throw message ?? '无效状态码：' + res.status;
            }
            throw '无效状态码：' + res.status;
        }
        let json = JSON.parse(res.body)
        let data = json.data
        if (typeof data !== 'string') {
            throw '无效数据'
        }
        return this.convertData(data, `${time}${kJmSecret}`)
    }

    // ---------- 登录过期处理（支持重试） ----------
    handleLoginExpired(originalUrl, originalBody, method) {
        if (this._reLoginDialogShown) {
            return Promise.reject(new Error("登录弹窗已显示，请先处理当前弹窗"));
        }
        this._reLoginDialogShown = true;

        return new Promise((resolve, reject) => {
            UI.showDialog(
                "登录过期",
                "登录已过期，是否使用设置中的账号密码重新登录？",
                [
                    {
                        text: "取消",
                        callback: () => {
                            this._reLoginDialogShown = false;
                            reject("用户取消重登");
                        }
                    },
                    {
                        text: "重新登录",
                        callback: async () => {
                            this._reLoginDialogShown = false;
                            const username = this.loadSetting('jm_account');
                            const password = this.loadSetting('jm_pwd');
                            if (!username || !password) {
                                UI.showMessage("请先在设置中填写账号和密码");
                                reject("无凭证");
                                return;
                            }
                            try {
                                await this.account.login(username, password);
                                this._loggedIn = true;
                                UI.showMessage("✅ 登录成功，正在重试...");
                                let result;
                                if (method === 'GET') {
                                    result = await this.get(originalUrl);
                                } else {
                                    result = await this.post(originalUrl, originalBody);
                                }
                                resolve(result);
                            } catch (e) {
                                UI.showMessage("❌ 登录失败，请检查账号密码或网络");
                                reject("登录失败: " + (e.message || e));
                            }
                        }
                    }
                ]
            );
        });
    }

    // ---------- 自动续期逻辑 ----------
    async _handleAutoRenew(originalUrl, originalBody, method) {
        if (this._renewing) return false;
        this._renewing = true;

        try {
            const username = this.loadSetting('jm_account');
            const password = this.loadSetting('jm_pwd');
            if (!username || !password) {
                UI.showMessage("❌ 请先在设置中填写账号和密码");
                return false;
            }

            let time = Math.floor(Date.now() / 1000);
            let kJmSecret = "185Hcomic3PAPP7R";

            let loginRes = await Network.post(`${this.baseUrl}/login`, {
                ...this.getApiHeaders(time),
                "Content-Type": "application/x-www-form-urlencoded"
            }, `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);

            if (loginRes.status !== 200) {
                UI.showMessage(`❌ 续期失败：HTTP ${loginRes.status}`);
                return false;
            }

            let loginJson = JSON.parse(loginRes.body);
            if (!loginJson.data || typeof loginJson.data !== 'string') {
                UI.showMessage("❌ 续期失败：响应异常");
                return false;
            }

            let loginData = this.convertData(loginJson.data, `${time}${kJmSecret}`);
            let json = JSON.parse(loginData);
            if (!json.uid) {
                UI.showMessage("❌ 续期失败：账号或密码错误");
                return false;
            }

            this.saveData("uid", json.uid);
            this._loggedIn = true;
            UI.showMessage("✅ 自动续期成功，正在重试...", true);

            await new Promise(r => setTimeout(r, 800));

            if (method === 'GET') {
                return await this.get(originalUrl);
            } else {
                return await this.post(originalUrl, originalBody);
            }
        } catch (e) {
            UI.showMessage(`❌ 续期异常：${e.message || e}`);
            return false;
        } finally {
            this._renewing = false;
        }
    }

    // ---------- 签到 ----------
    async dailyCheckIn(isTask = false) {
        if (this.dailyCheckInInProgress) return
        this.dailyCheckInInProgress = true
        const throwError = (msg) => {
            UI.showMessage(msg)
            throw msg
        }
        try {
            const lastCheckInDate = this.loadData("lastCheckInDate")
            const today = new Date().toLocaleDateString('zh-CN')
            if (lastCheckInDate && lastCheckInDate === today) {
                if (isTask) return
                throwError("今日已签到")
            }
            if (!this._loggedIn) {
                // 尝试用设置中的账号密码自动登录
                const username = this.loadSetting('jm_account');
                const password = this.loadSetting('jm_pwd');
                if (username && password) {
                    try {
                        await this.account.login(username, password);
                        this._loggedIn = true;
                        UI.showMessage("✅ 自动登录成功");
                    } catch (e) {
                        if (isTask) return;
                        throwError("自动登录失败，请检查账号密码或网络");
                    }
                } else {
                    if (isTask) return;
                    throwError("请先在设置中填写账号和密码");
                }
            }
            const uid = this.loadData("uid")
            if (!uid) {
                throwError("无效用户ID，请重新登录")
            }
            const checkRecordRes = await this.get(`${this.baseUrl}/daily?user_id=${uid}`)
            const checkRecord = JSON.parse(checkRecordRes)
            if (!('daily_id' in checkRecord)) {
                throwError("无效的签到标识，签到失败")
            }
            const daily_id = checkRecord.daily_id
            const checkResultRes = await this.post(`${this.baseUrl}/daily_chk`, `user_id=${uid}&daily_id=${daily_id}`)
            const checkResult = JSON.parse(checkResultRes)
            if (!checkResult.msg) {
                throwError("无效的签到结果，签到失败")
            }
            UI.showMessage(checkResult.msg)
            this.saveData("lastCheckInDate", today)
        } finally {
            this.dailyCheckInInProgress = false
        }
    }

    // ---------- 账号管理 ----------
    account = {
        login: async (account, pwd) => {
            let time = Math.floor(Date.now() / 1000);
            let res = await this.post(
                `${this.baseUrl}/login`,
                `username=${encodeURIComponent(account)}&password=${encodeURIComponent(pwd)}`
            );
            let json = JSON.parse(res);
            if (json.uid) {
                this.saveData("uid", json.uid);
                this._loggedIn = true;
                return "ok";
            }
            throw "登录失败，未返回 uid";
        },

        logout: () => {
            for (let url of JM.apiDomains) {
                Network.deleteCookies(url)
            }
            this._loggedIn = false;
            this.saveData("uid", null);
        },

        registerWebsite: null
    }

    // ---------- 探索 ----------
    explore = [
        {
            title: "禁漫天堂",
            type: "multiPartPage",

            load: async (page) => {
                let res = await this.get(`${this.baseUrl}/promote?page=0`)
                let result = []

                for (let e of JSON.parse(res)) {
                    let title = e["title"]
                    let type = e.type
                    let id = e.id.toString()
                    if (type === 'category_id') {
                        id = e.slug
                    }
                    if (['library', 'novels'].includes(type)) {
                        continue
                    }
                    let comics = e.content.map((e) => this.parseComic(e))
                    result.push({
                        title: e.title,
                        comics: comics,
                        viewMore: `category:${title}@${id}`
                    })
                }

                return result
            },
        }
    ]

    // ---------- 分类 ----------
    category = {
        title: "禁漫天堂",
        parts: [
            {
                name: "每週必看",
                type: "fixed",
                categories: ["每週必看"],
                itemType: "category",
            },
            {
                name: "成人A漫",
                type: "fixed",
                categories: ["最新A漫", "同人", "單本", "短篇", "其他類", "韓漫", "美漫", "Cosplay", "3D", "禁漫漢化組"],
                itemType: "category",
                categoryParams: [
                    "0",
                    "doujin",
                    "single",
                    "short",
                    "another",
                    "hanman",
                    "meiman",
                    "another_cosplay",
                    "3D",
                    "禁漫漢化組"
                ],
            },
            {
                name: "主題A漫",
                type: "fixed",
                categories: [
                    '無修正', '劇情向', '青年漫', '校服', '純愛', '人妻', '教師', '百合',
                    'Yaoi', '性轉', 'NTR', '女裝', '癡女', '全彩', '女性向', '完結', '禁漫漢化組'
                ],
                itemType: "search",
            },
            {
                name: "角色扮演",
                type: "fixed",
                categories: [
                    '御姐', '熟女', '巨乳', '貧乳', '女性支配', '教師', '女僕', '護士',
                    '泳裝', '眼鏡', '連褲襪', '其他制服', '兔女郎'
                ],
                itemType: "search",
            },
            {
                name: "特殊PLAY",
                type: "fixed",
                categories: [
                    '群交', '足交', '束縛', '肛交', '阿黑顏', '藥物', '扶他', '調教',
                    '野外露出', '催眠', '自慰', '觸手', '獸交', '亞人', '怪物女孩', '皮物', 'ryona', '騎大車'
                ],
                itemType: "search",
            },
            {
                name: "特殊PLAY",
                type: "fixed",
                categories: ['CG', '重口', '獵奇', '非H', '血腥暴力', '站長推薦'],
                itemType: "search",
            },
        ],
        enableRankingPage: true,
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            if (category !== "每週必看") {
                param ??= category
                param = encodeURIComponent(param)
                let res = await this.get(`${this.baseUrl}/categories/filter?o=${options[0]}&c=${param}&page=${page}`)
                let data = JSON.parse(res)
                let total = data.total
                let maxPage = Math.ceil(total / 80)
                let comics = data.content.map((e) => this.parseComic(e))
                return {
                    comics: comics,
                    maxPage: maxPage
                }
            } else {
                let res = await this.get(`${this.baseUrl}/week/filter?id=${options[0]}&type=${options[1]}&page=0`)
                let data = JSON.parse(res)
                let comics = data.list.map((e) => this.parseComic(e))
                return {
                    comics: comics,
                    maxPage: 1
                }
            }
        },
        optionLoader: async (category, param) => {
            if (category !== "每週必看") {
                return [
                    {
                        label: "排序",
                        options: [
                            "mr-最新",
                            "mv-總排行",
                            "mv_m-月排行",
                            "mv_w-周排行",
                            "mv_t-日排行",
                            "mp-最多圖片",
                            "tf-最多喜歡",
                        ],
                    }
                ]
            } else {
                let res = await this.get(`${this.baseUrl}/week`)
                let data = JSON.parse(res)
                let options = []
                for (let e of data["categories"]) {
                    options.push(`${e["id"]}-${e["time"]}`)
                }
                return [
                    {
                        label: "時間",
                        options: options,
                    },
                    {
                        label: "類型",
                        options: [
                            "manga-日漫",
                            "hanman-韓漫",
                            "another-其他",
                        ]
                    }
                ]
            }
        },
        ranking: {
            options: [
                "mv-總排行",
                "mv_m-月排行",
                "mv_w-周排行",
                "mv_t-日排行",
            ],
            load: async (option, page) => {
                return this.categoryComics.load("總排行", "0", [option], page)
            }
        }
    }

    // ---------- 搜索 ----------
    search = {
        load: async (keyword, options, page) => {
            keyword = keyword.trim()
            keyword = encodeURIComponent(keyword)
            keyword = keyword.replace(/%20/g, '+')
            let url = `${this.baseUrl}/search?search_query=${keyword}&o=${options[0]}`
            if (page > 1) {
                url += `&page=${page}`
            }
            let res = await this.get(url)
            let data = JSON.parse(res)
            let total = data.total
            let maxPage = Math.ceil(total / 80)
            let comics = data.content.map((e) => this.parseComic(e))
            return {
                comics: comics,
                maxPage: maxPage
            }
        },

        optionList: [
            {
                type: "select",
                options: [
                    "mr-最新",
                    "mv-總排行",
                    "mv_m-月排行",
                    "mv_w-周排行",
                    "mv_t-日排行",
                    "mp-最多圖片",
                    "tf-最多喜歡",
                ],
                label: "排序",
            }
        ],
    }

    // ---------- 漫画详情 ----------
    comic = {
        loadInfo: async (id) => {
            if (id.startsWith('jm')) {
                id = id.substring(2)
            }
            let colonIdx = Math.max(id.indexOf(':'), id.indexOf('：'));
            if (colonIdx !== -1) {
                let afterColon = id.substring(colonIdx + 1);
                let numbers = afterColon.match(/\d+/g);
                if (numbers) {
                    let combined = numbers.join('');
                    if (combined.length >= 5) {
                        id = combined;
                    }
                }
            }
            if (!/^\d+$/.test(id)) {
                let idMatch = id.match(/(\d{5,})/);
                if (idMatch) {
                    id = idMatch[1];
                }
            }
            let res = await this.get(`${this.baseUrl}/album?id=${id}`);
            let data = JSON.parse(res)
            let author = data.author ?? []
            let works = data.works ?? []
            let actors = data.actors ?? []
            let chapters = new Map()
            let series = (data.series ?? []).sort((a, b) => a.sort - b.sort)
            for (let e of series) {
                let title = e.name ?? ''
                title = title.trim()
                if (title.length === 0) {
                    title = `第${e["sort"]}話`
                }
                let id = e.id.toString()
                chapters.set(id, title)
            }
            if (chapters.size === 0) {
                chapters.set(id, '第1話')
            }
            let tags = data.tags ?? []
            let related = data["related_list"].map((e) => new Comic({
                id: e.id.toString(),
                title: e.name,
                subtitle: e.author ?? "",
                cover: this.getCoverUrl(e.id),
                description: e.description ?? ""
            }))
            let updateTimeStamp = data["addtime"];
            let date = new Date(updateTimeStamp * 1000)
            let updateDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

            return new ComicDetails({
                title: data.name,
                cover: this.getCoverUrl(id),
                description: data.description,
                likesCount: Number(data.likes),
                chapters: chapters,
                tags: {
                    "Author": author,
                    "Tag": tags,
                    "Work": works,
                    "Actor": actors,
                    "View": data.total_views ? [data.total_views] : [],
                },
                recommend: related,
                isLiked: data.liked ?? false,
                updateTime: updateDate,
            })
        },
        loadEp: async (comicId, epId) => {
            let res = await this.get(`${this.baseUrl}/chapter?id=${epId}`);
            let data = JSON.parse(res)
            let images = data.images.map((e) => this.getImageUrl(epId, e))
            return {
                images: images
            }
        },
        onImageLoad: (url, comicId, epId) => {
            const scrambleId = 220980;
            let pictureName = "";
            for (let i = url.length - 1; i >= 0; i--) {
                if (url[i] === "/") {
                    pictureName = url.substring(i + 1, url.length - 5);
                    break;
                }
            }
            epId = Number(epId);
            let num = 0;
            if (epId < scrambleId) {
                num = 0;
            } else if (epId < 268850) {
                num = 10;
            } else if (epId > 421925) {
                let str = epId.toString() + pictureName;
                let bytes = Convert.encodeUtf8(str);
                let hash = Convert.md5(bytes);
                let hashStr = Convert.hexEncode(hash);
                let charCode = hashStr.charCodeAt(hashStr.length - 1);
                let remainder = charCode % 8;
                num = remainder * 2 + 2;
            } else {
                let str = epId.toString() + pictureName;
                let bytes = Convert.encodeUtf8(str);
                let hash = Convert.md5(bytes);
                let hashStr = Convert.hexEncode(hash);
                let charCode = hashStr.charCodeAt(hashStr.length - 1);
                let remainder = charCode % 10;
                num = remainder * 2 + 2;
            }
            if (num <= 1) {
                return {
                    headers: this.getImgHeaders(),
                    onLoadFailed: this.comic._makeImageRetry(url),
                };
            }
            return {
                headers: this.getImgHeaders(),
                modifyImage: url.endsWith(".gif")
                    ? null
                    : `
                    let modifyImage = (image) => {
                        const num = ${num}
                        let blockSize = Math.floor(image.height / num)
                        let remainder = image.height % num
                        let blocks = []
                        for(let i = 0; i < num; i++) {
                            let start = i * blockSize
                            let end = start + blockSize + (i !== num - 1 ? 0 : remainder)
                            blocks.push({
                                start: start,
                                end: end
                            })
                        }
                        let res = Image.empty(image.width, image.height)
                        let y = 0
                        for(let i = blocks.length - 1; i >= 0; i--) {
                            let block = blocks[i]
                            let currentHeight = block.end - block.start
                            res.fillImageRangeAt(0, y, image, 0, block.start, image.width, currentHeight)
                            y += currentHeight
                        }
                        return res
                    }
                `,
                onLoadFailed: this.comic._makeImageRetry(url),
            };
        },
        _makeImageRetry: (url) => {
            let tried = 0;
            return () => {
                const fallbacks = JM.fallbackImageUrls.filter((u) => !url.startsWith(u));
                if (tried >= fallbacks.length) return null;
                const newUrl = url.replace(/https:\/\/[^/]+/, fallbacks[tried]);
                tried++;
                return { url: newUrl, headers: this.getImgHeaders() };
            };
        },
        onThumbnailLoad: (url) => {
            return {
                headers: this.getImgHeaders()
            }
        },
        likeComic: async (id, isLike) => {
            let res = await this.post(`${this.baseUrl}/like`, `id=${id}`)
            let json = JSON.parse(res)
            if (json.code !== 200 || json.status === 'error') {
                throw json.msg ?? '点赞/取消点赞失败'
            }
            return "ok"
        },
        loadComments: async (comicId, subId, page, replyTo) => {
            let url = `${this.baseUrl}/forum?mode=manhua&aid=${comicId}&page=${page}`
            if (replyTo) {
                url += `&comment_id=${replyTo}`
            }
            let res = await this.get(url)
            let json = JSON.parse(res)
            const pageSize = 6
            return {
                comments: json.list.map((e) => new Comment({
                    id: e.id?.toString(),
                    avatar: this.getAvatarUrl(e.photo),
                    userName: e.username,
                    time: e.addtime,
                    content: e.content.substring(e.content.indexOf('>') + 1, e.content.lastIndexOf('<')),
                    replyTo: replyTo || undefined,
                })),
                maxPage: Math.floor(json.total / pageSize) + 1
            }
        },
        sendComment: async (comicId, subId, content, replyTo) => {
            let params = `video_id=${comicId}&comment=${encodeURIComponent(content)}&status=true`
            if (replyTo) {
                params += `&comment_id=${replyTo}&is_reply=1&forum_subject=1`
            }
            let res = await this.post(`${this.baseUrl}/comment`, params)
            let json = JSON.parse(res)
            if (json.status === "fail") {
                throw json.msg ?? 'Failed to send comment'
            }
            return "ok"
        },
        loadChapterComments: async (comicId, epId, page, replyTo) => {
            let url = `${this.baseUrl}/forum?mode=manhua&aid=${epId}&page=${page}`
            if (replyTo) {
                url += `&comment_id=${replyTo}`
            }
            let res = await this.get(url)
            let json = JSON.parse(res)
            const pageSize = 6
            return {
                comments: json.list.map((e) => new Comment({
                    id: e.id?.toString(),
                    avatar: this.getAvatarUrl(e.photo),
                    userName: e.username,
                    time: e.addtime,
                    content: e.content.substring(e.content.indexOf('>') + 1, e.content.lastIndexOf('<')),
                    replyTo: replyTo || undefined,
                })),
                maxPage: Math.floor(json.total / pageSize) + 1
            }
        },
        sendChapterComment: async (comicId, epId, content, replyTo) => {
            let params = `video_id=${epId}&comment=${encodeURIComponent(content)}&status=true`
            if (replyTo) {
                params += `&comment_id=${replyTo}&is_reply=1&forum_subject=1`
            }
            let res = await this.post(`${this.baseUrl}/comment`, params)
            let json = JSON.parse(res)
            if (json.status === "fail") {
                throw json.msg ?? 'Failed to send comment'
            }
            return "ok"
        },
        idMatch: "^(?:jm)?(\\d{5,})$|[:：]\\s*(\\d{5,})|[:：].*\\d+.*\\d+",
        enableTagsTranslate: true,
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    // ---------- 设置 ----------
    settings = {
        refreshDomains: {
            title: "Refresh Domain List",
            type: "callback",
            buttonText: "Refresh",
            callback: () => this.refreshApiDomains(true)
        },
        refreshDomainsOnStart: {
            title: "Refresh Domain List on Startup",
            type: "switch",
            default: true,
        },
        checkUpdateOnStart: {
            title: "启动时检查更新",
            type: "switch",
            default: true,
        },
        apiDomain: {
            title: "Api Domain",
            type: "select",
            options: [
                { value: '1' },
                { value: '2' },
                { value: '3' },
                { value: '4' },
                { value: '5' },
            ],
            default: "1",
        },
        imageStream: {
            title: "Image Stream",
            type: "select",
            options: [
                { value: '1' },
                { value: '2' },
                { value: '3' },
                { value: '4' },
                { value: '5' },
            ],
            default: "1",
        },
        optimizeNodes: {
            title: "节点优选",
            type: "callback",
            buttonText: "开始测速",
            callback: () => this.optimizeNodes()
        },
        imageSpeedTest: {
            title: "图片分流测速",
            type: "callback",
            buttonText: "开始测速",
            callback: () => this.testImageSpeed()
        },
        dailyCheckInTask: {
            title: "每日自动签到",
            type: "switch",
            default: true
        },
        dailyCheckIn: {
            title: "手动签到",
            type: "callback",
            buttonText: "签到",
            callback: () => this.dailyCheckIn()
        },
        autoReLogin: {
            title: "自动重登（保持登录）",
            type: "switch",
            default: true,
        },
        // 账号密码输入框（避免关键字屏蔽）
        jm_account: {
            title: "JM 账号(替换软件登录)",
            type: "input",
            default: ""
        },
        jm_pwd: {
            title: "JM 密码(请退出下方的软件登录)",
            type: "input",   // 如果框架不支持 password，可改为 input，但会明文显示
            default: ""
        },
    }

    // ---------- 翻译 ----------
    translation = {
        'zh_CN': {
            'Refresh Domain List': '刷新域名列表',
            'Refresh': '刷新',
            'Refresh Domain List on Startup': '启动时刷新域名列表',
            'Api Domain': 'Api域名',
            'Image Stream': '图片分流',
            'Daily Check-in Task': '每日自动签到',
            'Manual Check-In': '手动签到',
            'Check-In': '签到',
            'Add Time': '添加时间',
            'Update Time': '更新时间',
            'All': '全部',
            'Author': '作者',
            'Tag': '标签',
            'Work': '作品',
            'Actor': '角色',
            'View': '浏览量',
            'Optimize Nodes': '节点优选',
            'Image Speed Test': '图片分流测速',
            'Start Test': '开始测速',
            'autoReLogin': '自动重登（保持登录）',
            'jm_account': 'JM 账号',
            'jm_pwd': 'JM 密码',
            'checkUpdateOnStart': '启动时检查更新',
            '启动时检查更新': '启动时检查更新',
        },
        'zh_TW': {
            'Refresh Domain List': '刷新域名列表',
            'Refresh': '刷新',
            'Refresh Domain List on Startup': '啟動時刷新域名列表',
            'Api Domain': 'Api域名',
            'Image Stream': '圖片分流',
            'Daily Check-in Task': '每日自動簽到',
            'Manual Check-In': '手動簽到',
            'Check-In': '簽到',
            'Add Time': '添加時間',
            'Update Time': '更新時間',
            'All': '全部',
            'Author': '作者',
            'Tag': '標籤',
            'Work': '作品',
            'Actor': '角色',
            'View': '瀏覽量',
            'Optimize Nodes': '節點優選',
            'Image Speed Test': '圖片分流測速',
            'Start Test': '開始測速',
            'autoReLogin': '自動重登（保持登錄）',
            'jm_account': 'JM 帳號',
            'jm_pwd': 'JM 密碼',
            'checkUpdateOnStart': '啟動時檢查更新',
            '启动时检查更新': '啟動時檢查更新',
        },
    }
}