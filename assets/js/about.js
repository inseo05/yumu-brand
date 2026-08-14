/**
 * YUMU - About page
 * Hero 세로 문구 text-focus-in 순차 등장
 * 텍스트 스크롤 연동 opacity (ScrollTrigger scrub)
 */

const ABOUT_REVEAL = {
  pending: 0.25,
  active: 1,
  passed: 0.55,
};

document.addEventListener('DOMContentLoaded', () => {
  initAboutHeroPhrases();
  initAboutScrollReveals();
  initAboutNameEntrances();
  initAboutNameHanjaAlign();
  initAboutMeaningAnimation();
  initAboutSymbolAnimation();
  initAboutNameMobileScale();
  initAboutMaterialStory();
});

function initAboutHeroPhrases() {
  const rightPhrase = document.querySelector('.about-hero__phrase--right');
  const leftPhrase = document.querySelector('.about-hero__phrase--left');

  if (!rightPhrase || !leftPhrase) return;

  const HERO_HOLD_MS = 500;

  const playFocusIn = (element) => {
    element.classList.remove('text-focus-in');
    void element.offsetWidth;
    element.classList.add('text-focus-in');
  };

  const onRightAnimationEnd = (event) => {
    if (event.target !== rightPhrase) return;
    if (event.animationName && event.animationName !== 'text-focus-in') return;
    rightPhrase.removeEventListener('animationend', onRightAnimationEnd);
    playFocusIn(leftPhrase);
  };

  rightPhrase.addEventListener('animationend', onRightAnimationEnd);

  // Hero 표시 후 0.5초 대기 → 오른쪽 → (animationend) → 왼쪽
  window.setTimeout(() => {
    playFocusIn(rightPhrase);
  }, HERO_HOLD_MS);
}

/**
 * @param {Array<Element|Element[]>} lines
 * @returns {gsap.core.Timeline[]}
 */
function createOpacityRevealTimelines(lines) {
  const { pending, active, passed } = ABOUT_REVEAL;
  const flat = lines.flat();

  gsap.set(flat, {
    opacity: pending,
    clearProps: 'filter,y,x,translate,transform',
  });

  return lines.map((line) => {
    const targets = Array.isArray(line) ? line : [line];

    return gsap
      .timeline({
        scrollTrigger: {
          trigger: targets[0],
          endTrigger: targets[targets.length - 1],
          start: 'top 85%',
          end: 'bottom 25%',
          scrub: true,
        },
      })
      .fromTo(
        targets,
        { opacity: pending },
        { opacity: active, duration: 0.5, ease: 'none' }
      )
      .to(targets, {
        opacity: passed,
        duration: 0.5,
        ease: 'none',
      });
  });
}

function initAboutScrollReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  initAboutIntroReveal();
  initAboutSectionReveals();

  const refreshTriggers = () => {
    ScrollTrigger.refresh();
  };

  requestAnimationFrame(refreshTriggers);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshTriggers);
  }

  window.addEventListener('load', refreshTriggers, { once: true });
}

function initAboutIntroReveal() {
  const section = document.querySelector('.about-intro');
  const parts = Array.from(document.querySelectorAll('.about-intro__part'));

  if (!section || !parts.length) return;

  const getGroups = (attr) => {
    const map = new Map();

    parts.forEach((part) => {
      const key = part.getAttribute(attr);
      if (key === null) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(part);
    });

    return Array.from(map.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, group]) => group);
  };

  const createReveal = (attr) => {
    const groups = getGroups(attr);
    if (!groups.length) return () => {};

    const timelines = createOpacityRevealTimelines(groups);

    return () => {
      timelines.forEach((timeline) => {
        if (timeline.scrollTrigger) timeline.scrollTrigger.kill();
        timeline.kill();
      });
      gsap.set(parts, {
        opacity: ABOUT_REVEAL.pending,
        clearProps: 'filter,y,x,translate,transform',
      });
    };
  };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 64.0625rem)', () => createReveal('data-d'));
  mm.add('(max-width: 64rem) and (min-width: 48.0625rem)', () => createReveal('data-t'));
  mm.add('(max-width: 48rem)', () => createReveal('data-m'));
}

