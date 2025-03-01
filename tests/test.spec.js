const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.describe('Тесты главной страницы Vakuu', () => {
 
  let errorCount = 0;
  let errorLog = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('https://polis812.github.io/vacuu/');
  });

  test.afterEach(async ({ page }, testInfo) => {
    
    if (testInfo.status !== testInfo.expectedStatus) {
      errorCount++;
      const error = {
        testName: testInfo.title,
        error: testInfo.error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        browser: testInfo.project.name,
        duration: testInfo.duration
      };
      
      errorLog.push(error);
      
     
      const screenshotDir = 'test-results/screenshots';
      if (!fs.existsSync(screenshotDir)){
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

     
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await page.screenshot({ 
        path: `${screenshotDir}/error-${testInfo.title}-${timestamp}.png`,
        fullPage: true 
      });
    }
  });

  test.afterAll(async () => {
    // Создаем директорию для отчетов если её нет
    const reportsDir = 'test-results/reports';
    if (!fs.existsSync(reportsDir)){
      fs.mkdirSync(reportsDir, { recursive: true });
    }

   
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: errorCount,
      errors: errorLog
    };

   
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `${reportsDir}/error-report-${timestamp}.json`, 
      JSON.stringify(report, null, 2)
    );

    
    if (errorCount > 0) {
      console.log('\n=== Краткий отчет об ошибках ===');
      console.log(`Всего ошибок: ${errorCount}`);
      console.log(`Полный отчет сохранен в: ${reportsDir}/error-report-${timestamp}.json`);
      console.log('\nПоследние ошибки:');
      errorLog.slice(-3).forEach((error, index) => {
        console.log(`\n${index + 1}. Тест: ${error.testName}`);
        console.log(`   Ошибка: ${error.error}`);
        console.log(`   Время: ${error.timestamp}`);
        console.log(`   Браузер: ${error.browser}`);
        console.log(`   Длительность: ${error.duration}ms`);
      });
    } else {
      console.log('\nВсе тесты прошли успешно!');
    }
  });

  
  test('Проверка загрузки главной страницы', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('On guard of your safety');
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.footer')).toBeVisible();
  });

  
  test('Проверка кнопки Get started', async ({ page }) => {
    
    await page.screenshot({ 
      path: 'test-results/screenshots/before-get-started.png',
      fullPage: false 
    });

    const getStartedBtn = page.locator('button:has-text("Get started")');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    try {
      
      const popup = page.locator('.swal2-popup');
      await expect(popup).toBeVisible({ timeout: 5000 });

      
      const title = popup.locator('.swal2-title');
      const content = popup.locator('#swal2-content');
      
      await expect(title).toHaveText('Successfully send');
      await expect(content).toHaveText('You have successfully subscribed');

      
      const okButton = popup.locator('.swal2-confirm');
      await expect(okButton).toBeVisible();
      await okButton.click();
      await expect(popup).not.toBeVisible();

    } catch (error) {
      
      await page.screenshot({ 
        path: 'test-results/screenshots/get-started-error.png',
        fullPage: false 
      });
      throw new Error('Кнопка Get Started не работает: попап не появился или имеет неверное содержимое');
    }

    console.log('Кнопка Get Started работает корректно: попап появился и имеет правильное содержимое');
  });

  
  test('Проверка формы подписки с пустым email', async ({ page }) => {
    const subscribeBlock = page.locator('.subscribe-block');
    const emailInput = subscribeBlock.locator('input[type="text"]');
    const submitButton = subscribeBlock.locator('.submit-btn');

   
    await emailInput.fill('');
    await submitButton.click();

    const popup = page.locator('.swal2-popup');
    await expect(popup).toBeVisible();

    const title = popup.locator('.swal2-title');
    const content = popup.locator('#swal2-content');
    
    await expect(title).toHaveText('Error');
    await expect(content).toHaveText('Wrog email');

    const okButton = popup.locator('.swal2-confirm');
    await expect(okButton).toBeVisible();
    await okButton.click();
    await expect(popup).not.toBeVisible();
  });

  
  test('Проверка формы подписки с невалидным email', async ({ page }) => {
    const subscribeBlock = page.locator('.subscribe-block');
    const emailInput = subscribeBlock.locator('input[type="text"]');
    const submitButton = subscribeBlock.locator('.submit-btn');

    
    await page.screenshot({ 
      path: 'test-results/screenshots/before-invalid-email.png',
      fullPage: false 
    });

    await emailInput.fill('123@1');
    await submitButton.click();

   
    const popup = page.locator('.swal2-popup');
    await expect(popup).toBeVisible();

    
    const title = popup.locator('.swal2-title');
    const content = popup.locator('#swal2-content');

   
    const actualTitle = await title.textContent();
    if (actualTitle === 'Successfully send') {
      
      await page.screenshot({ 
        path: 'test-results/screenshots/invalid-email-accepted.png',
        fullPage: false 
      });
      throw new Error('Система приняла невалидный email (123@1). Это ошибка!');
    }

    
    await expect(title).toHaveText('Error');
    await expect(content).toHaveText('Wrog email');

    
    const okButton = popup.locator('.swal2-confirm');
    await expect(okButton).toBeVisible();
    await okButton.click();
    await expect(popup).not.toBeVisible();
  });

  
  test('Проверка отображения телефона на десктопе', async ({ page }) => {
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    
   
    await page.waitForLoadState('networkidle');
    
    
    const phoneBlock = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneBlock).toBeVisible();
    
   
    await expect(phoneBlock).toContainText('Talk to our team to start saving');
    await expect(phoneBlock).toContainText('+358 9 000 000');
  });

  
  test('Проверка отображения телефона на мобильной версии', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    
    const phoneBlock = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneBlock).not.toBeVisible();
    
    
    const phoneLink = page.locator('[data-v-aec9f68e] a[href^="tel:"]');
    await expect(phoneLink).toBeVisible();
    await expect(phoneLink).toHaveAttribute('href', 'tel:+358 9 000 000');
    await expect(phoneLink).toHaveText('+358 9 000 000');

    
    const phoneIcon = page.locator('[data-v-aec9f68e] img[src*="Phone"]');
    await expect(phoneIcon).toBeVisible();

    
    const phoneText = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneText).toContainText('Talk to our team to start saving');
  });

  
  test('Проверка мобильного меню', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-before-menu.png',
      fullPage: false 
    });
    
    
    const menuButton = page.locator('div[data-v-aec9f68e].menu');
    await expect(menuButton).toBeVisible();

    
    const hamburgerIcon = menuButton.locator('img[src*="Hamburger_MD"]');
    await expect(hamburgerIcon).toBeVisible();
    
    
    const beforeClick = await page.evaluate(() => document.documentElement.innerHTML);
    
    
    await menuButton.click();
    
    
    await page.waitForTimeout(1000);
    
    
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-after-menu.png',
      fullPage: false 
    });

    
    const afterClick = await page.evaluate(() => document.documentElement.innerHTML);
    
    if (beforeClick === afterClick) {
      
      await page.screenshot({ 
        path: 'test-results/screenshots/mobile-menu-error.png',
        fullPage: false 
      });
      throw new Error('Мобильное меню не работает: после нажатия на кнопку меню ничего не происходит');
    }
  });

  
  test('Проверка работы стрелок в отзывах', async ({ page }) => {
    const reviewsSection = page.locator('.reviews');
    await expect(reviewsSection).toBeVisible();

    
    const leftArrow = reviewsSection.locator('.arrow-left');
    const rightArrow = reviewsSection.locator('.arrow-right');

    await expect(leftArrow).toHaveClass(/arrow-disabled/);
    await expect(rightArrow).toHaveClass(/arrow-enable/);

    
    const reviews = reviewsSection.locator('.review');
    await expect(reviews).toHaveCount(2);
    
    
    await rightArrow.click();
    
    
    try {
      
      await expect(leftArrow).toHaveClass(/arrow-enable/, { timeout: 2000 });
      
      throw new Error('Стрелки переключения отзывов не работают');
    } catch (error) {
      throw new Error('Функционал переключения отзывов не реализован: стрелки не меняют состояние');
    }
  });

  
  test('Проверка переключения языка', async ({ page }) => {
    const langSelect = page.locator('[data-v-aec9f68e].header__lang');
    await expect(langSelect).toBeVisible();

    
    await expect(langSelect).toHaveValue('en');
    
    
    const initialTitle = await page.locator('h1').textContent();
    
    
    await page.screenshot({ 
      path: 'test-results/screenshots/before-lang-switch.png',
      fullPage: false 
    });

    
    await langSelect.selectOption('fin');
    
    
    await page.waitForTimeout(1000);
    
    
    await expect(langSelect).toHaveValue('fin');
    
    
    const newTitle = await page.locator('h1').textContent();
    
    
    await page.screenshot({ 
      path: 'test-results/screenshots/after-lang-switch.png',
      fullPage: false 
    });

    
    if (initialTitle === newTitle) {
      
      await page.screenshot({ 
        path: 'test-results/screenshots/lang-switch-error.png',
        fullPage: false 
      });
      throw new Error('Переключение языка не работает: текст на странице не изменился после смены языка на FIN');
    }

    
    const options = await langSelect.evaluate((select) => {
      return Array.from(select.options).map(option => ({
        value: option.value,
        text: option.text
      }));
    });

    
    expect(options).toContainEqual({ value: 'en', text: 'EN' });
    expect(options).toContainEqual({ value: 'fin', text: 'FIN' });
  });

  test('Проверка ссылок в футере', async ({ page }) => {
    const footerLinks = [
      { section: 'Product', links: [
        { text: 'Car insurance', href: '/car' },
        { text: 'Home insurance', href: '/home' },
        { text: 'Travel insurance', href: '/travel' },
        { text: 'Pet insurance', href: '/pet' }
      ]},
      { section: 'Resources', links: [
        { text: 'Blog', href: '/blog' }
      ]},
      { section: 'Company', links: [
        { text: 'About us', href: '/about' },
        { text: 'Partners', href: '/partners' },
        { text: 'Review', href: '/review' },
        { text: 'Contact us', href: '/contacts' }
      ]}
    ];

    for (const section of footerLinks) {
      const sectionTitle = page.locator('.footer__col__title', { hasText: section.section });
      await expect(sectionTitle).toBeVisible();

      for (const link of section.links) {
        const footerLink = page.locator('.footer__col__item', { hasText: link.text });
        await expect(footerLink).toBeVisible();
        await expect(footerLink).toHaveAttribute('href', link.href);
      }
    }
  });
});
