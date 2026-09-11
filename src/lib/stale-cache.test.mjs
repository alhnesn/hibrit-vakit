import { test } from "node:test";
import assert from "node:assert/strict";
import { createStaleCache } from "./stale-cache.ts";

const TTL = 1000;
const RETRY = 100;

/** Builds a cache with a controllable clock and a scripted fetcher. */
function setup({ isUsable, maxSize = 10, onError } = {}) {
  let time = 0;
  const calls = [];
  let next = () => Promise.resolve("v1");
  const cache = createStaleCache({
    ttlMs: TTL,
    maxSize,
    retryMs: RETRY,
    isUsable,
    onError,
    now: () => time,
    fetcher: (key) => {
      calls.push(key);
      return next(key);
    },
  });
  return {
    cache,
    calls,
    advance: (ms) => {
      time += ms;
    },
    respondWith: (fn) => {
      next = fn;
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

test("miss fetches upstream and returns fresh data", async () => {
  const { cache, calls } = setup();
  const r = await cache.get("a");
  assert.deepEqual(r, { data: "v1", stale: false });
  assert.deepEqual(calls, ["a"]);
});

test("hit within TTL does not touch upstream", async () => {
  const { cache, calls, advance } = setup();
  await cache.get("a");
  advance(TTL - 1);
  const r = await cache.get("a");
  assert.deepEqual(r, { data: "v1", stale: false });
  assert.equal(calls.length, 1);
});

test("expired entry is served instantly while a refresh runs in the background", async () => {
  const { cache, calls, advance, respondWith } = setup();
  await cache.get("a");
  advance(TTL);

  let resolveUpstream;
  respondWith(() => new Promise((res) => (resolveUpstream = res)));

  const r = await cache.get("a"); // must resolve even though upstream is pending
  assert.deepEqual(r, { data: "v1", stale: true });
  assert.equal(calls.length, 2);

  resolveUpstream("v2");
  await settle();
  assert.deepEqual(await cache.get("a"), { data: "v2", stale: false });
});

test("concurrent stale reads share one in-flight refresh", async () => {
  const { cache, calls, advance, respondWith } = setup();
  await cache.get("a");
  advance(TTL);
  respondWith(() => new Promise(() => {})); // hangs

  await cache.get("a");
  await cache.get("a");
  await cache.get("a");
  assert.equal(calls.length, 2, "only one refresh started while the first is pending");
});

test("waitForFresh joins the running refresh and returns the new data", async () => {
  const { cache, calls, advance, respondWith } = setup();
  await cache.get("a");
  advance(TTL);

  let resolveUpstream;
  respondWith(() => new Promise((res) => (resolveUpstream = res)));
  await cache.get("a"); // starts background refresh

  const pending = cache.get("a", { waitForFresh: true });
  resolveUpstream("v2");
  assert.deepEqual(await pending, { data: "v2", stale: false });
  assert.equal(calls.length, 2);
});

test("failed refresh keeps serving stale and is not retried until retryMs passes", async () => {
  const { cache, calls, advance, respondWith } = setup();
  await cache.get("a");
  advance(TTL);
  respondWith(() => Promise.reject(new Error("upstream down")));

  assert.deepEqual(await cache.get("a"), { data: "v1", stale: true });
  await settle();
  assert.equal(calls.length, 2);

  advance(RETRY - 1);
  assert.deepEqual(await cache.get("a"), { data: "v1", stale: true });
  assert.deepEqual(await cache.get("a", { waitForFresh: true }), { data: "v1", stale: true });
  await settle();
  assert.equal(calls.length, 2, "no retry inside the retry window");

  advance(1);
  await cache.get("a");
  await settle();
  assert.equal(calls.length, 3, "retried once the window passed");
});

test("waitForFresh falls back to the stale entry when upstream fails", async () => {
  const { cache, advance, respondWith } = setup();
  await cache.get("a");
  advance(TTL);
  respondWith(() => Promise.reject(new Error("upstream down")));
  assert.deepEqual(await cache.get("a", { waitForFresh: true }), { data: "v1", stale: true });
});

test("miss with failing upstream rejects", async () => {
  const { cache, respondWith } = setup();
  respondWith(() => Promise.reject(new Error("upstream down")));
  await assert.rejects(() => cache.get("a"), /upstream down/);
});

test("onError is called once per failed attempt, including background ones", async () => {
  const errors = [];
  const { cache, advance, respondWith } = setup({ onError: (key, err) => errors.push([key, err.message]) });
  await cache.get("a");
  advance(TTL);
  respondWith(() => Promise.reject(new Error("upstream down")));
  await cache.get("a"); // background refresh fails
  await settle();
  assert.deepEqual(errors, [["a", "upstream down"]]);
});

test("unusable expired entry waits for upstream instead of being served instantly", async () => {
  const { cache, advance, respondWith } = setup({ isUsable: (d) => d !== "v1" });
  await cache.get("a");
  advance(TTL);

  let resolveUpstream;
  respondWith(() => new Promise((res) => (resolveUpstream = res)));
  const pending = cache.get("a");
  let done = false;
  pending.then(() => (done = true));
  await settle();
  assert.equal(done, false, "did not resolve with the unusable entry");

  resolveUpstream("v2");
  assert.deepEqual(await pending, { data: "v2", stale: false });
});

test("unusable expired entry is still the fallback when upstream fails", async () => {
  const { cache, advance, respondWith } = setup({ isUsable: () => false });
  await cache.get("a");
  advance(TTL);
  respondWith(() => Promise.reject(new Error("upstream down")));
  assert.deepEqual(await cache.get("a"), { data: "v1", stale: true });
});

test("evicts the oldest entry beyond maxSize", async () => {
  const { cache, calls } = setup({ maxSize: 2 });
  await cache.get("a");
  await cache.get("b");
  await cache.get("c");
  assert.equal(cache.size, 2);
  await cache.get("a"); // evicted, so this refetches
  assert.deepEqual(calls, ["a", "b", "c", "a"]);
});
