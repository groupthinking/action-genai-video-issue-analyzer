import { test, expect } from '@playwright/test';

/**
 * E2E Test: Video Analysis Flow
 * 
 * Tests the core video analysis functionality through the web interface
 */

test.describe('Video Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should display video input form', async ({ page }) => {
    // Check if the video input form is present
    await expect(page.getByRole('heading', { name: /video/i })).toBeVisible();
    await expect(page.getByLabel(/video url/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /analyze/i })).toBeVisible();
  });

  test('should show error for empty video URL', async ({ page }) => {
    // Click analyze without entering a URL
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Check for error message
    await expect(page.getByText(/please enter a video url/i)).toBeVisible();
  });

  test('should show error for invalid URL', async ({ page }) => {
    // Enter an invalid URL
    await page.getByLabel(/video url/i).fill('not-a-valid-url');
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Check for error message
    await expect(page.getByText(/please enter a valid/i)).toBeVisible();
  });

  test('should accept valid YouTube URL', async ({ page }) => {
    // Note: This test uses a real YouTube video ID for integration testing.
    // Consider mocking the API response in CI or using a dedicated test video.
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await page.getByLabel(/video url/i).fill(youtubeUrl);
    
    // Click analyze button
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Should show loading state
    await expect(page.getByText(/analyzing/i)).toBeVisible();
  });

  test('should handle video analysis timeout gracefully', async ({ page }) => {
    // Set a shorter timeout for this test
    test.setTimeout(45000);
    
    // Enter a valid YouTube URL
    const youtubeUrl = 'https://www.youtube.com/watch?v=test123';
    await page.getByLabel(/video url/i).fill(youtubeUrl);
    
    // Click analyze button
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Wait for either success or error message (with timeout)
    const resultOrError = page.locator('text=/analysis|error|failed/i').first();
    await expect(resultOrError).toBeVisible({ timeout: 40000 });
  });
});

test.describe('Navigation', () => {
  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/video.*analyzer/i);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if input is visible and accessible
    await expect(page.getByLabel(/video url/i)).toBeVisible();
  });
});
