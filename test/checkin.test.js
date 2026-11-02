const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const { parseCheckinStatus, readCheckinStatus } = require("../checkin-status");

test("识别当前布尔响应和旧版对象响应，并拒绝失败或不明确的结果", () => {
    for (const data of [true, { check_in_done: true }]) {
        assert.equal(parseCheckinStatus({ err_no: 0, data }), true);
    }
    for (const data of [false, { check_in_done: false }]) {
        assert.equal(parseCheckinStatus({ err_no: 0, data }), false);
    }
    for (const payload of [null, { err_no: 1, data: true },
        { err_no: 0, data: {} }, { err_no: 0, data: "true" }]) {
        assert.throws(() => parseCheckinStatus(payload));
    }
});

test("导航前等待接口，支持 POST，并忽略预检请求和其他站点", async () => {
    let registered = false;
    const response = (url, method) => ({
        url: () => url,
        request: () => ({ method: () => method }),
        ok: () => true,
        json: async () => ({ err_no: 0, data: true }),
    });
    const page = {
        waitForResponse(predicate) {
            registered = true;
            const url = "https://api.juejin.cn/growth_api/v1/get_today_status";
            assert.equal(predicate(response(url, "OPTIONS")), false);
            assert.equal(predicate(response("https://example.com/get_today_status", "GET")), false);
            assert.equal(predicate(response(url, "GET")), true);
            const post = response(url, "POST");
            assert.equal(predicate(post), true);
            return Promise.resolve(post);
        },
        async goto() { assert.equal(registered, true); },
    };
    assert.equal(await readCheckinStatus(page), true);
});

test("接口超时和 HTTP 失败不能被视为签到成功", async () => {
    await assert.rejects(readCheckinStatus({
        waitForResponse: () => Promise.reject(new Error("timeout")),
        goto: async () => {},
    }), /timeout/);
    await assert.rejects(readCheckinStatus({
        waitForResponse: () => Promise.resolve({ ok: () => false, status: () => 403 }),
        goto: async () => {},
    }), /HTTP 403/);
});

const runMain = async (statuses) => {
    let reads = 0;
    let clicks = 0;
    let closed = false;
    const messages = [];
    const page = {
        setDefaultTimeout() {},
        async setUserAgent() {},
        async setViewport() {},
        async goto() {},
        async setCookie() {},
        async waitForSelector(selector) {
            if (selector.includes("text-free")) throw new Error("无免费抽奖");
        },
        async click() { clicks += 1; },
        async $eval() { return "10"; },
        async $$() { return []; },
    };
    const browser = {
        async newPage() { return page; },
        async close() { closed = true; },
    };
    const sandbox = {
        require(name) {
            if (name === "puppeteer") return { launch: async () => browser };
            if (name === "fs") return {
                existsSync: (path) => path !== "/usr/bin/chromium",
                readFileSync: () => "[]",
            };
            if (name === "./utils" || name === "axios") return {};
            if (name === "dotenv") return { config() {} };
            if (name === "./checkin-status") return {
                async readCheckinStatus() {
                    const status = statuses[Math.min(reads++, statuses.length - 1)];
                    if (status instanceof Error) throw status;
                    return status;
                },
            };
            throw new Error(`意外的依赖：${name}`);
        },
        process: { env: {}, exitCode: 0 },
        console: {
            log: (...args) => messages.push(args.join(" ")),
            error: (...args) => messages.push(args.join(" ")),
        },
        setTimeout: (callback) => { callback(); },
    };
    const source = fs.readFileSync(require.resolve("../index.js"), "utf8")
        .replace("main().catch", "globalThis.completion = main().catch");
    vm.runInNewContext(source, sandbox);
    await sandbox.completion;
    return { reads, clicks, closed, messages, exitCode: sandbox.process.exitCode };
};

test("已签到且无免费抽奖时成功退出，不重复签到", async () => {
    const result = await runMain([true]);
    assert.equal(result.exitCode, 0);
    assert.equal(result.clicks, 0);
    assert.equal(result.reads, 1);
    assert.equal(result.closed, true);
    assert.ok(result.messages.some((message) => message.includes("今日签到状态：已签到")));
});

test("点击签到后重新验证接口结果", async () => {
    const result = await runMain([false, true]);
    assert.equal(result.exitCode, 0);
    assert.equal(result.clicks, 1);
    assert.equal(result.reads, 2);
    assert.equal(result.closed, true);
});

test("连续未签到或接口错误时重试后退出失败并关闭浏览器", async () => {
    for (const status of [false, new Error("登录失效")]) {
        const result = await runMain([status]);
        assert.equal(result.exitCode, 1);
        assert.equal(result.closed, true);
        assert.equal(result.reads, status === false ? 6 : 3);
        assert.ok(!result.messages.some((message) => message.includes("本轮签到结束")));
    }
});
