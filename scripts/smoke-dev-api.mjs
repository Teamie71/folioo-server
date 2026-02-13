#!/usr/bin/env node
/*
  Dev API smoke runner

  - Pulls OpenAPI spec from /api-json
  - Calls endpoints with an access token (Bearer)
  - Writes a JSON report under /tmp

  Safety:
  - Never hardcode tokens in this file.
  - By default, skips endpoints that are clearly not suitable for automation (OAuth redirects, multipart upload).
  - You can enable mutating requests with --mutate.
*/

import fs from 'node:fs';
import process from 'node:process';

const DEFAULT_BASE = 'https://folioo-dev-api.log8.kr';

function nowIso() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
    const args = {
        base: DEFAULT_BASE,
        tokenEnv: 'FOLIOO_ACCESS_TOKEN',
        out: null,
        mutate: false,
        delayMs: 120,
        timeoutMs: 15000,
        include: null,
        exclude: null,
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === '--base' && next) {
            args.base = next;
            i++;
        } else if (a === '--token-env' && next) {
            args.tokenEnv = next;
            i++;
        } else if (a === '--out' && next) {
            args.out = next;
            i++;
        } else if (a === '--mutate') {
            args.mutate = true;
        } else if (a === '--delay-ms' && next) {
            args.delayMs = Number(next);
            i++;
        } else if (a === '--timeout-ms' && next) {
            args.timeoutMs = Number(next);
            i++;
        } else if (a === '--include' && next) {
            args.include = next;
            i++;
        } else if (a === '--exclude' && next) {
            args.exclude = next;
            i++;
        } else if (a === '--help' || a === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return args;
}

function printHelp() {
    console.log(`Usage: node scripts/smoke-dev-api.mjs [options]

Options:
  --base <url>           Base URL (default: ${DEFAULT_BASE})
  --token-env <name>     Env var containing access token (default: FOLIOO_ACCESS_TOKEN)
  --mutate               Enable POST/PATCH/DELETE (default: GET only)
  --delay-ms <n>         Delay between requests (default: 120)
  --timeout-ms <n>       Per-request timeout (default: 15000)
  --include <regex>      Only run operations whose path matches regex
  --exclude <regex>      Skip operations whose path matches regex
  --out <path>           Write report to this path (default: /tmp/folioo_dev_smoke_<ts>.json)

Examples:
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --include '^/portfolio-corrections'
`);
}

function buildDummyValue(schema) {
    const t = schema?.type;
    if (schema?.enum?.length) return schema.enum[0];
    if (t === 'integer' || t === 'number') return 1;
    if (t === 'boolean') return true;
    if (t === 'string') {
        if (schema?.format === 'date-time') return nowIso();
        if (schema?.format === 'date') return nowIso().slice(0, 10);
        if (schema?.format === 'email') return 'smoke@folioo.local';
        if (schema?.format === 'uuid') return '00000000-0000-0000-0000-000000000001';
        return 'test';
    }
    if (t === 'array') return [];
    if (t === 'object') return {};
    return 'test';
}

function fillPathParams(rawPath, op, context) {
    const params = [...(op.parameters || [])];
    return rawPath.replace(/\{([^}]+)\}/g, (_m, name) => {
        // If we have a discovered ID for this resource, use it.
        const byName = context.pathParamValues?.[name];
        if (byName != null) return encodeURIComponent(String(byName));

        const p = params.find((x) => x.in === 'path' && x.name === name);
        return encodeURIComponent(String(buildDummyValue(p?.schema || { type: 'integer' })));
    });
}

function buildQuery(path, op) {
    const params = op.parameters || [];
    const q = new URLSearchParams();
    for (const p of params) {
        if (p.in !== 'query') continue;
        if (!p.required) continue;
        q.set(p.name, String(buildDummyValue(p.schema || { type: 'string' })));
    }
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
}

function getFirstJsonContent(op) {
    const content = op.requestBody?.content;
    if (!content) return null;
    if (content['application/json'])
        return { contentType: 'application/json', schema: content['application/json']?.schema };
    const first = Object.keys(content)[0];
    if (!first) return null;
    return { contentType: first, schema: content[first]?.schema };
}