function initAboutSectionReveals() {
  const sections = Array.from(document.querySelectorAll('[data-about-reveal]'));

  sections.forEach((section) => {
    // about-name / about-meaning: 별도 등장 로직 사용 (scrub 제외)
    if (
      section.classList.contains('about-name') ||
      section.classList.contains('about-meaning')
    ) {
      return;
    }

    const lines = Array.from(section.querySelectorAll('.about-reveal__line'));
    if (!lines.length) return;
    createOpacityRevealTimelines(lines);
  });
}

/**
 * about-meaning — 제목 → 문단별 text-focus-in, 이탈 시 전체 text-blur-out
 *
 * 버그 원인: onLeave에서 스크롤을 되돌리면 onEnterBack → showComplete()가
 * 호출되어 등장/1초 잠금이 중간에 취소됨.
 *
 * 등장~읽기 잠금 동안 섹션을 pin 하고, 잠금 해제 후에만 이탈·blur-out 허용.
 */
function initAboutMeaningAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.about-meaning');
  if (!section) return;

  const title = section.querySelector('.about-meaning__title');
  const paragraphs = Array.from(
    section.querySelectorAll('.about-meaning__paragraph')
  );
  if (!title || !paragraphs.length) return;

  const allText = [title, ...paragraphs];
  const READ_LOCK_MS = 1000;
  let hasPlayedEnter = false;
  let isAnimating = false;
  let isBlurredOut = false;
  /** 등장 + 읽기 1초 동안 true — blur-out/재진입 완성 처리 금지 */
  let isSequenceActive = false;
  let enterToken = 0;
  let touchStartY = 0;
  /** @type {ScrollTrigger | null} */
  let pinTrigger = null;

  const waitForAnimation = (element, animationName, fallbackMs) =>
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        element.removeEventListener('animationend', onEnd);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target !== element) return;
        if (event.animationName && event.animationName !== animationName) return;
        finish();
      };
      element.addEventListener('animationend', onEnd);
      setTimeout(finish, fallbackMs);
    });

  const delay = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearTextAnimation = (element) => {
    element.classList.remove('text-blur-out', 'text-focus-in', 'is-shown');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
  };

  const showComplete = () => {
    if (isSequenceActive) return;

    enterToken += 1;
    isAnimating = false;
    isBlurredOut = false;
    hasPlayedEnter = true;
    allText.forEach((element) => {
      clearTextAnimation(element);
      element.classList.add('is-shown');
    });
  };

  const playFocusIn = async (element, token) => {
    if (token !== enterToken) return;
    clearTextAnimation(element);
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', 900);
    if (token !== enterToken) return;
    element.classList.remove('text-focus-in');
    element.style.removeProperty('filter');
    element.classList.add('is-shown');
  };

  const killPin = () => {
    if (!pinTrigger) return;
    pinTrigger.kill(true);
    pinTrigger = null;
    ScrollTrigger.refresh();
  };

  const playEnter = async () => {
    if (hasPlayedEnter || isAnimating || isSequenceActive) return;

    isAnimating = true;
    isSequenceActive = true;
    isBlurredOut = false;
    const token = ++enterToken;

    // 섹션을 화면 상단에 맞춘 뒤 pin — 읽는 동안 다음 섹션으로 못 넘어감
    killPin();
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, sectionTop);

    pinTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=200%',
      pin: true,
      anticipatePin: 1,
    });
    window.scrollTo(0, pinTrigger.start);

    const freezeScroll = () => {
      if (!pinTrigger) return;
      if (window.scrollY > pinTrigger.start) {
        window.scrollTo(0, pinTrigger.start);
      }
    };

    const onWheel = (event) => {
      if (!isSequenceActive || event.deltaY <= 0) return;
      event.preventDefault();
      freezeScroll();
    };
    const onTouchStart = (event) => {
      if (!event.touches.length) return;
      touchStartY = event.touches[0].clientY;
    };
    const onTouchMove = (event) => {
      if (!isSequenceActive || !event.touches.length) return;
      const deltaY = touchStartY - event.touches[0].clientY;
      if (deltaY <= 0) return;
      event.preventDefault();
      freezeScroll();
    };
    const onKeyDown = (event) => {
      if (!isSequenceActive) return;
      if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        freezeScroll();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    const releaseListeners = () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };

    try {
      await playFocusIn(title, token);
      if (token !== enterToken) return;

      for (const paragraph of paragraphs) {
        await playFocusIn(paragraph, token);
        if (token !== enterToken) return;
      }

      hasPlayedEnter = true;

      // 등장 완료 후 1초 더 아래 스크롤 고정
      freezeScroll();
      await delay(READ_LOCK_MS);
      if (token !== enterToken) return;
    } finally {
      releaseListeners();
      if (token === enterToken) {
        isSequenceActive = false;
        isAnimating = false;
        killPin();
      }
    }
  };

  const playBlurOut = async () => {
    if (isBlurredOut || isSequenceActive) return;

    enterToken += 1;
    isAnimating = true;
    isBlurredOut = true;

    allText.forEach((element) => {
      element.classList.remove('text-blur-out', 'text-focus-in');
      element.style.removeProperty('filter');
      element.style.opacity = '1';
      element.classList.remove('is-shown');
    });

    if (allText[0]) void allText[0].offsetWidth;
    allText.forEach((element) => {
      element.classList.add('text-blur-out');
    });

    try {
      await Promise.all(
        allText.map((element) => waitForAnimation(element, 'text-blur-out', 900))
      );
    } finally {
      allText.forEach((element) => {
        element.classList.remove('text-blur-out', 'is-shown');
        element.style.removeProperty('filter');
        element.style.removeProperty('opacity');
      });
      isAnimating = false;
    }
  };

  // 등장 시작
  ScrollTrigger.create({
    trigger: section,
    start: 'top 50%',
    onEnter() {
      playEnter();
    },
    onRefresh(self) {
      if (self.progress > 0 && !hasPlayedEnter && !isSequenceActive) {
        playEnter();
      }
    },
  });

  // 이탈(blur-out): 시퀀스 종료 후에만, 섹션이 위로 빠져나갈 때
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom top',
    onLeave() {
      if (isSequenceActive) return;
      playBlurOut();
    },
    onEnterBack() {
      if (isSequenceActive) return;
      showComplete();
    },
  });
}

