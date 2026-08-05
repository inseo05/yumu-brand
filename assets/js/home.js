/**
 * YUMU - Home page JavaScript
 * Hero → Intro 영상 전환(ScrollTrigger scrub)
 * + Intro 텍스트 단계 전환(휠·트랙패드·터치 제스처)
 */

window.addEventListener('load', () => {
  gsap.registerPlugin(ScrollTrigger);

  const wrapper = document.querySelector('.home-scroll');
  const heroPanel = document.querySelector('.home-scroll__panel--hero');
  const introPanel = document.querySelector('.home-scroll__panel--intro');
  const introVideo = introPanel
    ? introPanel.querySelector('.home-scroll__video')
    : null;
  const heroText = document.querySelector('.home-scroll__text');
  const introCopy = document.querySelector('.home-scroll__intro-copy');
  const introLines = introCopy
    ? Array.from(introCopy.querySelectorAll('.home-scroll__intro-line'))
    : [];

  if (!wrapper || !heroPanel || !introPanel) return;

  gsap.set(heroPanel, {
    transformOrigin: '50% 50%',
    force3D: true,
  });

  gsap.set(introPanel, {
    scale: 1.1,
    transformOrigin: '50% 50%',
    force3D: true,
  });

  if (introVideo) {
    introVideo.pause();
    introVideo.currentTime = 0;
    gsap.set(introVideo, {
      opacity: 0,
      filter: 'blur(16px)',
    });
  }

  /*
   * pin 전체 200% = 영상 전환 100% + Intro 홀드 100%
   * 타임라인 duration 2 기준 → VIDEO_END(0.5)부터 두 번째 화면 고정
   */
  const VIDEO_END = 0.5;
  const START_EPSILON = 0.025;
  const WHEEL_THRESHOLD = 4;
  const TOUCH_THRESHOLD = 40;
  const GESTURE_IDLE_MS = 220;

  let isReady = false;
  let hasUserScrolled = false;
  /** @type {'visible' | 'hidden'} */
  let textState = 'visible';

  /* Intro 텍스트 단계 상태 */
  let currentIndex = 0;
  let isAnimating = false;
  let isSectionActive = false;
  let canExitDown = false;
  let awaitingGestureEnd = false;
  /** 인트로 이탈 직후 관성으로 Hero 끝까지 날아가지 않도록 흡수 */
  let absorbInertia = false;
  let gestureIdleTimer = null;
  let introCopyVisible = false;
  let touchStartY = 0;
  let touchGestureConsumed = false;
  /** Intro 진입 초기 연출 — 페이지당 1회 */
  let hasPlayedIntroEntrance = false;
  let introEntrancePlaying = false;
  /** @type {gsap.core.Timeline | null} */
  let introEntranceTimeline = null;

  /** @type {ScrollTrigger | null} */
  let scrollTrigger = null;

  const clearTextAnimationClasses = () => {
    if (!heroText) return;
    heroText.classList.remove('text-blur-out', 'text-focus-in');
  };

  const clearTextInlineState = () => {
    if (!heroText) return;
    heroText.style.removeProperty('filter');
    heroText.style.removeProperty('opacity');
  };

  const swapTextAnimation = (nextClass) => {
    if (!heroText) return;
    clearTextInlineState();
    clearTextAnimationClasses();
    void heroText.offsetWidth;
    heroText.classList.add(nextClass);
  };

  const isHeroStart = (progress) =>
    progress <= START_EPSILON || window.scrollY <= 1;

  const markUserScrolled = () => {
    hasUserScrolled = true;
  };

  window.addEventListener('wheel', markUserScrolled, { passive: true });
  window.addEventListener('touchmove', markUserScrolled, { passive: true });
  window.addEventListener('keydown', (event) => {
    const scrollKeys = [
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Home',
      'End',
      ' ',
      'Spacebar',
    ];
    if (scrollKeys.includes(event.key)) {
      markUserScrolled();
    }
  });

  if (heroText) {
    clearTextAnimationClasses();
    clearTextInlineState();
    textState = 'visible';
  }

  const clearIntroLineAnimations = (line) => {
    line.classList.remove('text-blur-out', 'text-focus-in');
  };

  const setIntroCopyVisible = (visible) => {
    if (!introCopy || introCopyVisible === visible) return;
    introCopyVisible = visible;
    introCopy.classList.toggle('is-visible', visible);
  };

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

  const showIntroIndexInstant = (index) => {
    if (introLines.length !== 3) return;
    currentIndex = index;
    introLines.forEach((line, lineIndex) => {
      clearIntroLineAnimations(line);
      line.classList.toggle('is-active', lineIndex === index);
    });
  };

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
    pingGestureActivity();
  };

  const getScrollForProgress = (progress) => {
    if (!scrollTrigger) return window.scrollY;
    const range = scrollTrigger.end - scrollTrigger.start;
    return scrollTrigger.start + range * progress;
  };

  /* 홀드 구간 안쪽(핀 끝이 아님)에 고정 → 다음 섹션으로 밀리는 현상 방지 */
  const getIntroHoldScroll = () => getScrollForProgress(VIDEO_END + 0.04);

  const snapToIntroScroll = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(getIntroHoldScroll());
  };

  /* Intro → Hero 되돌리기 직전 지점 (두 번째 영상 화면이 유지되는 위치) */
  const getHeroReentryScroll = () => getScrollForProgress(VIDEO_END - 0.03);

  const scrollIntoHeroZone = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(getHeroReentryScroll());
  };

  const scrollPastIntro = () => {
    if (!scrollTrigger) return;
    scrollTrigger.scroll(scrollTrigger.end + 1);
  };

  const lockToIntroHold = (self) => {
    const hold = getIntroHoldScroll();
    const current = self ? self.scroll() : scrollTrigger?.scroll();
    if (current == null) return;
    if (Math.abs(current - hold) > 1) {
      if (self) self.scroll(hold);
      else scrollTrigger.scroll(hold);
    }
  };

  const lockToHeroReentry = (self) => {
    const target = getHeroReentryScroll();
    const current = self ? self.scroll() : scrollTrigger?.scroll();
    if (current == null) return;
    if (Math.abs(current - target) > 1) {
      if (self) self.scroll(target);
      else scrollTrigger.scroll(target);
    }
  };

  const stepToIntroIndex = async (nextIndex) => {
    if (
      introLines.length !== 3 ||
      isAnimating ||
      nextIndex === currentIndex ||
      nextIndex < 0 ||
      nextIndex > introLines.length - 1
    ) {
      return;
    }

    isAnimating = true;

    const fromLine = introLines[currentIndex];
    const toLine = introLines[nextIndex];

    clearIntroLineAnimations(fromLine);
    clearIntroLineAnimations(toLine);
    void fromLine.offsetWidth;

    fromLine.classList.add('text-blur-out');
    await waitForAnimation(fromLine, 'text-blur-out', 1300);
    fromLine.classList.remove('is-active', 'text-blur-out');

    toLine.classList.add('is-active');
    void toLine.offsetWidth;
    toLine.classList.add('text-focus-in');
    await waitForAnimation(toLine, 'text-focus-in', 1100);
    toLine.classList.remove('text-focus-in');

    currentIndex = nextIndex;
    finishAnimating();
  };

  const playIntroVideo = () => {
    if (!introVideo) return;
    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  const ensureIntroVideoComplete = () => {
    if (!introVideo) return;
    gsap.set(introVideo, {
      opacity: 1,
      filter: 'blur(0px)',
    });
    playIntroVideo();
  };

  /**
   * Hero → Intro 첫 진입 연출
   * 0s #131313 유지 → 1s 첫 문장(text-focus-in) → 2.2s 영상 재생·선명화(4s)
   */
  const playIntroEntrance = () => {
    if (
      hasPlayedIntroEntrance ||
      introEntrancePlaying ||
      introLines.length !== 3
    ) {
      return;
    }

    const firstText = introLines[0];

    introEntrancePlaying = true;
    isAnimating = true;
    currentIndex = 0;

    introLines.forEach((line) => {
      clearIntroLineAnimations(line);
      line.classList.remove('is-active');
    });

    if (introVideo) {
      introVideo.pause();
      introVideo.currentTime = 0;
      gsap.set(introVideo, {
        opacity: 0,
        filter: 'blur(16px)',
      });
    }

    if (introEntranceTimeline) {
      introEntranceTimeline.kill();
    }

    introEntranceTimeline = gsap.timeline({
      onStart: () => {
        if (!introVideo) return;
        introVideo.pause();
        introVideo.currentTime = 0;
      },
      onComplete: () => {
        introEntrancePlaying = false;
      },
    });

    // 첫 문장: 스크롤 단계 전환과 동일한 text-focus-in (0.8s)
    // 문장 등장 완료 시 스크롤 잠금 해제 (영상 4s와 분리)
    introEntranceTimeline
      .to({}, { duration: 1 })
      .call(() => {
        clearIntroLineAnimations(firstText);
        firstText.classList.add('is-active');
        void firstText.offsetWidth;
        firstText.classList.add('text-focus-in');
      })
      .to({}, { duration: 0.8 })
      .call(() => {
        firstText.classList.remove('text-focus-in');
        hasPlayedIntroEntrance = true;
        finishAnimating();
      });

    if (introVideo) {
      introEntranceTimeline
        .call(
          () => {
            playIntroVideo();
          },
          null,
          2.2
        )
        .fromTo(
          introVideo,
          {
            opacity: 0,
            filter: 'blur(16px)',
          },
          {
            opacity: 1,
            filter: 'blur(0px)',
            duration: 4,
            ease: 'power2.out',
          },
          2.2
        );
    }
  };

  const activateIntroSection = (index = 0) => {
    isSectionActive = true;
    canExitDown = false;
    absorbInertia = false;
    snapToIntroScroll();

    // 첫 진입 초기 연출 (한 번만, 첫 문장 진입 시에만)
    if (!hasPlayedIntroEntrance) {
      if (index !== 0) {
        hasPlayedIntroEntrance = true;
        ensureIntroVideoComplete();
        setIntroCopyVisible(true);
        showIntroIndexInstant(index);
        return;
      }

      if (!introEntrancePlaying) {
        playIntroEntrance();
      }
      setIntroCopyVisible(true);
      return;
    }

    ensureIntroVideoComplete();
    setIntroCopyVisible(true);
    showIntroIndexInstant(index);
  };

  const deactivateIntroSection = ({ hideCopy = true, resetIndex = true } = {}) => {
    isSectionActive = false;
    if (hideCopy) setIntroCopyVisible(false);
    if (resetIndex) {
      if (hasPlayedIntroEntrance) {
        showIntroIndexInstant(0);
      } else {
        currentIndex = 0;
        introLines.forEach((line) => {
          clearIntroLineAnimations(line);
          line.classList.remove('is-active');
        });
      }
    }
  };

  /**
   * @returns {'step' | 'exit-down' | 'exit-up' | 'blocked' | 'none'}
   */
  const handleIntroStep = (direction) => {
    if (!isSectionActive) return 'none';
    if (isAnimating || awaitingGestureEnd) return 'blocked';

    if (direction > 0) {
      if (currentIndex < introLines.length - 1) {
        beginGesture();
        stepToIntroIndex(currentIndex + 1);
        return 'step';
      }

      canExitDown = true;
      isSectionActive = false;
      beginGesture();
      return 'exit-down';
    }

    if (direction < 0) {
      if (currentIndex > 0) {
        beginGesture();
        stepToIntroIndex(currentIndex - 1);
        return 'step';
      }

      // 첫 문장에서 위로 → 영상 되돌리기 직전으로만 이동 (첫 화면으로 점프 방지)
      deactivateIntroSection({ hideCopy: true, resetIndex: true });
      absorbInertia = true;
      beginGesture();
      return 'exit-up';
    }

    return 'none';
  };

  const shouldCaptureScroll = () => {
    if (!scrollTrigger || !isReady) return false;
    if (absorbInertia) return true;
    if (isSectionActive) return true;
    if (canExitDown) return false;
    return scrollTrigger.progress >= VIDEO_END;
  };

  const applyIntroGestureResult = (result) => {
    if (result === 'step' || result === 'blocked') {
      snapToIntroScroll();
      return true;
    }
    if (result === 'exit-up') {
      scrollIntoHeroZone();
      return true;
    }
    if (result === 'exit-down') {
      scrollPastIntro();
      return true;
    }
    return false;
  };

  const onWheel = (event) => {
    if (event.ctrlKey) return;
    if (!shouldCaptureScroll()) return;

    markUserScrolled();

    // Intro 이탈 직후 관성 흡수 (위로 튕겨 첫 화면까지 가는 것 방지)
    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger.progress >= VIDEO_END && !canExitDown) {
      event.preventDefault();
      activateIntroSection(0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd) {
      event.preventDefault();
      snapToIntroScroll();
      pingGestureActivity();
      return;
    }

    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) {
      event.preventDefault();
      snapToIntroScroll();
      return;
    }

    const direction = Math.sign(event.deltaY);
    const result = handleIntroStep(direction);
    if (result === 'none') return;

    event.preventDefault();
    applyIntroGestureResult(result);
  };

  const onTouchStart = (event) => {
    if (!event.touches.length) return;
    touchStartY = event.touches[0].clientY;
    touchGestureConsumed = false;
  };

  const onTouchMove = (event) => {
    if (!event.touches.length) return;
    if (!shouldCaptureScroll()) return;

    markUserScrolled();
    event.preventDefault();

    if (absorbInertia) {
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger.progress >= VIDEO_END && !canExitDown) {
      activateIntroSection(0);
      beginGesture();
      touchGestureConsumed = true;
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd || touchGestureConsumed) {
      snapToIntroScroll();
      pingGestureActivity();
      return;
    }

    const deltaY = touchStartY - event.touches[0].clientY;
    if (Math.abs(deltaY) < TOUCH_THRESHOLD) {
      snapToIntroScroll();
      return;
    }

    touchGestureConsumed = true;
    const direction = Math.sign(deltaY);
    const result = handleIntroStep(direction);
    applyIntroGestureResult(result);
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

    markUserScrolled();

    if (absorbInertia) {
      event.preventDefault();
      pingGestureActivity();
      return;
    }

    if (!isSectionActive && scrollTrigger.progress >= VIDEO_END && !canExitDown) {
      event.preventDefault();
      activateIntroSection(0);
      beginGesture();
      return;
    }

    if (!isSectionActive) return;

    if (isAnimating || awaitingGestureEnd) {
      event.preventDefault();
      snapToIntroScroll();
      return;
    }

    const result = handleIntroStep(direction);
    if (result === 'none') return;

    event.preventDefault();
    applyIntroGestureResult(result);
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      // 영상 100% + Intro 홀드 100%
      end: '+=200%',
      pin: true,
      scrub: true,
      anticipatePin: 1,
      fastScrollEnd: true,
      onUpdate(self) {
        if (heroText && isReady && hasUserScrolled) {
          if (isHeroStart(self.progress)) {
            if (textState === 'hidden') {
              swapTextAnimation('text-focus-in');
              textState = 'visible';
            } else if (heroText.classList.contains('text-blur-out')) {
              clearTextAnimationClasses();
              clearTextInlineState();
            }
          } else if (
            textState === 'visible' &&
            self.direction === 1 &&
            self.progress > START_EPSILON
          ) {
            swapTextAnimation('text-blur-out');
            textState = 'hidden';
          }
        }

        // Intro 활성 중에는 홀드 위치에 고정 (위로 관성으로 Hero까지 통과하는 것 방지)
        if (isSectionActive && !canExitDown) {
          lockToIntroHold(self);
          return;
        }

        // Intro → Hero 이탈 직후 관성 흡수 구간
        if (absorbInertia) {
          lockToHeroReentry(self);
          return;
        }

        if (self.progress >= VIDEO_END) {
          if (!canExitDown && !awaitingGestureEnd) {
            activateIntroSection(0);
            beginGesture();
          }
        } else if (self.progress < VIDEO_END - 0.02) {
          if (introCopyVisible) {
            setIntroCopyVisible(false);
            showIntroIndexInstant(0);
          }
          canExitDown = false;
        }
      },
      onLeave(self) {
        if (self.direction === 1 && !canExitDown) {
          self.scroll(getIntroHoldScroll());
          if (!isSectionActive) {
            activateIntroSection(currentIndex);
            beginGesture();
          }
        }
      },
      onEnterBack(self) {
        // Material 등에서 위로 복귀 시: 즉시 Intro에 붙잡고 마지막 문장부터 역순
        canExitDown = false;
        absorbInertia = false;
        self.scroll(getIntroHoldScroll());
        activateIntroSection(introLines.length ? introLines.length - 1 : 0);
        beginGesture();
      },
      onLeaveBack() {
        absorbInertia = false;
      },
    },
  });

  // duration 1: 영상 전환 / duration 1: Intro 홀드(고정 유지용)
  timeline
    .to(
      heroPanel,
      {
        scale: 1.2,
        z: 150,
        autoAlpha: 0,
        ease: 'none',
        duration: 1,
      },
      0
    )
    .to(
      introPanel,
      {
        scale: 1,
        ease: 'none',
        duration: 1,
      },
      0
    )
    .to({}, { duration: 1 });

  scrollTrigger = timeline.scrollTrigger;

  const syncInitialTextState = () => {
    if (!heroText || !scrollTrigger) return;

    clearTextAnimationClasses();
    clearTextInlineState();

    if (isHeroStart(scrollTrigger.progress)) {
      textState = 'visible';
      return;
    }

    textState = 'hidden';
    heroText.style.filter = 'blur(12px)';
    heroText.style.opacity = '0';
  };

  const syncInitialIntroState = () => {
    if (!scrollTrigger || introLines.length !== 3) return;

    if (scrollTrigger.progress >= VIDEO_END) {
      activateIntroSection(0);
    } else {
      deactivateIntroSection({ hideCopy: true, resetIndex: true });
    }
  };

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    syncInitialTextState();
    syncInitialIntroState();
    requestAnimationFrame(() => {
      isReady = true;
    });
  });

  /* Material 섹션 진입 전환 (Ease in / 1000ms) */
  const materialSection = document.querySelector('.material');

  if (materialSection) {
    gsap.from(materialSection, {
      autoAlpha: 0,
      y: 48,
      duration: 1,
      ease: 'power1.in',
      scrollTrigger: {
        trigger: materialSection,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  }
});