function deref(spec, schema) {
    if (!schema) return null;
    if (!schema.$ref) return schema;
    const parts = schema.$ref.replace(/^#\//, '').split('/');
    let cur = spec;
    for (const p of parts) {
        cur = cur?.[p];
        if (!cur) return null;
    }
    return cur;
}

function buildJsonBodyFromSchema(spec, schema) {
    const s = deref(spec, schema);
    if (!s) return {};

    if (s.oneOf?.length) return buildJsonBodyFromSchema(spec, s.oneOf[0]);
    if (s.anyOf?.length) return buildJsonBodyFromSchema(spec, s.anyOf[0]);
    if (s.allOf?.length) {
        // Merge object shapes
        const merged = {};
        for (const part of s.allOf) {
            const v = buildJsonBodyFromSchema(spec, part);
            if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(merged, v);
        }
        return merged;
    }

    if (s.type === 'object' || s.properties) {
        const out = {};
        const required = new Set(s.required || []);
        for (const [k, vRaw] of Object.entries(s.properties || {})) {
            const v = deref(spec, vRaw);
            if (required.has(k)) {
                out[k] = buildJsonBodyFromSchema(spec, v);
            }
        }
        // If spec forgot required fields, sending empty object is still useful for validation checks.
        return out;
    }
    if (s.type === 'array') {
        return [];
    }
    return buildDummyValue(s);
}

function shouldSkipOperation(op, method, path, firstContent) {
    // OAuth redirects aren't meaningful as API smoke requests.
    if (
        path.startsWith('/auth/kakao') ||
        path.startsWith('/auth/google') ||
        path.startsWith('/auth/naver')
    ) {
        if (method === 'GET') return { skip: true, reason: 'oauth-redirect' };
    }
    // Multipart needs a real PDF file.
    if (firstContent?.contentType === 'multipart/form-data') {
        return { skip: true, reason: 'multipart-not-supported' };
    }
    return { skip: false, reason: null };
}

async function fetchJson(url, opts, timeoutMs) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...opts, signal: ac.signal });
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        let json = null;
        if (ct.includes('application/json') && text) {
            try {
                json = JSON.parse(text);
            } catch {
                json = { invalidJson: true, sample: text.slice(0, 500) };
            }
        }
        return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            text,
            json,
        };
    } finally {
        clearTimeout(t);
    }
}

async function preflightContext(base, token, timeoutMs) {
    // Gather IDs and primitives for later operations.
    const ctx = {
        ticketProductId: null,
        correctionId: null,
        experienceId: null,
        paymentId: null,
        pathParamValues: {},
    };

    // Ticket product id
    try {
        const r = await fetchJson(
            `${base}/ticket-products`,
            {
                method: 'GET',
                headers: { accept: 'application/json' },
            },
            timeoutMs
        );
        const list = r.json?.result;
        if (Array.isArray(list) && list.length && typeof list[0]?.id === 'number') {
            ctx.ticketProductId = list[0].id;
        }
    } catch (e) {
        console.error('[smoke][preflight] failed to get ticket product ID:', e);
    }

    // Existing corrections
    try {
        const r = await fetchJson(
            `${base}/portfolio-corrections`,
            {
                method: 'GET',
                headers: { accept: 'application/json', authorization: `Bearer ${token}` },
            },
            timeoutMs
        );
        const list = r.json?.result;
        if (Array.isArray(list) && list.length && typeof list[0]?.id === 'number') {
            ctx.correctionId = list[0].id;
        }
    } catch (e) {
        console.error('[smoke][preflight] failed to get existing corrections:', e);
    }

    // Existing experiences
    try {
        const r = await fetchJson(
            `${base}/experiences`,
            {
                method: 'GET',
                headers: { accept: 'application/json', authorization: `Bearer ${token}` },
            },
            timeoutMs
        );
        const list = r.json?.result;
        if (Array.isArray(list) && list.length && typeof list[0]?.id === 'number') {
            ctx.experienceId = list[0].id;
        }
    } catch (e) {
        console.error('[smoke][preflight] failed to get existing experiences:', e);
    }

    if (ctx.experienceId != null) ctx.pathParamValues.experienceId = ctx.experienceId;
    if (ctx.correctionId != null) ctx.pathParamValues.correctionId = ctx.correctionId;
    return ctx;
}

function payloadOverrides(method, path, ctx) {
    // Some request schemas in /api-json are incomplete (missing required fields).
    // Patch known endpoints using DTO-derived requirements.
    if (method === 'POST' && path === '/experiences') {
        return { name: 'smoke', hopeJob: 'DEV' };
    }
    if (method === 'PATCH' && path === '/experiences/{experienceId}') {
        return { name: 'smoke-update', hopeJob: 'DEV' };
    }
    if (method === 'POST' && path === '/portfolio-corrections') {
        return {
            companyName: 'SmokeCo',
            positionName: 'Developer',
            jobDescriptionType: 'TEXT',
            jobDescription: 'smoke test job description',
        };
    }
    if (method === 'POST' && path === '/payments') {
        // ticketProductId must exist.
        return { ticketProductId: ctx.ticketProductId ?? 1 };
    }
    if (method === 'PATCH' && path === '/users/me') {
        return { name: 'smoke-user' };
    }
    if (method === 'PATCH' && path === '/users/me/marketing-consent') {
        return { isMarketingAgreed: true };
    }
    return null;
}