/**
 * Name meaning 한자 — 텍스트 박스(.about-name__copy) 세로 중앙에 맞춤
 * slot의 top/height만 조정하고, 한자 자체는 line-height:100% + translateY(-50%) 유지
 */
function syncAboutNameHanjaAlign() {
  const isMobile = window.matchMedia('(max-width: 48rem)').matches;

  document.querySelectorAll('.about-name').forEach((section) => {
    const body = section.querySelector('.about-name__body');
    const copy = section.querySelector('.about-name__copy');
    const slot = section.querySelector('.about-name__hanja-slot');
    if (!body || !copy || !slot) return;

    if (isMobile) {
      slot.style.top = '';
      slot.style.bottom = '';
      slot.style.height = '';
      return;
    }

    const bodyRect = body.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();

    slot.style.top = `${copyRect.top - bodyRect.top}px`;
    slot.style.bottom = 'auto';
    slot.style.height = `${copyRect.height}px`;
  });
}

function initAboutNameHanjaAlign() {
  syncAboutNameHanjaAlign();
  window.addEventListener('resize', syncAboutNameHanjaAlign);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncAboutNameHanjaAlign);
  }
}

/**
 * Name meaning — 도자기(釉)·안개(霧)
 * motion wrapper x 이동 → heading opacity → text opacity (순차)
 * 한자 요소의 CSS transform/위치는 건드리지 않음
 */
