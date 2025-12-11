import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("SKATE flow smoke", () => {
  test.skip(!process.env.E2E_ENABLED, "Set E2E_ENABLED=1 to run E2E smoke");

  test("create game, accept, set trick, reply", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // User A: sign in as Guest
    await pageA.goto(baseURL);
    await pageA.getByRole("button", { name: "Guest" }).click();
    await pageA.waitForTimeout(500); // allow auth to settle

    // If profile redirect occurs, fill username quickly
    if (pageA.url().includes("/profile")) {
      await pageA.getByLabel("Username").fill("GuestA");
      await pageA.getByRole("button", { name: /save profile/i }).click();
      await pageA.waitForTimeout(500);
      await pageA.goto(baseURL);
    }

    // Capture A UID from AuthButton (assumes UID text)
    // User B: sign in as Guest
    await pageB.goto(baseURL);
    await pageB.getByRole("button", { name: "Guest" }).click();
    await pageB.waitForTimeout(500);
    if (pageB.url().includes("/profile")) {
      await pageB.getByLabel("Username").fill("GuestB");
      await pageB.getByRole("button", { name: /save profile/i }).click();
      await pageB.waitForTimeout(500);
      await pageB.goto(baseURL);
    }

    // Grab B UID from AuthButton
    const bUidText = await pageB.getByText(/UID:/).first().textContent();
    const userBUid = bUidText?.replace("UID:", "").trim().slice(0, 6) || "";

    // User A creates game vs B
    await pageA.getByLabel("Opponent UID").fill(userBUid);
    await pageA.getByRole("button", { name: /start game/i }).click();
    await expect(pageA).toHaveURL(/\/game\//);

    const gameUrl = pageA.url();

    // User B opens game and accepts
    await pageB.goto(gameUrl);
    const acceptBtn = pageB.getByRole("button", { name: /accept/i });
    await acceptBtn.click();

    // User A sets trick with a placeholder public video URL (provide via env or fallback)
    const videoUrl = process.env.E2E_VIDEO_URL || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    await pageA.getByRole("button", { name: /set trick/i }).click();
    const fileInput = pageA.getByLabel("Video URL").or(pageA.getByRole("textbox"));
    await fileInput.fill(videoUrl);
    await pageA.getByRole("button", { name: /submit/i }).click();

    // User B replies: MAKE
    await pageB.getByRole("button", { name: /reply to trick/i }).click();
    const replyInput = pageB.getByLabel("Video URL").or(pageB.getByRole("textbox"));
    await replyInput.fill(videoUrl);
    await pageB.getByRole("button", { name: /i made it/i }).click();
    await pageB.getByRole("button", { name: /submit/i }).click();

    // Verify rounds list shows at least one round
    await expect(pageA.getByText(/Rounds/)).toBeVisible();
    await expect(pageA.getByText(/Round/)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
