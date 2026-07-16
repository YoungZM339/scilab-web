import { expect, test } from "@playwright/test";
import BetterSqlite3 from "better-sqlite3";

const adminEmail = process.env.E2E_ADMIN_EMAIL!;
const adminPassword = process.env.E2E_ADMIN_PASSWORD!;
const trustedOrigin = process.env.BETTER_AUTH_URL!;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("authentication and media security boundaries are enforced", async ({
  request,
  playwright,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "安全状态流仅需执行一次");

  const login = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: trustedOrigin },
    data: { email: adminEmail, password: adminPassword, rememberMe: true },
  });
  expect(login.status()).toBe(200);

  const admin = await request.get("/admin");
  expect(admin.status()).toBe(200);
  expect(await admin.text()).toContain("最近操作");

  const bypassedPasswordChange = await request.post(
    "/api/auth/change-password",
    {
      headers: { Origin: trustedOrigin },
      data: {
        currentPassword: adminPassword,
        newPassword: "Bypass-attempt-password-123!",
        revokeOtherSessions: false,
      },
    },
  );
  expect(bypassedPasswordChange.status()).toBe(404);

  const upload = async (name: string) => {
    const response = await request.post("/api/media", {
      headers: { Origin: trustedOrigin },
      multipart: {
        file: { name: `${name}.png`, mimeType: "image/png", buffer: png },
      },
    });
    expect(response.status()).toBe(201);
    return ((await response.json()) as { asset: { id: number } }).asset.id;
  };
  const draftMediaId = await upload("draft-private");
  const publicMediaId = await upload("published-public");

  const sqlite = new BetterSqlite3(process.env.DATABASE_PATH!);
  try {
    sqlite.pragma("busy_timeout = 5000");
    const insertMember = sqlite.prepare(
      "insert into members (slug, name, member_group, avatar_media_id, status, featured, sort_order, published_at) values (?, ?, 'student', ?, ?, 0, 0, ?)",
    );
    insertMember.run(
      "draft-media-owner",
      "草稿媒体成员",
      draftMediaId,
      "draft",
      null,
    );
    insertMember.run(
      "public-media-owner",
      "公开媒体成员",
      publicMediaId,
      "published",
      Date.now(),
    );
  } finally {
    sqlite.close();
  }

  const anonymous = await playwright.request.newContext({
    baseURL: trustedOrigin,
  });
  try {
    expect((await anonymous.get(`/api/media/${draftMediaId}`)).status()).toBe(
      404,
    );
    expect((await anonymous.get(`/api/media/${publicMediaId}`)).status()).toBe(
      200,
    );
    const optimizerAttempt = await anonymous.get("/_next/image", {
      params: {
        url: `/api/media/${publicMediaId}`,
        w: "640",
        q: "75",
      },
    });
    expect(optimizerAttempt.status()).toBeGreaterThanOrEqual(400);

    const visibilityDatabase = new BetterSqlite3(process.env.DATABASE_PATH!);
    try {
      visibilityDatabase
        .prepare(
          "update members set status = 'draft' where avatar_media_id = ?",
        )
        .run(publicMediaId);
    } finally {
      visibilityDatabase.close();
    }
    expect((await anonymous.get(`/api/media/${publicMediaId}`)).status()).toBe(
      404,
    );
  } finally {
    await anonymous.dispose();
  }

  const crossOriginUpload = await request.post("/api/media", {
    headers: { Origin: "https://attacker.invalid" },
    multipart: {
      file: { name: "blocked.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(crossOriginUpload.status()).toBe(403);

  const crossOriginDelete = await request.delete(`/api/media/${draftMediaId}`, {
    headers: { Origin: "https://attacker.invalid" },
  });
  expect(crossOriginDelete.status()).toBe(403);

  const failedStatuses: number[] = [];
  for (let attempt = 0; attempt < 7; attempt += 1) {
    failedStatuses.push(
      (
        await request.post("/api/auth/sign-in/email", {
          headers: { Origin: trustedOrigin },
          data: { email: adminEmail, password: "Wrong-password-123!" },
        })
      ).status(),
    );
  }
  expect(failedStatuses.slice(0, 4)).toEqual([401, 401, 401, 401]);
  expect(failedStatuses).toContain(429);
});
