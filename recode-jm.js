class JM extends ComicSource {
    name = "禁漫天堂(重构)"
    key = "jm"
    version = "1.5.0"
    minAppVersion = "1.5.0"

    static jmVersion = "2.0.16"
    static jmPkgName = "com.example.app"
    url = "https://ghfast.top/https://raw.githubusercontent.com/BB-CHICKEN/venera-jm.js/main/recode-jm.js"

    dailyCheckInInProgress = false

    static fallbackServers = [
        "www.cdntwice.org",
        "www.cdnsha.org",
        "www.cdnaspa.cc",
        "www.cdnntr.cc",
    ];

    static imageUrl = "https://cdn-msp.jmapinodeudzn.net"

    static ua = "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36"

    get ua() {
        return JM.ua;
    }

    get baseUrl() {
        let index = parseInt(this.loadSetting('apiDomain')) - 1
        return `https://${JM.apiDomains[index]}`
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

    async init() {
        if (this.loadSetting('refreshDomainsOnStart')) await this.refreshApiDomains(false)
        this.refreshImgUrl(false)
    }

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
                servers = json["Server"].slice(0, 4)
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
        let index = this.loadSetting('imageStream')
        let res = await this.get(
            `${this.baseUrl}/setting?app_img_shunt=${index}&express=`
        )
        let setting = JSON.parse(res)
        if (setting["img_host"]) {
            if (showMessage) {
                UI.showMessage(`图片分流 ${index}:\n${setting["img_host"]}`)
            }
            this.overwriteImgUrl(setting["img_host"])
        }
    }
    async testApiNode(domain) {
        let testPath = "/promote?page=0"
        let url = `https://${domain}${testPath}`
        let time = Math.floor(Date.now() / 1000)
        let startTime = Date.now()

        try {
            let fetchPromise = fetch(url, { headers: this.getApiHeaders(time) })
            let timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 10000)
            )
            let res = await Promise.race([fetchPromise, timeoutPromise])
            if (res.status !== 200) {
                return { success: false, speed: 0, size: 0, latency: 0 }
            }
            let latency = Date.now() - startTime
            let data = await res.text()
            let elapsed = latency / 1000
            let encoded = Convert.encodeUtf8(data)
            let sizeBytes = encoded.byteLength || encoded.length || data.length
            let speedMBps = (sizeBytes / 1024 / 1024) / elapsed
            return { success: true, speed: speedMBps, size: sizeBytes, latency: latency }
        } catch (e) {
            return { success: false, speed: 0, size: 0, latency: 0 }
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
        UI.showMessage("正在测试节点速度...")

        let results = []
        for (let i = 0; i < JM.apiDomains.length; i++) {
            let domain = JM.apiDomains[i]
            let result = await this.testApiNode(domain)
            results.push({
                index: i + 1,
                domain: domain,
                speed: result.speed,
                size: result.size,
                latency: result.latency,
                success: result.success
            })
        }

        results.sort((a, b) => {
            if (!a.success && !b.success) return 0
            if (!a.success) return 1
            if (!b.success) return -1
            return b.speed - a.speed
        })

        let message = "节点测速结果:\n\n"
        for (let i = 0; i < results.length; i++) {
            let r = results[i]
            let status = r.success
                ? `${r.latency}ms  |  ${this.formatSpeed(r.speed)}  (${this.formatSize(r.size)})`
                : "连接失败"
            let mark = ""
            if (i === 0 && r.success) {
                mark = " 👈 最快"
            }
            message += `线路${r.index}: ${r.domain}\n速度: ${status}${mark}\n\n`
        }

        if (!results[0].success) {
            message += "所有节点均连接失败，请检查网络后重试"
        }

        UI.showDialog(
            "节点测速",
            message,
            [
                {
                    text: "关闭",
                    callback: () => { }
                },
                {
                    text: "重新测速",
                    callback: () => setTimeout(() => this.optimizeNodes(), 100)
                }
            ]
        )
    }

    parseComic(comic) {
        let id = comic.id.toString()
        let author = comic.author
        let title = comic.name
        let description = comic.description ?? ""
        let cover = this.getCoverUrl(id)
        let tags = []
        if (comic["category"]["title"]) {
            tags.push(comic["category"]["title"])
        }
        if (comic["category_sub"]["title"]) {
            tags.push(comic["category_sub"]["title"])
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

    async get(url) {
        let time = Math.floor(Date.now() / 1000)
        let kJmSecret = "185Hcomic3PAPP7R"
        let res = await Network.get(url, this.getApiHeaders(time))
        if (res.status !== 200) {
            if (res.status === 401) {
                let json = JSON.parse(res.body)
                let message = json.errorMsg
                if (message === "請先登入會員" && this.isLogged) {
                    this.showReLoginDialog()
                    throw '登录已过期'
                }
                throw message ?? '无效状态码：' + res.status
            }
            throw '无效状态码：' + res.status
        }
        let json = JSON.parse(res.body)
        let data = json.data
        if (typeof data !== 'string') {
            throw '无效数据'
        }
        return this.convertData(data, `${time}${kJmSecret}`)
    }

    showReLoginDialog() {
        if (this._reLoginDialogShown) return
        this._reLoginDialogShown = true
        UI.showDialog(
            "登录过期",
            "登录已过期，是否重新登录？",
            [
                {
                    text: "取消",
                    callback: () => {
                        this._reLoginDialogShown = false
                        d
                    }
                },
                {
                    text: "重新登录",
                    callback: () => {
                        this._reLoginDialogShown = false
                        this.account.logout()
                        this.account.login()
                    }
                }
            ]
        )
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
                let json = JSON.parse(res.body)
                let message = json.errorMsg
                if (message === "請先登入會員" && this.isLogged) {
                    this.showReLoginDialog()
                    throw '登录已过期'
                }
                throw message ?? '无效状态码：' + res.status
            }
            throw '无效状态码：' + res.status
        }
        let json = JSON.parse(res.body)
        let data = json.data
        if (typeof data !== 'string') {
            throw '无效数据'
        }
        return this.convertData(data, `${time}${kJmSecret}`)
    }

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
            if (!this.isLogged) {
                if (isTask) return
                throwError("请先登录再签到")
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

    account = {
        login: async (account, pwd) => {
            let time = Math.floor(Date.now() / 1000)
            let res = await this.post(
                `${this.baseUrl}/login`,
                `username=${encodeURIComponent(account)}&password=${encodeURIComponent(pwd)}`
            )
            let json = JSON.parse(res)
            if (json.uid) {
                this.saveData("uid", json.uid)
            }
            throw '登录成功'
        },

        logout: () => {
            for (let url of JM.apiDomains) {
                Network.deleteCookies(url)
            }
        },

        registerWebsite: null
    }

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
                    '無修正',
                    '劇情向',
                    '青年漫',
                    '校服',
                    '純愛',
                    '人妻',
                    '教師',
                    '百合',
                    'Yaoi',
                    '性轉',
                    'NTR',
                    '女裝',
                    '癡女',
                    '全彩',
                    '女性向',
                    '完結',
                    '純愛',
                    '禁漫漢化組'
                ],
                itemType: "search",
            },
            {
                name: "角色扮演",
                type: "fixed",
                categories: [
                    '御姐',
                    '熟女',
                    '巨乳',
                    '貧乳',
                    '女性支配',
                    '教師',
                    '女僕',
                    '護士',
                    '泳裝',
                    '眼鏡',
                    '連褲襪',
                    '其他制服',
                    '兔女郎'
                ],
                itemType: "search",
            },
            {
                name: "特殊PLAY",
                type: "fixed",
                categories: [
                    '群交',
                    '足交',
                    '束縛',
                    '肛交',
                    '阿黑顏',
                    '藥物',
                    '扶他',
                    '調教',
                    '野外露出',
                    '催眠',
                    '自慰',
                    '觸手',
                    '獸交',
                    '亞人',
                    '怪物女孩',
                    '皮物',
                    'ryona',
                    '騎大車'
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

    favorites = {
        multiFolder: true,
        addOrDelFavorite: async (comicId, folderId, isAdding, favoriteId) => {
            if (isAdding) {
                await this.post(`${this.baseUrl}/favorite`, `aid=${comicId}`)
                await this.post(`${this.baseUrl}/favorite_folder`, `type=move&folder_id=${folderId}&aid=${comicId}`)
            } else {
                await this.post(`${this.baseUrl}/favorite`, `aid=${comicId}`)
            }
        },
        loadFolders: async (comicId) => {
            let res = await this.get(`${this.baseUrl}/favorite`)
            let folders = {
                "0": this.translate("All")
            }
            let json = JSON.parse(res)
            for (let e of json.folder_list) {
                folders[e.FID.toString()] = e.name
            }
            return {
                folders: folders,
                favorited: []
            }
        },
        addFolder: async (name) => {
            await this.post(`${this.baseUrl}/favorite_folder`, `type=add&folder_name=${name}`)
        },
        deleteFolder: async (folderId) => {
            await this.post(`${this.baseUrl}/favorite_folder`, `type=del&folder_id=${folderId}`)
        },
        loadComics: async (page, folder) => {
            let order = this.loadSetting('favoriteOrder')
            let res = await this.get(`${this.baseUrl}/favorite?folder_id=${folder}&page=${page}&o=${order}`)
            let json = JSON.parse(res)
            let total = json.total
            let maxPage = Math.ceil(total / 20)
            let comics = json.list.map((e) => this.parseComic(e))
            return {
                comics: comics,
                maxPage: maxPage
            }
        },
        singleFolderForSingleComic: true,
    }

    comic = {
        loadInfo: async (id) => {
            if (id.startsWith('jm')) {
                id = id.substring(2)
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
                isFavorite: data.is_favorite ?? false,
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
                return {};
            }
            return {
                headers: this.getImgHeaders(),
                // gif 图片不需要修改
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
            let res = await this.get(`${this.baseUrl}/forum?mode=manhua&aid=${comicId}&page=${page}`)
            let json = JSON.parse(res)
            const pageSize = 6
            return {
                comments: json.list.map((e) => new Comment({
                    avatar: this.getAvatarUrl(e.photo),
                    userName: e.username,
                    time: e.addtime,
                    content: e.content.substring(e.content.indexOf('>') + 1, e.content.lastIndexOf('<')),
                })),
                maxPage: Math.floor(json.total / pageSize) + 1
            }
        },
        sendComment: async (comicId, subId, content, replyTo) => {
            let res = await this.post(`${this.baseUrl}/comment`, `aid=${comicId}&comment=${encodeURIComponent(content)}&status=undefined`)
            let json = JSON.parse(res)
            if (json.status === "fail") {
                throw json.msg ?? '发送评论失败'
            }
            return "ok"
        },
        idMatch: "^(\\d+|jm\\d+)$",
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

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
        apiDomain: {
            title: "Api Domain",
            type: "select",
            options: [
                {
                    value: '1',
                },
                {
                    value: '2',
                },
                {
                    value: '3',
                },
                {
                    value: '4',
                },
            ],
            default: "1",
        },
        imageStream: {
            title: "Image Stream",
            type: "select",
            options: [
                {
                    value: '1',
                },
                {
                    value: '2',
                },
                {
                    value: '3',
                },
                {
                    value: '4',
                },
            ],
            default: "1",
        },
        favoriteOrder: {
            title: "Favorite Order",
            type: "select",
            options: [
                {
                    value: 'mr',
                    text: 'Add Time',
                },
                {
                    value: 'mp',
                    text: 'Update Time',
                }
            ],
            default: 'mr'
        },
        dailyCheckInTask: {
            title: "Daily Check-in Task",
            type: "switch",
            default: false
        },
        dailyCheckIn: {
            title: "Manual Check-In",
            type: "callback",
            buttonText: "Check-In",
            callback: () => this.dailyCheckIn()
        },
        optimizeNodes: {
            title: "Optimize Nodes",
            type: "callback",
            buttonText: "Start Test",
            callback: () => this.optimizeNodes()
        },
    }

    translation = {
        'zh_CN': {
            'Refresh Domain List': '刷新域名列表',
            'Refresh': '刷新',
            'Refresh Domain List on Startup': '启动时刷新域名列表',
            'Api Domain': 'Api域名',
            'Image Stream': '图片分流',
            'Favorite Order': '收藏夹排序',
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
            'Start Test': '开始测速',
        },
        'zh_TW': {
            'Refresh Domain List': '刷新域名列表',
            'Refresh': '刷新',
            'Refresh Domain List on Startup': '啟動時刷新域名列表',
            'Api Domain': 'Api域名',
            'Image Stream': '圖片分流',
            'Favorite Order': '收藏夾排序',
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
            'Start Test': '開始測速',
        },
    }
}