function initAboutNameEntrances() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const configs = [
    {
      section: document.querySelector('.about-name:not(.about-name--fog)'),
      direction: -1,
    },
    {
      section: document.querySelector('.about-name--fog'),
      direction: 1,
    },
  ];

  configs.forEach(({ section, direction }) => {
    if (!section) return;

    const hanjaMotion = section.querySelector('.about-name__hanja-motion');
    const heading = section.querySelector('.about-name__heading');
    const bodyText = section.querySelector('.about-name__text');

    if (!hanjaMotion || !heading || !bodyText) return;

    gsap.set(hanjaMotion, {
      x: () => direction * Math.max(window.innerWidth, section.offsetWidth),
    });
    gsap.set([heading, bodyText], { opacity: 0.25, clearProps: 'transform,y' });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        hanjaMotion,
        {
          x: () => direction * Math.max(window.innerWidth, section.offsetWidth),
        },
        {
          x: 0,
          duration: 2.2,
          ease: 'power2.out',
        }
      )
      .fromTo(
        heading,
        { opacity: 0.25 },
        { opacity: 1, duration: 1.2, ease: 'power2.out' },
        '-=0.4'
      )
      .fromTo(
        bodyText,
        { opacity: 0.25 },
        { opacity: 1, duration: 1.2, ease: 'power2.out' }
      )
      .add(() => {
        // FOUC CSS 해제 후에야 clearProps — 제목이 다시 숨겨지지 않도록
        section.classList.add('is-name-entered');
        gsap.set([heading, bodyText], { clearProps: 'opacity,transform' });
      });
  });

  ScrollTrigger.refresh();
}

/**
 * about-symbol
 * 이미지 먼저 → (선 0.6s → 0.5s → text-focus-in) × 좌/상 → 우/하
 * PC: 좌→우 / tablet·mobile: 위→아래 / 재진입: 완성 상태
 */
function initAboutSymbolAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.about-symbol');
  if (!section) return;

  const textA = section.querySelector('.about-symbol__text--a');
  const textB = section.querySelector('.about-symbol__text--b');
  const ruleA = section.querySelector('.about-symbol__rule--a');
  const ruleB = section.querySelector('.about-symbol__rule--b');
  if (!textA || !textB || !ruleA || !ruleB) return;

  const LINE_DURATION = 0.6;
  const LINE_TO_TEXT_DELAY_MS = 500;
  const FOCUS_FALLBACK_MS = 900;

  let hasPlayed = false;
  let isAnimating = false;
  let playToken = 0;

  const waitForAnimation = (element, animationName, fallbackMs) =>
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        element.removeEventListener('animationend', onEnd);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target !== element) return;
        if (event.animationName && event.animationName !== animationName) return;
        finish();
      };
      element.addEventListener('animationend', onEnd);
      setTimeout(finish, fallbackMs);
    });

  const delay = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearTextAnimation = (element) => {
    element.classList.remove('text-blur-out', 'text-focus-in', 'is-shown');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
  };

  const clipStart = {
    left: 'inset(0 0 0 100%)',
    right: 'inset(0 100% 0 0)',
    up: 'inset(100% 0 0 0)',
    down: 'inset(0 0 100% 0)',
  };

  const setRulesHidden = (vertical) => {
    if (vertical) {
      gsap.set(ruleA, { clipPath: clipStart.up });
      gsap.set(ruleB, { clipPath: clipStart.down });
      return;
    }
    gsap.set(ruleA, { clipPath: clipStart.left });
    gsap.set(ruleB, { clipPath: clipStart.right });
  };

  const showComplete = () => {
    playToken += 1;
    isAnimating = false;
    hasPlayed = true;
    section.classList.add('is-symbol-entered');
    [textA, textB].forEach((element) => {
      clearTextAnimation(element);
      element.classList.add('is-shown');
    });
    gsap.set([ruleA, ruleB], { clipPath: 'none' });
  };

  const resetHidden = (vertical) => {
    if (hasPlayed) {
      showComplete();
      return;
    }
    section.classList.remove('is-symbol-entered');
    [textA, textB].forEach(clearTextAnimation);
    setRulesHidden(vertical);
  };

  const animateRule = (rule, direction) =>
    gsap.fromTo(
      rule,
      { clipPath: clipStart[direction] },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: LINE_DURATION,
        ease: 'power2.out',
      }
    );

  const playFocusIn = async (element, token) => {
    if (token !== playToken) return;
    clearTextAnimation(element);
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', FOCUS_FALLBACK_MS);
    if (token !== playToken) return;
    element.classList.remove('text-focus-in');
    element.style.removeProperty('filter');
    element.classList.add('is-shown');
  };

  const playEnter = async (vertical) => {
    if (hasPlayed || isAnimating) return;

    isAnimating = true;
    const token = ++playToken;
    setRulesHidden(vertical);
    [textA, textB].forEach(clearTextAnimation);

    const firstRuleDir = vertical ? 'up' : 'left';
    const secondRuleDir = vertical ? 'down' : 'right';

    try {
      await animateRule(ruleA, firstRuleDir);
      if (token !== playToken) return;

      await delay(LINE_TO_TEXT_DELAY_MS);
      if (token !== playToken) return;

      await playFocusIn(textA, token);
      if (token !== playToken) return;

      await animateRule(ruleB, secondRuleDir);
      if (token !== playToken) return;

      await delay(LINE_TO_TEXT_DELAY_MS);
      if (token !== playToken) return;

      await playFocusIn(textB, token);
      if (token !== playToken) return;

      hasPlayed = true;
      section.classList.add('is-symbol-entered');
    } finally {
      if (token === playToken) {
        isAnimating = false;
      }
    }
  };

  const createTrigger = (vertical) => {
    resetHidden(vertical);

    return ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      onEnter() {
        if (!hasPlayed) {
          playEnter(vertical);
          return;
        }
        showComplete();
      },
      onEnterBack() {
        showComplete();
      },
    });
  };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1441px)', () => {
    const trigger = createTrigger(false);
    return () => trigger.kill();
  });

  mm.add('(max-width: 1440px)', () => {
    const trigger = createTrigger(true);
    return () => trigger.kill();
  });
}

