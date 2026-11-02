const SIGNIN_URL = "https://juejin.cn/user/center/signin?from=main_page";

const parseCheckinStatus = (payload) => {
    if (!payload || payload.err_no !== 0) {
        throw new Error(`签到状态接口失败：${payload?.err_msg || "响应无效"}`);
    }

    // 接口当前返回 data: true/false，同时兼容旧版对象格式。
    const status = typeof payload.data === "boolean"
        ? payload.data
        : payload.data?.check_in_done;
    if (typeof status !== "boolean") {
        throw new Error("签到状态接口未返回有效的签到结果");
    }
    return status;
};

const readCheckinStatus = async (page) => {
    // 在导航前等待响应，避免错过页面初始化时发出的请求。
    const result = page.waitForResponse(
        (response) => {
            const url = new URL(response.url());
            return url.hostname.endsWith(".juejin.cn") &&
                url.pathname.endsWith("/get_today_status") &&
                response.request().method() !== "OPTIONS";
        },
        { timeout: 20000 },
    ).then(async (response) => {
        if (!response.ok()) {
            throw new Error(`签到状态接口 HTTP ${response.status()}`);
        }
        return { signedIn: parseCheckinStatus(await response.json()) };
    }).catch((error) => ({ error }));

    await page.goto(SIGNIN_URL, { waitUntil: "networkidle0" });
    const status = await result;
    if (status.error) throw status.error;
    return status.signedIn;
};

module.exports = { parseCheckinStatus, readCheckinStatus };
