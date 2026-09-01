/**
 * YUMU - Common JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.header__link');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('header__link--active');
    }
  });

  initMobileSideMenu(currentPath);
  initHeaderScrollHide();
});

/**
 * 모바일 사이드 메뉴 (768px 이하)
 */
function initMobileSideMenu(currentPath) {
  const header = document.querySelector('.header');
  const menuButton = header && header.querySelector('.header__menu-button');
  if (!header || !menuButton) return;

  const MOBILE_NAV_HTML = `
    <div class="mobile-nav" id="mobile-nav" aria-hidden="true">
      <div class="mobile-nav__overlay" data-mobile-nav-close tabindex="-1"></div>
      <aside class="mobile-nav__panel" role="dialog" aria-modal="true" aria-label="메뉴">
        <button type="button" class="mobile-nav__close" data-mobile-nav-close aria-label="메뉴 닫기">
          <img class="mobile-nav__close-icon" src="./assets/images/header/close.svg" alt="메뉴 닫기" width="26" height="26" loading="lazy">
        </button>
        <nav class="mobile-nav__nav" aria-label="모바일 메뉴">
          <a class="mobile-nav__link" href="about.html">about</a>
          <a class="mobile-nav__link" href="collection.html">collection</a>
          <a class="mobile-nav__link" href="products.html">products</a>
          <a class="mobile-nav__link" href="contact.html">contact</a>
        </nav>
      </aside>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', MOBILE_NAV_HTML);

  const mobileNav = document.getElementById('mobile-nav');
  if (!mobileNav) return;

  const mobileLinks = mobileNav.querySelectorAll('.mobile-nav__link');
  mobileLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.setAttribute('aria-current', 'page');
    }
  });

  const openMenu = () => {
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-menu-open');
    header.classList.add('is-menu-open');
    header.classList.remove('header--hidden');
  };

  const closeMenu = () => {
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-menu-open');
    header.classList.remove('is-menu-open');
  };

  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'mobile-nav');

  menuButton.addEventListener('click', () => {
    if (mobileNav.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mobileNav.querySelectorAll('[data-mobile-nav-close]').forEach((el) => {
    el.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileNav.classList.contains('is-open')) {
      closeMenu();
    }
  });
}

/**
 * 스크롤 방향에 따라 헤더 숨김·등장
 * Home에서는 첫 Hero(.home-scroll) 기준으로 헤더 디자인 전환
 */
function initHeaderScrollHide() {
  const header = document.querySelector('.header');
  if (!header) return;

  const menuButton = header.querySelector('.header__menu-button');
  const logoImage = header.querySelector('.header__logo-image');
  const menuIcon = header.querySelector('.header__menu-icon');
  const homeScroll = document.querySelector('.home-scroll');
  const isHomePage =
    header.classList.contains('header--home') ||
    document.body.classList.contains('page-home');

  const SCROLL_DELTA = 8;
  const TOP_THRESHOLD = 10;

  const LOGO_HOME = 'assets/images/header/logo-home.png';
  const LOGO_OTHER = 'assets/images/header/logo-other.png';
  const MENU_HOME = './assets/images/header/menu-mobile-white.png';
  const MENU_OTHER = './assets/images/header/menu-mobile-black.png';

  let lastScrollY = window.scrollY;
  let ticking = false;
  let isHomeDesign = isHomePage;

  const isMobileMenuOpen = () => {
    if (header.classList.contains('is-menu-open') || header.classList.contains('header--menu-open')) {
      return true;
    }
    if (document.body.classList.contains('is-menu-open')) {
      return true;
    }
    if (menuButton && menuButton.getAttribute('aria-expanded') === 'true') {
      return true;
    }
    return false;
  };

  const showHeader = () => {
    header.classList.remove('header--hidden');
  };

  const hideHeader = () => {
    header.classList.add('header--hidden');
  };

  /** 첫 Hero 영역이 아직 화면 상단을 차지하는지 */
  const isInHomeHero = () => {
    if (!homeScroll) return false;
    const rect = homeScroll.getBoundingClientRect();
    return rect.bottom > 0;
  };

  const applyHomeHeaderDesign = () => {
    if (!isHomePage || isHomeDesign) return;
    header.classList.add('header--home');
    if (logoImage) logoImage.src = LOGO_HOME;
    if (menuIcon) menuIcon.src = MENU_HOME;
    isHomeDesign = true;
  };

  const applySubpageHeaderDesign = () => {
    if (!isHomePage || !isHomeDesign) return;
    header.classList.remove('header--home');
    if (logoImage) logoImage.src = LOGO_OTHER;
    if (menuIcon) menuIcon.src = MENU_OTHER;
    isHomeDesign = false;
  };

  const updateHomeHeaderDesign = () => {
    if (!isHomePage) return;

    if (window.scrollY <= TOP_THRESHOLD || isInHomeHero()) {
      applyHomeHeaderDesign();
    } else {
      applySubpageHeaderDesign();
    }
  };

  const updateHeaderVisibility = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    updateHomeHeaderDesign();

    if (isMobileMenuOpen() || currentScrollY <= TOP_THRESHOLD) {
      showHeader();
      lastScrollY = currentScrollY;
      ticking = false;
      return;
    }

    if (Math.abs(delta) < SCROLL_DELTA) {
      ticking = false;
      return;
    }

    if (delta > 0) {
      hideHeader();
    } else {
      showHeader();
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeaderVisibility);
    },
    { passive: true }
  );

  if (menuButton) {
    menuButton.addEventListener('click', () => {
      window.requestAnimationFrame(() => {
        updateHomeHeaderDesign();
        if (isMobileMenuOpen() || window.scrollY <= TOP_THRESHOLD) {
          showHeader();
        }
      });
    });
  }

  // 초기 상태
  updateHomeHeaderDesign();
  if (window.scrollY <= TOP_THRESHOLD) {
    showHeader();
  }
}