async function main() {
    const args = parseArgs(process.argv);
    const token = process.env[args.tokenEnv];
    if (!token) {
        console.error(`Missing env ${args.tokenEnv}. Refusing to run.`);
        process.exit(2);
    }

    const includeRe = args.include ? new RegExp(args.include) : null;
    const excludeRe = args.exclude ? new RegExp(args.exclude) : null;

    const startedAt = nowIso();
    const outPath = args.out || `/tmp/folioo_dev_smoke_${Date.now()}.json`;

    const specRes = await fetchJson(
        `${args.base}/api-json`,
        { method: 'GET', headers: { accept: 'application/json' } },
        args.timeoutMs
    );
    if (specRes.status !== 200 || !specRes.json) {
        console.error(`Failed to fetch OpenAPI spec: status=${specRes.status}`);
        process.exit(1);
    }
    const spec = specRes.json;

    const ctx = await preflightContext(args.base, token, args.timeoutMs);

    const methods = args.mutate ? ['get', 'post', 'patch', 'delete'] : ['get'];
    const operations = [];
    for (const [rawPath, item] of Object.entries(spec.paths || {})) {
        for (const m of methods) {
            const op = item?.[m];
            if (!op) continue;
            if (includeRe && !includeRe.test(rawPath)) continue;
            if (excludeRe && excludeRe.test(rawPath)) continue;

            const firstContent = getFirstJsonContent(op);
            const skipInfo = shouldSkipOperation(op, m.toUpperCase(), rawPath, firstContent);
            operations.push({ method: m.toUpperCase(), rawPath, op, firstContent, skipInfo });
        }
    }

    const results = [];
    for (const entry of operations) {
        const { method, rawPath, op, firstContent, skipInfo } = entry;

        if (skipInfo.skip) {
            results.push({
                method,
                rawPath,
                url: new URL(rawPath, args.base).toString(),
                tag: (op.tags && op.tags[0]) || '(no-tag)',
                summary: op.summary || null,
                skipped: true,
                skipReason: skipInfo.reason,
                status: null,
                errorCode: null,
                errorReason: null,
                durationMs: 0,
            });
            continue;
        }

        let path = fillPathParams(rawPath, op, ctx);
        path = buildQuery(path, op);
        const url = new URL(path, args.base).toString();

        const headers = {
            accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
            authorization: `Bearer ${token}`,
        };

        let body = null;
        let contentType = null;
        if (method !== 'GET' && method !== 'DELETE') {
            const override = payloadOverrides(method, rawPath, ctx);
            if (override) {
                body = override;
                contentType = 'application/json';
            } else if (firstContent?.contentType === 'application/json') {
                body = buildJsonBodyFromSchema(spec, firstContent.schema);
                contentType = 'application/json';
            }
        }
        if (contentType) headers['content-type'] = contentType;

        const started = Date.now();
        let status = null;
        let errorCode = null;
        let errorReason = null;
        let networkError = null;

        try {
            const r = await fetchJson(
                url,
                {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                },
                args.timeoutMs
            );
            status = r.status;
            const err = r.json?.error;
            if (err && typeof err === 'object') {
                errorCode = err.errorCode || err.code || null;
                errorReason = err.reason || err.message || null;
            }
            // capture any returned IDs for later operations
            if (
                method === 'POST' &&
                rawPath === '/payments' &&
                typeof r.json?.result?.id === 'number'
            ) {
                ctx.paymentId = r.json.result.id;
                ctx.pathParamValues.paymentId = ctx.paymentId;
            }
            if (method === 'POST' && rawPath === '/portfolio-corrections') {
                // response is string; new correctionId can be fetched by listing after
            }
            if (
                method === 'POST' &&
                rawPath === '/experiences' &&
                typeof r.json?.result?.id === 'number'
            ) {
                ctx.experienceId = r.json.result.id;
                ctx.pathParamValues.experienceId = ctx.experienceId;
            }
        } catch (e) {
            networkError = String(e?.message || e);
        }

        const durationMs = Date.now() - started;
        results.push({
            method,
            rawPath,
            url,
            tag: (op.tags && op.tags[0]) || '(no-tag)',
            summary: op.summary || null,
            operationId: op.operationId || null,
            skipped: false,
            skipReason: null,
            status,
            errorCode,
            errorReason,
            durationMs,
            networkError,
        });

        await sleep(args.delayMs);
    }

    const buckets = {
        ok2xx: 0,
        redirect3xx: 0,
        client4xx: 0,
        server5xx: 0,
        skipped: 0,
        network: 0,
    };
    for (const r of results) {
        if (r.skipped) {
            buckets.skipped++;
            continue;
        }
        if (r.networkError) {
            buckets.network++;
            continue;
        }
        if (r.status >= 200 && r.status < 300) buckets.ok2xx++;
        else if (r.status >= 300 && r.status < 400) buckets.redirect3xx++;
        else if (r.status >= 400 && r.status < 500) buckets.client4xx++;
        else if (r.status >= 500) buckets.server5xx++;
    }

    const report = {
        at: startedAt,
        finishedAt: nowIso(),
        base: args.base,
        openapi: {
            title: spec.info?.title || null,
            version: spec.info?.version || null,
        },
        options: {
            mutate: args.mutate,
            delayMs: args.delayMs,
            timeoutMs: args.timeoutMs,
            include: args.include,
            exclude: args.exclude,
        },
        context: {
            ticketProductId: ctx.ticketProductId,
            correctionId: ctx.correctionId,
            experienceId: ctx.experienceId,
            paymentId: ctx.paymentId,
        },
        buckets,
        count: results.length,
        results,
    };

    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ outPath, buckets, count: results.length }, null, 2));
}

main().catch((e) => {
    console.error(e.stack || String(e));
    process.exit(1);
});
