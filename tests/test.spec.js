const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.describe('Тесты главной страницы Vakuu', () => {
  // Счетчик ошибок
  let errorCount = 0;
  let errorLog = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('https://polis812.github.io/vacuu/');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Если тест провалился - делаем скриншот и сохраняем информацию
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
      
      // Создаем директорию для скриншотов если её нет
      const screenshotDir = 'test-results/screenshots';
      if (!fs.existsSync(screenshotDir)){
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      // Делаем скриншот с меткой времени
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

    // Формируем отчет об ошибках
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: errorCount,
      errors: errorLog
    };

    // Сохраняем отчет в JSON файл
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `${reportsDir}/error-report-${timestamp}.json`, 
      JSON.stringify(report, null, 2)
    );

    // Выводим краткую информацию в консоль
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

  // Базовый тест загрузки страницы
  test('Проверка загрузки главной страницы', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('On guard of your safety');
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.footer')).toBeVisible();
  });

  // Проверка кнопки Get Started
  test('Проверка кнопки Get started', async ({ page }) => {
    // Делаем скриншот до нажатия
    await page.screenshot({ 
      path: 'test-results/screenshots/before-get-started.png',
      fullPage: false 
    });

    const getStartedBtn = page.locator('button:has-text("Get started")');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    try {
      // Ждем появления попапа
      const popup = page.locator('.swal2-popup');
      await expect(popup).toBeVisible({ timeout: 5000 });

      // Проверяем содержимое попапа
      const title = popup.locator('.swal2-title');
      const content = popup.locator('#swal2-content');
      
      await expect(title).toHaveText('Successfully send');
      await expect(content).toHaveText('You have successfully subscribed');

      // Закрываем попап
      const okButton = popup.locator('.swal2-confirm');
      await expect(okButton).toBeVisible();
      await okButton.click();
      await expect(popup).not.toBeVisible();

    } catch (error) {
      // Делаем скриншот ошибки
      await page.screenshot({ 
        path: 'test-results/screenshots/get-started-error.png',
        fullPage: false 
      });
      throw new Error('Кнопка Get Started не работает: попап не появился или имеет неверное содержимое');
    }

    console.log('Кнопка Get Started работает корректно: попап появился и имеет правильное содержимое');
  });

  // Проверка формы подписки с пустым email
  test('Проверка формы подписки с пустым email', async ({ page }) => {
    const subscribeBlock = page.locator('.subscribe-block');
    const emailInput = subscribeBlock.locator('input[type="text"]');
    const submitButton = subscribeBlock.locator('.submit-btn');

    // Оставляем поле пустым и отправляем
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

  // Проверка формы подписки с невалидным email
  test('Проверка формы подписки с невалидным email', async ({ page }) => {
    const subscribeBlock = page.locator('.subscribe-block');
    const emailInput = subscribeBlock.locator('input[type="text"]');
    const submitButton = subscribeBlock.locator('.submit-btn');

    // Делаем скриншот перед вводом невалидного email
    await page.screenshot({ 
      path: 'test-results/screenshots/before-invalid-email.png',
      fullPage: false 
    });

    await emailInput.fill('123@1');
    await submitButton.click();

    // Ждем появления попапа
    const popup = page.locator('.swal2-popup');
    await expect(popup).toBeVisible();

    // Проверяем содержимое попапа
    const title = popup.locator('.swal2-title');
    const content = popup.locator('#swal2-content');

    // Если появился попап успеха - тест должен провалиться
    const actualTitle = await title.textContent();
    if (actualTitle === 'Successfully send') {
      // Делаем скриншот ошибки
      await page.screenshot({ 
        path: 'test-results/screenshots/invalid-email-accepted.png',
        fullPage: false 
      });
      throw new Error('Система приняла невалидный email (123@1). Это ошибка!');
    }

    // Проверяем что появилось сообщение об ошибке
    await expect(title).toHaveText('Error');
    await expect(content).toHaveText('Wrog email');

    // Закрываем попап
    const okButton = popup.locator('.swal2-confirm');
    await expect(okButton).toBeVisible();
    await okButton.click();
    await expect(popup).not.toBeVisible();
  });

  // Проверка отображения телефона на десктопе
  test('Проверка отображения телефона на десктопе', async ({ page }) => {
    // Устанавливаем десктопное разрешение
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
    
    // Проверяем блок с телефоном
    const phoneBlock = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneBlock).toBeVisible();
    
    // Проверяем содержимое блока
    await expect(phoneBlock).toContainText('Talk to our team to start saving');
    await expect(phoneBlock).toContainText('+358 9 000 000');
  });

  // Проверка отображения телефона на мобильной версии
  test('Проверка отображения телефона на мобильной версии', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Проверяем что блок с телефоном скрыт на мобильной версии
    const phoneBlock = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneBlock).not.toBeVisible();
    
    // Проверяем что номер телефона присутствует в правильном формате
    const phoneLink = page.locator('[data-v-aec9f68e] a[href^="tel:"]');
    await expect(phoneLink).toBeVisible();
    await expect(phoneLink).toHaveAttribute('href', 'tel:+358 9 000 000');
    await expect(phoneLink).toHaveText('+358 9 000 000');

    // Проверяем наличие иконки телефона
    const phoneIcon = page.locator('[data-v-aec9f68e] img[src*="Phone"]');
    await expect(phoneIcon).toBeVisible();

    // Проверяем текст рядом с телефоном
    const phoneText = page.locator('[data-v-aec9f68e].header__phone');
    await expect(phoneText).toContainText('Talk to our team to start saving');
  });

  // Проверка мобильного меню
  test('Проверка мобильного меню', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Скриншот до нажатия на меню
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-before-menu.png',
      fullPage: false 
    });
    
    // Находим кнопку меню по точному селектору
    const menuButton = page.locator('div[data-v-aec9f68e].menu');
    await expect(menuButton).toBeVisible();

    // Проверяем наличие иконки гамбургера
    const hamburgerIcon = menuButton.locator('img[src*="Hamburger_MD"]');
    await expect(hamburgerIcon).toBeVisible();
    
    // Сохраняем DOM до клика
    const beforeClick = await page.evaluate(() => document.documentElement.innerHTML);
    
    // Нажимаем на меню
    await menuButton.click();
    
    // Ждем немного для возможных изменений
    await page.waitForTimeout(1000);
    
    // Скриншот после нажатия на меню
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-after-menu.png',
      fullPage: false 
    });

    // Проверяем изменился ли DOM после клика
    const afterClick = await page.evaluate(() => document.documentElement.innerHTML);
    
    if (beforeClick === afterClick) {
      // Делаем скриншот ошибки
      await page.screenshot({ 
        path: 'test-results/screenshots/mobile-menu-error.png',
        fullPage: false 
      });
      throw new Error('Мобильное меню не работает: после нажатия на кнопку меню ничего не происходит');
    }
  });

  // Проверка работы стрелок в отзывах
  test('Проверка работы стрелок в отзывах', async ({ page }) => {
    const reviewsSection = page.locator('.reviews');
    await expect(reviewsSection).toBeVisible();

    // Проверяем наличие и начальное состояние стрелок
    const leftArrow = reviewsSection.locator('.arrow-left');
    const rightArrow = reviewsSection.locator('.arrow-right');

    await expect(leftArrow).toHaveClass(/arrow-disabled/);
    await expect(rightArrow).toHaveClass(/arrow-enable/);

    // Проверяем начальное состояние отзывов
    const reviews = reviewsSection.locator('.review');
    await expect(reviews).toHaveCount(2);
    
    // Пытаемся переключить на следующий отзыв
    await rightArrow.click();
    
    // Проверяем изменение состояния после клика
    try {
      // Ожидаем, что левая стрелка станет активной
      await expect(leftArrow).toHaveClass(/arrow-enable/, { timeout: 2000 });
      // Если стрелки не работают - тест должен провалиться
      throw new Error('Стрелки переключения отзывов не работают');
    } catch (error) {
      throw new Error('Функционал переключения отзывов не реализован: стрелки не меняют состояние');
    }
  });

  // Проверка переключения языка
  test('Проверка переключения языка', async ({ page }) => {
    const langSelect = page.locator('[data-v-aec9f68e].header__lang');
    await expect(langSelect).toBeVisible();

    // Проверяем начальное состояние (EN)
    await expect(langSelect).toHaveValue('en');
    
    // Сохраняем начальный текст заголовка для проверки изменения языка
    const initialTitle = await page.locator('h1').textContent();
    
    // Делаем скриншот до переключения
    await page.screenshot({ 
      path: 'test-results/screenshots/before-lang-switch.png',
      fullPage: false 
    });

    // Переключаем язык на FIN
    await langSelect.selectOption('fin');
    
    // Ждем немного, чтобы изменения успели применится
    await page.waitForTimeout(1000);
    
    // Проверяем что значение селекта изменилось
    await expect(langSelect).toHaveValue('fin');
    
    // Проверяем что текст заголовка изменился
    const newTitle = await page.locator('h1').textContent();
    
    // Делаем скриншот после переключения
    await page.screenshot({ 
      path: 'test-results/screenshots/after-lang-switch.png',
      fullPage: false 
    });

    // Если заголовок не изменился - значит переключение языка не работает
    if (initialTitle === newTitle) {
      // Делаем скриншот ошибки
      await page.screenshot({ 
        path: 'test-results/screenshots/lang-switch-error.png',
        fullPage: false 
      });
      throw new Error('Переключение языка не работает: текст на странице не изменился после смены языка на FIN');
    }

    // Проверяем наличие опций в селекте через свойство value
    const options = await langSelect.evaluate((select) => {
      return Array.from(select.options).map(option => ({
        value: option.value,
        text: option.text
      }));
    });

    // Проверяем что есть все нужные опции
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