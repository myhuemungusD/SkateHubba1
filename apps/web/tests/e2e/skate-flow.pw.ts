import { test, expect } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("SKATE flow smoke", () => {
  test.skip(!process.env.E2E_ENABLED, "Set E2E_ENABLED=1 to run E2E smoke");

  test("create game, accept, set trick, reply", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto(baseURL);
    await pageA.getByRole("button", { name: "Guest" }).click();
    await pageA.waitForTimeout(500);

    if (pageA.url().includes("/profile")) {
      await pageA.getByLabel("Username").fill("GuestA");
      await pageA.getByRole("button", { name: /save profile/i }).click();
      await pageA.waitForTimeout(500);
      await pageA.goto(baseURL);
    }

    await pageB.goto(baseURL);
    await pageB.getByRole("button", { name: "Guest" }).click();
    await pageB.waitForTimeout(500);
    if (pageB.url().includes("/profile")) {
      await pageB.getByLabel("Username").fill("GuestB");
      await pageB.getByRole("button", { name: /save profile/i }).click();
      await pageB.waitForTimeout(500);
      await pageB.goto(baseURL);
    }

    const bUidText = await pageB.getByText(/UID:/).first().textContent();
    const userBUid = bUidText?.replace("UID:", "").trim().slice(0, 6) || "";

    await pageA.getByLabel("Opponent UID").fill(userBUid);
    await pageA.getByRole("button", { name: /start game/i }).click();
    await expect(pageA).toHaveURL(/\/game\//);

    const gameUrl = pageA.url();

    await pageB.goto(gameUrl);
    const acceptBtn = pageB.getByRole("button", { name: /accept/i });
    await acceptBtn.click();

    const videoUrl =
      process.env.E2E_VIDEO_URL ||
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    await pageA.getByRole("button", { name: /set trick/i }).click();
    const fileInput = pageA.getByLabel("Video URL").or(pageA.getByRole("textbox"));
    await fileInput.fill(videoUrl);
    await pageA.getByRole("button", { name: /submit/i }).click();

    await pageB.getByRole("button", { name: /reply to trick/i }).click();
    const replyInput = pageB.getByLabel("Video URL").or(pageB.getByRole("textbox"));
    await replyInput.fill(videoUrl);
    await pageB.getByRole("button", { name: /i made it/i }).click();
    await pageB.getByRole("button", { name: /submit/i }).click();

    await expect(pageA.getByText(/Rounds/)).toBeVisible();
    await expect(pageA.getByText(/Round/)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
