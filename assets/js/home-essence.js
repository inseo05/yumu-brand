/**
 * YUMU - Home Essence section
 * Material 다음 4단계 스크롤 인터랙션 (단계형 휠/터치)
 */

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.essence');
  if (!section) return;

  const viewport = section.querySelector('.essence__viewport');
  const bgLight = section.querySelector('.essence__bg--light');
  const bgBrand = section.querySelector('.essence__bg--brand');
  const logos = section.querySelector('.essence__logos');
  const logoBase = section.querySelector('.essence__logo--base');
  const logoCeramic = section.querySelector('.essence__logo--ceramic');
  const logoFog = section.querySelector('.essence__logo--fog');

  const stageEls = [
    section.querySelector('.essence__stage--1'),
    section.querySelector('.essence__stage--2'),
    section.querySelector('.essence__stage--3'),
    section.querySelector('.essence__stage--4'),
  ];

  const introText = section.querySelector('.essence__intro');
  const ceramicHanja = section.querySelector('.essence__pair--ceramic .essence__hanja');
  const ceramicDivider = section.querySelector('.essence__pair--ceramic .essence__divider');
  const ceramicDesc = section.querySelector('.essence__pair--ceramic .essence__desc');
  const fogHanja = section.querySelector('.essence__pair--fog .essence__hanja');
  const fogDivider = section.querySelector('.essence__pair--fog .essence__divider');
  const fogDesc = section.querySelector('.essence__pair--fog .essence__desc');
  const finale = section.querySelector('.essence__finale');
  const finaleTop = section.querySelector('.essence__finale-line--top');
  const finaleBrand = section.querySelector('.essence__finale-brand');
  const finaleKo = section.querySelector('.essence__finale-ko');
  const finaleHanja = section.querySelector('.essence__finale-hanja');
  const finaleBottom = section.querySelector('.essence__finale-line--bottom');

  if (!viewport || stageEls.some((el) => !el)) return;

  const LAST_STAGE = 3;
  const ENTRY_STAGE = -1; // 로고만 표시
  const WHEEL_THRESHOLD = 4;
  const TOUCH_THRESHOLD = 40;
  const GESTURE_IDLE_MS = 220;
  const HOLD_MS = 800;
  /** 장면 완성 후 머무름 (ms) — 단순/텍스트량에 따라 차등, 마지막 장면은 exit hold 사용 */
  const STAGE_DWELL_MS = {
    0: 750, // 인트로 한 줄
    1: 1100, // 釉 + 설명 두 줄
    2: 1100, // 霧 + 설명 두 줄
  };

  let currentStage = ENTRY_STAGE;
  let isAnimating = false;
  let isSectionActive = false;
  let canExitDown = false;
  let awaitingGestureEnd = false;
  let absorbInertia = false;
  let gestureIdleTimer = null;
  let touchStartY = 0;
  let touchGestureConsumed = false;
  let isReady = false;
  /** 페이지당 최초 Essence 진입 0.8초 유지 완료 */
  let hasCompletedEntryHold = false;
  let isEntryHolding = false;
  /** 마지막 장면 완료 후 0.8초 유지 완료 (해당 방문) */
  let hasCompletedExitHold = false;
  let isExitHolding = false;
  /** 마지막 장면 텍스트 blur-out 완료 (해당 방문) */
  let hasPlayedFinaleOut = false;
  /** 장면 사이 짧은 머무름 */
  let isStageDwelling = false;
  let entryHoldTimer = null;
  let exitHoldTimer = null;
  let stageDwellTimer = null;
  /** @type {ScrollTrigger | null} */
  let scrollTrigger = null;
  /** @type {gsap.core.Tween | gsap.core.Timeline | null} */
  let activeTween = null;

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

  const pingGestureActivity = () => {
    clearTimeout(gestureIdleTimer);
    gestureIdleTimer = setTimeout(() => {
      if (!isAnimating) {
        awaitingGestureEnd = false;
        absorbInertia = false;
      }
    }, GESTURE_IDLE_MS);
  };

  const beginGesture = () => {
    awaitingGestureEnd = true;
    pingGestureActivity();
  };

  const finishAnimating = () => {
    isAnimating = false;
    activeTween = null;
    pingGestureActivity();
  };

  const clearEntryHoldTimer = () => {
    if (entryHoldTimer != null) {
      clearTimeout(entryHoldTimer);
      entryHoldTimer = null;
    }
    isEntryHolding = false;
  };

  const clearExitHoldTimer = () => {
    if (exitHoldTimer != null) {
      clearTimeout(exitHoldTimer);
      exitHoldTimer = null;
    }
    isExitHolding = false;
  };

  const clearStageDwellTimer = () => {
    if (stageDwellTimer != null) {
      clearTimeout(stageDwellTimer);
      stageDwellTimer = null;
    }
    isStageDwelling = false;
  };

  /** 장면 완성 후 짧은 머무름 — 다음 스크롤 입력 전까지 잠금 */
  const startStageDwell = (stage) => {
    const dwellMs = STAGE_DWELL_MS[stage];
    if (dwellMs == null) {
      finishAnimating();
      return;
    }

    clearStageDwellTimer();
    isStageDwelling = true;
    isAnimating = true;
    stageDwellTimer = setTimeout(() => {
      stageDwellTimer = null;
      isStageDwelling = false;
      finishAnimating();
    }, dwellMs);
  };

  /** 최초 진입: 로고만 0.8초 잠금 (자동으로 첫 장면 시작하지 않음) */
  const startEntryHold = () => {
    if (hasCompletedEntryHold || isEntryHolding) return;

    isEntryHolding = true;
    isAnimating = true;
    clearTimeout(entryHoldTimer);
    entryHoldTimer = setTimeout(() => {
      entryHoldTimer = null;
      isEntryHolding = false;
      hasCompletedEntryHold = true;
      finishAnimating();
    }, HOLD_MS);
  };

  /** 마지막 장면 완료 후 0.8초 잠금 (자동 이탈하지 않음) */
  const startExitHold = () => {
    if (hasCompletedExitHold || isExitHolding) return;

    isExitHolding = true;
    isAnimating = true;
    clearTimeout(exitHoldTimer);
    exitHoldTimer = setTimeout(() => {
      exitHoldTimer = null;
      isExitHolding = false;
      hasCompletedExitHold = true;
      finishAnimating();
    }, HOLD_MS);
  };

  const setLogoState = (state, immediate = false) => {
    const map = {
      base: { base: true, ceramic: false, fog: false },
      ceramic: { base: true, ceramic: true, fog: false },
      fog: { base: true, ceramic: false, fog: true },
      none: { base: false, ceramic: false, fog: false },
    }[state];

    const apply = (el, visible) => {
      if (!el) return;
      if (immediate) {
        gsap.set(el, { opacity: visible ? 1 : 0 });
      } else {
        gsap.to(el, { opacity: visible ? 1 : 0, duration: 0.55, ease: 'power1.out' });
      }
    };

    apply(logoBase, map.base);
    apply(logoCeramic, map.ceramic);
    apply(logoFog, map.fog);
  };

  const setStageVisibility = (index) => {
    stageEls.forEach((el, i) => {
      const active = i === index;
      el.classList.toggle('is-active', active);
      gsap.set(el, {
        opacity: active ? 1 : 0,
        visibility: active ? 'visible' : 'hidden',
        filter: 'blur(0px)',
      });
    });
  };

  const resetPairToStart = (type) => {
    if (type === 'ceramic') {
      gsap.set(ceramicHanja, { xPercent: 70 });
      gsap.set(ceramicDivider, { opacity: 0 });
      gsap.set(ceramicDesc, { opacity: 0, y: 28 });
    } else {
      gsap.set(fogHanja, { xPercent: -70 });
      gsap.set(fogDivider, { opacity: 0 });
      gsap.set(fogDesc, { opacity: 0, y: 28 });
    }
  };

  const setPairComplete = (type) => {
    if (type === 'ceramic') {
      gsap.set(ceramicHanja, { xPercent: 0 });
      gsap.set(ceramicDivider, { opacity: 1 });
      gsap.set(ceramicDesc, { opacity: 1, y: 0 });
    } else {
      gsap.set(fogHanja, { xPercent: 0 });
      gsap.set(fogDivider, { opacity: 1 });
      gsap.set(fogDesc, { opacity: 1, y: 0 });
    }
  };

  const finaleItems = [finaleTop, finaleBrand, finaleBottom].filter(Boolean);

  const clearFinaleTextAnimations = () => {
    finaleItems.forEach((el) => {
      el.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
      el.style.removeProperty('filter');
      el.style.removeProperty('opacity');
    });
    if (finaleKo) {
      finaleKo.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
      finaleKo.style.removeProperty('filter');
      finaleKo.style.removeProperty('opacity');
      finaleKo.style.removeProperty('letter-spacing');
    }
    if (finaleHanja) {
      finaleHanja.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
      finaleHanja.style.removeProperty('filter');
      finaleHanja.style.removeProperty('opacity');
    }
  };

  const playTextFocusIn = async (element) => {
    if (!element) return;
    element.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
    void element.offsetWidth;
    element.classList.add('text-focus-in');
    await waitForAnimation(element, 'text-focus-in', 900);
  };

  const playFocusInExpand = async (element) => {
    if (!element) return;
    element.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
    element.style.removeProperty('filter');
    element.style.removeProperty('opacity');
    element.style.removeProperty('letter-spacing');
    void element.offsetWidth;
    element.classList.add('focus-in-expand');
    await waitForAnimation(element, 'focus-in-expand', 900);
  };

  const setFinaleStart = () => {
    clearFinaleTextAnimations();
    gsap.set(finaleItems, { opacity: 0, clearProps: 'y,transform' });
    gsap.set(bgBrand, { opacity: 0 });
    gsap.set(bgLight, { opacity: 1 });
    gsap.set(logos, { opacity: 1 });
  };

  const setFinaleComplete = () => {
    clearFinaleTextAnimations();
    gsap.set(bgLight, { opacity: 0 });
    gsap.set(bgBrand, { opacity: 1 });
    gsap.set(logos, { opacity: 0 });
    gsap.set(stageEls[3], {
      opacity: 1,
      filter: 'blur(0px)',
      visibility: 'visible',
    });
    gsap.set(finaleItems, { opacity: 1, clearProps: 'y,transform,filter' });
    if (finaleKo) gsap.set(finaleKo, { opacity: 1, clearProps: 'filter,letterSpacing' });
    if (finaleHanja) gsap.set(finaleHanja, { opacity: 1, clearProps: 'filter' });
  };

  /** 마지막 장면 텍스트 동시 blur-out — 배경은 유지 */
  const playFinaleBlurOut = async () => {
    if (isAnimating || hasPlayedFinaleOut) return;

    isAnimating = true;

    // 형제 단위로 동일 클래스·동일 타이밍 적용 (유무/釉霧는 brand 래퍼로 함께)
    const targets = [finaleTop, finaleBrand, finaleBottom].filter(Boolean);

    clearFinaleTextAnimations();
    targets.forEach((el) => {
      // .essence__finale-line / brand 기본 opacity:0 이므로 인라인으로 보여 둔 뒤 애니메이션
      el.style.opacity = '1';
      el.style.removeProperty('filter');
    });
    if (finaleKo) {
      finaleKo.style.opacity = '1';
      finaleKo.style.removeProperty('filter');
      finaleKo.style.removeProperty('letter-spacing');
    }
    if (finaleHanja) {
      finaleHanja.style.opacity = '1';
      finaleHanja.style.removeProperty('filter');
    }

    // 리플로우 1회 후 같은 프레임에 클래스 부여 → 동일 속도·동시 시작
    if (targets[0]) void targets[0].offsetWidth;
    targets.forEach((el) => {
      el.classList.add('text-blur-out');
    });

    try {
      await Promise.all(
        targets.map((el) => waitForAnimation(el, 'text-blur-out', 900))
      );
      hasPlayedFinaleOut = true;
    } finally {
      finishAnimating();
    }
  };

  /** 최초 진입용: 배경 로고만 (스테이지 텍스트 숨김) */
  const showLogoOnly = () => {
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }

    currentStage = ENTRY_STAGE;

    stageEls.forEach((el) => {
      el.classList.remove('is-active');
      gsap.set(el, {
        opacity: 0,
        visibility: 'hidden',
        filter: 'blur(0px)',
      });
    });

    if (introText) {
      introText.classList.remove('text-blur-out', 'text-focus-in');
      gsap.set(introText, { opacity: 0, clearProps: 'filter' });
    }

    gsap.set(bgLight, { opacity: 1 });
    gsap.set(bgBrand, { opacity: 0 });
    gsap.set(logos, { opacity: 1 });
    setLogoState('base', true);
    resetPairToStart('ceramic');
    resetPairToStart('fog');
    setFinaleStart();
  };

  const showStageInstant = (stage) => {
    if (activeTween) {
      activeTween.kill();
      activeTween = null;
    }

    if (introText) {
      introText.classList.remove('text-blur-out', 'text-focus-in');
      introText.style.removeProperty('filter');
      introText.style.removeProperty('opacity');
    }

    currentStage = stage;
    setStageVisibility(stage);

    if (stage === 0) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('base', true);
      gsap.set(introText, { opacity: 1, clearProps: 'filter' });
      resetPairToStart('ceramic');
      resetPairToStart('fog');
      setFinaleStart();
      return;
    }

    if (stage === 1) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('ceramic', true);
      setPairComplete('ceramic');
      resetPairToStart('fog');
      setFinaleStart();
      return;
    }

    if (stage === 2) {
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('fog', true);
      setPairComplete('fog');
      resetPairToStart('ceramic');
      setFinaleStart();
      return;
    }

    setLogoState('none', true);
    setFinaleComplete();
  };

  const animatePairIn = (type) => {
    const hanja = type === 'ceramic' ? ceramicHanja : fogHanja;
    const divider = type === 'ceramic' ? ceramicDivider : fogDivider;
    const desc = type === 'ceramic' ? ceramicDesc : fogDesc;
    const fromX = type === 'ceramic' ? 70 : -70;

    resetPairToStart(type);

    const tl = gsap.timeline();
    tl.set(divider, { opacity: 1 }, 0);
    tl.fromTo(
      hanja,
      { xPercent: fromX },
      { xPercent: 0, duration: 0.95, ease: 'power2.out' },
      0
    );
    tl.to(
      desc,
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      0.55
    );
    return tl;
  };

  const playForward = async (fromStage, toStage) => {
    if (toStage !== fromStage + 1) {
      showStageInstant(toStage);
      return;
    }

    // 로고만 → 첫 장면(인트로 문구)
    if (fromStage === ENTRY_STAGE && toStage === 0) {
      setStageVisibility(0);
      gsap.set(bgLight, { opacity: 1 });
      gsap.set(bgBrand, { opacity: 0 });
      gsap.set(logos, { opacity: 1 });
      setLogoState('base', true);
      resetPairToStart('ceramic');
      resetPairToStart('fog');
      setFinaleStart();

      if (introText) {
        introText.classList.remove('text-blur-out', 'text-focus-in');
        introText.style.removeProperty('filter');
        introText.style.opacity = '0';
        void introText.offsetWidth;
        introText.classList.add('text-focus-in');
        await waitForAnimation(introText, 'text-focus-in', 900);
        introText.classList.remove('text-focus-in');
        introText.style.removeProperty('filter');
        introText.style.opacity = '1';
      } else {
        gsap.set(stageEls[0], { opacity: 1 });
      }
      return;
    }

    if (fromStage === 0 && toStage === 1) {
      setStageVisibility(0);
      if (introText) {
        introText.classList.remove('text-focus-in');
        void introText.offsetWidth;
        introText.classList.add('text-blur-out');
        await waitForAnimation(introText, 'text-blur-out', 1300);
      }

      setStageVisibility(1);
      setLogoState('ceramic');
      resetPairToStart('ceramic');
      activeTween = animatePairIn('ceramic');
      await activeTween.then();
      return;
    }

    if (fromStage === 1 && toStage === 2) {
      const out = gsap.timeline();
      out.to(stageEls[1], { opacity: 0, duration: 0.35, ease: 'power1.in' });
      activeTween = out;
      await out.then();

      setStageVisibility(2);
      gsap.set(stageEls[2], { opacity: 1 });
      setLogoState('fog');
      resetPairToStart('fog');
      activeTween = animatePairIn('fog');
      await activeTween.then();
      return;
    }

    if (fromStage === 2 && toStage === 3) {
      stageEls.forEach((el, i) => {
        el.classList.toggle('is-active', i === 3);
      });
      clearFinaleTextAnimations();
      gsap.set(finaleItems, { opacity: 0, clearProps: 'y,transform' });
      gsap.set(stageEls[3], {
        opacity: 0,
        filter: 'blur(0px)',
        visibility: 'visible',
      });

      const tl = gsap.timeline();
      tl.to(stageEls[2], { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0);
      tl.set(stageEls[2], { visibility: 'hidden' });
      tl.to(logos, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0);
      tl.to(bgLight, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.1);
      tl.to(bgBrand, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.1);
      tl.to(stageEls[3], { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0.25);

      activeTween = tl;
      await tl.then();
      setLogoState('none', true);

      // 한 줄씩 등장 — 유무(finale-ko)만 focus-in-expand
      for (const item of finaleItems) {
        if (item === finaleBrand && finaleKo) {
          item.classList.remove('text-blur-out', 'text-focus-in', 'focus-in-expand');
          item.style.removeProperty('filter');
          item.style.opacity = '1';

          const brandTasks = [playFocusInExpand(finaleKo)];
          if (finaleHanja) {
            brandTasks.push(playTextFocusIn(finaleHanja));
          }
          await Promise.all(brandTasks);

          finaleKo.classList.remove('focus-in-expand');
          finaleKo.style.removeProperty('filter');
          finaleKo.style.removeProperty('letter-spacing');
          finaleKo.style.opacity = '1';

          if (finaleHanja) {
            finaleHanja.classList.remove('text-focus-in');
            finaleHanja.style.removeProperty('filter');
            finaleHanja.style.opacity = '1';
          }
          continue;
        }

        await playTextFocusIn(item);
        item.classList.remove('text-focus-in');
        item.style.removeProperty('filter');
        item.style.opacity = '1';
      }
    }
  };

  const getHoldScroll = () => {
    if (!scrollTrigger) return window.scrollY;
    const range = scrollTrigger.end - scrollTrigger.start;
    return scrollTrigger.start + range * 0.5;
  };

  const snapToHold = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(getHoldScroll());
  };

  const scrollPastSection = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(scrollTrigger.end + 1);
  };

  const scrollBeforeSection = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(scrollTrigger.start - 1);
  };

  const goToStage = async (nextStage) => {
    if (
      nextStage < ENTRY_STAGE ||
      nextStage > LAST_STAGE ||
      nextStage === currentStage
    ) {
      return;
    }
    if (isAnimating) return;

    isAnimating = true;
    clearStageDwellTimer();
    const from = currentStage;
    const isForward = nextStage > from;

    try {
      if (!isForward) {
        showStageInstant(nextStage);
        if (nextStage < LAST_STAGE) {
          hasCompletedExitHold = false;
          hasPlayedFinaleOut = false;
          clearExitHoldTimer();
        }
      } else {
        await playForward(from, nextStage);
        currentStage = nextStage;
      }
    } finally {
      if (isForward && currentStage === LAST_STAGE && from < LAST_STAGE) {
        // 마지막 장면 등장 완료 후 0.8초 유지 (기존 exit hold)
        hasPlayedFinaleOut = false;
        startExitHold();
      } else if (isForward && STAGE_DWELL_MS[currentStage] != null) {
        // 장면 완성 후 짧은 머무름
        startStageDwell(currentStage);
      } else {
        finishAnimating();
      }
    }
  };

  /**
   * @returns {'step' | 'exit-down' | 'exit-up' | 'blocked' | 'none'}
   */
  const handleStep = (direction) => {
    if (!isSectionActive) return 'none';
    if (
      isAnimating ||
      awaitingGestureEnd ||
      isEntryHolding ||
      isExitHolding ||
      isStageDwelling
    ) {
      return 'blocked';
    }

    if (direction > 0) {
      if (currentStage < LAST_STAGE) {
        beginGesture();
        goToStage(currentStage + 1);
        return 'step';
      }

      // 마지막 장면: 0.8초 유지 완료 전에는 이탈 불가
      if (!hasCompletedExitHold) return 'blocked';

      // 유지 후 첫 아래 스크롤: 텍스트 blur-out (섹션 이탈은 그 다음)
      if (!hasPlayedFinaleOut) {
        beginGesture();
        playFinaleBlurOut();
        return 'step';
      }

      canExitDown = true;
      isSectionActive = false;
      beginGesture();
      return 'exit-down';
    }

    if (direction < 0) {
      if (currentStage > 0) {
        beginGesture();
        goToStage(currentStage - 1);
        return 'step';
      }

      // ENTRY_STAGE 또는 stage 0에서 위로 → 섹션 이탈
      isSectionActive = false;
      absorbInertia = true;
      beginGesture();
      return 'exit-up';
    }

    return 'none';
  };

  const shouldCaptureScroll = () => {
    if (!scrollTrigger || !isReady) return false;
    if (absorbInertia || isSectionActive) return true;
    if (canExitDown) return false;
    return scrollTrigger.isActive;
  };

  const applyResult = (result) => {
    if (result === 'step' || result === 'blocked') {
      snapToHold();
      return;
    }
    if (result === 'exit-up') {
      scrollBeforeSection();
      return;
    }
    if (result === 'exit-down') {
      scrollPastSection();
    }
  };

  const activateSection = (stage = 0) => {
    isSectionActive = true;
    canExitDown = false;
    absorbInertia = false;
    clearStageDwellTimer();
    snapToHold();

    // 페이지 최초 진입: 로고만 + 0.8초 잠금
    if (!hasCompletedEntryHold && stage <= 0) {
      clearExitHoldTimer();
      hasCompletedExitHold = false;
      hasPlayedFinaleOut = false;
      showLogoOnly();
      startEntryHold();
      return;
    }

    // 아래에서 재진입(마지막 장면): 완료 화면 + 이탈 전 0.8초 유지
    if (stage === LAST_STAGE) {
      clearExitHoldTimer();
      hasCompletedExitHold = false;
      hasPlayedFinaleOut = false;
      showStageInstant(LAST_STAGE);
      startExitHold();
      return;
    }

    showStageInstant(stage);
  };

  const onWheel = (event) => {
    if (event.ctrlKey) return;
    if (!shouldCaptureScroll()) return;

    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      event.preventDefault();
      activateSection(currentStage > 0 && scrollTrigger.direction === -1 ? currentStage : 0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (
      isAnimating ||
      awaitingGestureEnd ||
      isEntryHolding ||
      isExitHolding ||
      isStageDwelling
    ) {
      event.preventDefault();
      snapToHold();
      pingGestureActivity();
      return;
    }

    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) {
      event.preventDefault();
      snapToHold();
      return;
    }

    const direction = Math.sign(event.deltaY);
    const result = handleStep(direction);
    if (result === 'none') return;
    event.preventDefault();
    applyResult(result);
  };

  const onTouchStart = (event) => {
    if (!event.touches.length) return;
    touchStartY = event.touches[0].clientY;
    touchGestureConsumed = false;
  };

  const onTouchMove = (event) => {
    if (!event.touches.length) return;
    if (!shouldCaptureScroll()) return;

    event.preventDefault();

    if (absorbInertia) {
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      activateSection(0);
      beginGesture();
      touchGestureConsumed = true;
      return;
    }

    if (!isSectionActive) return;

    if (
      isAnimating ||
      awaitingGestureEnd ||
      touchGestureConsumed ||
      isEntryHolding ||
      isExitHolding ||
      isStageDwelling
    ) {
      snapToHold();
      pingGestureActivity();
      return;
    }

    const deltaY = touchStartY - event.touches[0].clientY;
    if (Math.abs(deltaY) < TOUCH_THRESHOLD) {
      snapToHold();
      return;
    }

    touchGestureConsumed = true;
    applyResult(handleStep(Math.sign(deltaY)));
  };

  const onTouchEnd = () => {
    pingGestureActivity();
  };

  const onKeyDown = (event) => {
    if (!shouldCaptureScroll()) return;

    let direction = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      direction = 1;
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      direction = -1;
    } else {
      return;
    }

    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger?.isActive && !canExitDown) {
      event.preventDefault();
      activateSection(0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (
      isAnimating ||
      awaitingGestureEnd ||
      isEntryHolding ||
      isExitHolding ||
      isStageDwelling
    ) {
      event.preventDefault();
      snapToHold();
      return;
    }

    const result = handleStep(direction);
    if (result === 'none') return;
    event.preventDefault();
    applyResult(result);
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  scrollTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=120%',
    pin: true,
    anticipatePin: 1,
    fastScrollEnd: true,
    onEnter() {
      if (!canExitDown) {
        activateSection(0);
        beginGesture();
      }
    },
    onEnterBack() {
      canExitDown = false;
      activateSection(LAST_STAGE);
      beginGesture();
    },
    onLeave(self) {
      if (!canExitDown && self.direction === 1) {
        self.scroll(getHoldScroll());
        if (!isSectionActive) {
          activateSection(currentStage);
          beginGesture();
        }
      }
    },
    onLeaveBack() {
      isSectionActive = false;
      absorbInertia = false;
      // 최초 0.8초 유지 중 이탈 시: 다음에 다시 진입하면 hold 재시도
      if (isEntryHolding) {
        clearEntryHoldTimer();
        isAnimating = false;
      }
      clearExitHoldTimer();
      clearStageDwellTimer();
      hasCompletedExitHold = false;
      hasPlayedFinaleOut = false;
    },
    onUpdate(self) {
      if (isSectionActive && !canExitDown) {
        const hold = getHoldScroll();
        if (Math.abs(self.scroll() - hold) > 1) {
          self.scroll(hold);
        }
        return;
      }
      if (absorbInertia) {
        const target = self.start - 1;
        if (Math.abs(self.scroll() - target) > 1 && self.scroll() > self.start - 2) {
          /* 이탈 직후 위치는 exit-up에서 처리 */
        }
      }
    },
  });

  // 초기 상태: 로고만 (스크롤 진입 전)
  showLogoOnly();

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    requestAnimationFrame(() => {
      isReady = true;
    });
  });
});
