
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = window.gsap;
  const menu = $('.mobile-menu');

  menu.addEventListener('click', event => {
    if (event.target.closest('a')) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      menu.open = false;
      $('summary', menu).focus();
    }
  });

  const exhibit = $('.exhibit');
  const stage = $('.project-stage');
  const projects = $$('.project', stage);
  const modeButtons = $$('[data-view-choice]', exhibit);
  const jumpButtons = $$('[data-jump]', exhibit);
  const caseDialog = $('.case-dialog');
  const contactDialog = $('.contact-dialog');
  let current = 0;
  let caseAnimation;
  let returnFocus;
  let touchStart;
  let lastSwipe = -Infinity;

  function renderGallery(next, announce = false) {
    current = (next + projects.length) % projects.length;
    const gallery = exhibit.dataset.view === 'gallery';
    projects.forEach((project, index) => {
      const distance = (index - current + projects.length) % projects.length;
      const offset = distance > 1 ? distance - projects.length : distance;
      const selected = index === current;
      const link = $('.project-open', project);
      const name = $('h3', project).textContent;

      project.classList.toggle('is-current', selected);
      project.style.setProperty('--offset', offset);
      project.style.setProperty('--layer', selected ? '2' : '1');
      project.style.setProperty('--scale', selected ? '1' : '.92');
      project.style.setProperty('--visibility', selected ? '1' : '.72');
      link.setAttribute('aria-label', (gallery && !selected ? '移到 ' : '開啟 ') + name);
      link.setAttribute('aria-haspopup', gallery && !selected ? 'false' : 'dialog');
      jumpButtons[index].setAttribute('aria-pressed', String(selected));
    });
    $('.gallery-position', exhibit).textContent = String(current + 1).padStart(2, '0') + ' / 03';
    if (announce) $('#gallery-status').textContent = '目前展示 ' + $('h3', projects[current]).textContent;
  }

  function setView(view) {
    exhibit.dataset.view = view;
    $('.gallery-controls', exhibit).hidden = view !== 'gallery';
    stage.tabIndex = view === 'gallery' ? 0 : -1;
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewChoice === view)));
    renderGallery(current);
  }

  function openCase(link) {
    const project = link.closest('.project');
    const transcript = document.getElementById('case-' + link.dataset.case);
    const source = $('img', link);
    const sourceBox = link.getBoundingClientRect();
    const media = $('.case-dialog-media');
    const image = $('img', media);

    $('#case-label').textContent = $('.project-text .label', project).textContent;
    $('#case-title').textContent = $('summary', transcript).textContent;
    $('#case-body').replaceChildren(...Array.from(transcript.children).slice(1).map(child => child.cloneNode(true)));
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    media.style.backgroundColor = project.style.getPropertyValue('--case-tone');
    returnFocus = link;
    caseDialog.showModal();
    caseDialog.scrollTop = 0;

    if (motion && !reduced.matches) {
      const destination = media.getBoundingClientRect();
      caseAnimation = motion.timeline();
      caseAnimation.fromTo(media, {
        x: sourceBox.left - destination.left,
        y: sourceBox.top - destination.top,
        scaleX: sourceBox.width / destination.width,
        scaleY: sourceBox.height / destination.height,
        borderRadius: 16
      }, {
        x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 0, duration: .62, ease: 'power3.inOut',
        clearProps: 'transform,borderRadius'
      }).fromTo('.case-dialog-text', { y: 18, opacity: .4 }, {
        y: 0, opacity: 1, duration: .38, clearProps: 'transform,opacity'
      }, .32);
    }
  }

  projects.forEach((project, index) => {
    const link = $('.project-open', project);
    link.addEventListener('click', event => {
      event.preventDefault();
      if (performance.now() - lastSwipe < 400) return;
      if (exhibit.dataset.view === 'gallery' && index !== current) renderGallery(index, true);
      else openCase(link);
    });
    link.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.preventDefault();
        link.click();
      }
    });
  });
  modeButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.viewChoice)));
  jumpButtons.forEach(button => button.addEventListener('click', () => renderGallery(Number(button.dataset.jump), true)));
  $$('[data-shift]', exhibit).forEach(button => button.addEventListener('click', () => {
    renderGallery(current + Number(button.dataset.shift), true);
  }));
  stage.addEventListener('keydown', event => {
    if (exhibit.dataset.view !== 'gallery' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    renderGallery(current + (event.key === 'ArrowRight' ? 1 : -1), true);
    if (event.target.matches('.project-open')) $('.project-open', projects[current]).focus({ preventScroll: true });
  });
  stage.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    touchStart = event.touches.length === 1 ? [touch.clientX, touch.clientY] : undefined;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!touchStart || exhibit.dataset.view !== 'gallery') return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart[0];
    const dy = touch.clientY - touchStart[1];
    touchStart = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      lastSwipe = performance.now();
      renderGallery(current + (dx < 0 ? 1 : -1), true);
    }
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touchStart = undefined; });
  $$('.case-transcript', exhibit).forEach(detail => { detail.hidden = true; });
  $('.gallery-modes', exhibit).hidden = false;
  setView('gallery');

  function focusContact() {
    $('#contact-title').focus({ preventScroll: true });
    $('#contact').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  caseDialog.addEventListener('close', () => {
    caseAnimation?.progress(1).kill();
    caseAnimation = undefined;
    returnFocus?.focus({ preventScroll: true });
    returnFocus = undefined;
  });
  $('#case-contact').addEventListener('click', event => {
    event.preventDefault();
    returnFocus = undefined;
    caseDialog.close();
    history.replaceState(null, '', '#contact');
    focusContact();
  });

  $$('[data-contact]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    returnFocus = link.closest('.mobile-menu') ? $('summary', menu) : link;
    menu.open = false;
    contactDialog.showModal();
  }));
  contactDialog.addEventListener('click', event => {
    if (event.target !== contactDialog) return;
    const bounds = contactDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) contactDialog.close();
  });
  contactDialog.addEventListener('close', () => {
    returnFocus?.focus({ preventScroll: true });
    returnFocus = undefined;
  });

  const scenarios = [
    {
      tag: 'PERSONAL WORK',
      title: '把待辦事項，變成每日工作節奏。',
      description: '先整理資訊，再根據優先順序安排工作，最後留下能追蹤的交付紀錄。',
      steps: [
        ['資料整理', '蒐集並整理零散資訊'],
        ['優先順序', '判斷優先順序與工作節點'],
        ['每日清單', '輸出可執行的任務清單']
      ]
    },
    {
      tag: 'CONTENT CREATION',
      title: '從一個主題，走到完整內容企劃。',
      description: '把模糊的靈感拆成受眾、訊息、素材與發布步驟，減少重複修改。',
      steps: [
        ['定位', '釐清目標客群與內容角度'],
        ['腳本', '拆成腳本、視覺與文案任務'],
        ['素材', '校稿並整理發布流程']
      ]
    },
    {
      tag: 'TEAM OPERATIONS',
      title: '讓團隊不再靠訊息追進度。',
      description: '建立任務交辦、責任歸屬與檢查機制，協助團隊維持一致的工作節奏。',
      steps: [
        ['角色', '定義角色與協作責任'],
        ['協作', '安排工作交接與審核節點'],
        ['回報', '追蹤結果與待改善問題']
      ]
    }
  ];

  const scenarioButtons = $$('[data-scenario]');
  const exerciseNext = $('#exercise-next');
  const scenarioSteps = $('#scenario-steps');
  let activeStep = 0;

  function setStep(index) {
    const entries = Array.from(scenarioSteps.children);
    activeStep = index % entries.length;
    entries.forEach((entry, i) => {
      if (i === activeStep) entry.setAttribute('aria-current', 'step');
      else entry.removeAttribute('aria-current');
    });
    exerciseNext.firstChild.textContent = activeStep === entries.length - 1 ? '從頭再走 ' : '走下一步 ';
    $('#exercise-status').textContent = '第 ' + (activeStep + 1) + ' 步，' + entries[activeStep].textContent;
  }

  function setScenario(index) {
    const scenario = scenarios[index];
    scenarioButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    $('#scenario-type').textContent = scenario.tag;
    $('#scenario-title').textContent = scenario.title;
    $('#scenario-description').textContent = scenario.description;
    scenarioSteps.replaceChildren(...scenario.steps.map(([label, description]) => {
      const step = document.createElement('li');
      const words = document.createElement('span');
      const tag = document.createElement('small');
      tag.textContent = label;
      words.append(tag, description);
      step.append(words);
      return step;
    }));
    setStep(0);
  }

  scenarioButtons.forEach((button, index) => button.addEventListener('click', () => setScenario(index)));
  exerciseNext.addEventListener('click', () => setStep(activeStep + 1));
  $('.scenarios').hidden = false;
  $('.exercise-tools').hidden = false;
  setScenario(0);

  const toast = $('.toast');
  let toastTimer;

  async function copyText(value, trigger) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.className = 'sr-only';
      (trigger.closest('dialog[open]') || document.body).append(field);
      field.select();
      try { return document.execCommand('copy'); }
      catch { return false; }
      finally {
        field.remove();
        trigger.focus({ preventScroll: true });
      }
    }
  }

  $$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    const copied = await copyText(value, button);
    (button.closest('dialog[open]') || document.body).append(toast);
    toast.textContent = (copied ? '已複製 ' : '聯絡號碼 ') + value;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }));

  if (motion) {
    if (window.ScrollTrigger) motion.registerPlugin(window.ScrollTrigger);
    motion.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      motion.timeline({ defaults: { ease: 'power3.out' } })
        .from('.portrait-shell', { y: 32, autoAlpha: .58, duration: 1.05 }, 0)
        .from('.hero-name > *', { yPercent: 36, autoAlpha: 0, duration: .83, stagger: .11 }, .19)
        .from('.hero-role, .hero-caption', { y: 8, autoAlpha: 0, duration: .47, stagger: .06 }, .51);

      if (window.ScrollTrigger) {
        motion.to('.hero-photo', {
          y: 100, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
      }
    });
  }
})();