function initAboutNameMobileScale() {
  const sections = Array.from(document.querySelectorAll('.about-name'));
  if (!sections.length) return;

  const BASE_WIDTH = 360;
  const BASE_HEIGHT = 808;
  const mobileQuery = window.matchMedia('(max-width: 48rem)');

  const pairs = sections
    .map((section) => ({
      viewport: section.querySelector('.about-name__viewport'),
      stage: section.querySelector('.about-name__stage'),
    }))
    .filter((pair) => pair.viewport && pair.stage);

  if (!pairs.length) return;

  const updateScale = () => {
    pairs.forEach(({ viewport, stage }) => {
      if (!mobileQuery.matches) {
        stage.style.transform = '';
        return;
      }

      const scale = Math.min(
        viewport.clientWidth / BASE_WIDTH,
        viewport.clientHeight / BASE_HEIGHT
      );

      stage.style.transform = `scale(${scale})`;
    });

    syncAboutNameHanjaAlign();

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  };

  updateScale();
  window.addEventListener('resize', updateScale);
  mobileQuery.addEventListener('change', updateScale);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateScale);
  }
}

function initAboutMaterialStory() {
  const root = document.querySelector('.about-material__swiper');
  const fill = document.querySelector('.about-material__progress-fill');

  if (!root || !fill || typeof Swiper === 'undefined') return;

  const setProgress = (ratio) => {
    const value = Math.min(1, Math.max(0, ratio));

    if (typeof gsap !== 'undefined') {
      gsap.set(fill, { scaleX: value, transformOrigin: 'left center' });
      return;
    }

    fill.style.transformOrigin = 'left center';
    fill.style.transform = `scaleX(${value})`;
  };

  const swiper = new Swiper(root, {
    slidesPerView: 1,
    spaceBetween: 0,
    loop: true,
    speed: 500,
    grabCursor: true,
    allowTouchMove: true,
    followFinger: true,
    freeMode: false,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    on: {
      init() {
        setProgress(0);
      },
      slideChange() {
        setProgress(0);
      },
      autoplayTimeLeft(_swiper, _time, progress) {
        // progress: 1 → 0 (remaining). Fill should go 0 → 1.
        setProgress(1 - progress);
      },
    },
  });

  return swiper;
}
